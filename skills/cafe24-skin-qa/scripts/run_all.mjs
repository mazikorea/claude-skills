#!/usr/bin/env node
// 통합 실행기: 브랜드 설정(brands/<brand>.json)대로 단계 2~10을 한 줄로 실행하고 기준선 대비·기존 문제 구분까지 정리. 읽기 전용 GET만.
// 사용: node run_all.mjs --brand cosset|mazi --mode quick|full|baseline
//        [--origin <URL>]            대상 origin 바꾸기(복제 스킨 미리보기 주소). 기본은 설정 파일의 운영 주소
//        [--pages home,list]         설정의 page key 일부만
//        [--base-dir <원본 스킨 폴더> --target-dir <수정 스킨 폴더>]   단계 2 정적 diff(있으면 실행)
//        [--delay ms] [--out dir] [--runs N] [--stages 6,7]   일부 단계만 재실행(baseline 모드에선 해당 단계 기록만 교체)
// 모드: quick = 단계 2(폴더 줄 때)·3·4 / full = 2~10 + 종합 리포트 / baseline = 현재 상태를 baselines/<brand>/ 에 저장(수정 전 기준선) + existing-issues.json
// 종료코드: 0 = 신규 FAIL 없음(기존 문제는 따로 표시), 1 = 신규 FAIL 있음, 2 = 사용법 오류
// 기준선·브랜드 설정은 공개 저장소에 올리지 않음(.gitignore). 로그인·쓰기·결제·장바구니 담기 없음, 요청 사이 --delay(기본 2.5초) 대기.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs, here } from './lib.mjs';

const { opt } = parseArgs();
const root = path.join(here, '..');
const brand = opt.brand && opt.brand !== true ? String(opt.brand) : null;
const mode = String(opt.mode || 'quick');
if (!brand || !['quick', 'full', 'baseline'].includes(mode)) { console.error('usage: run_all.mjs --brand <이름> --mode quick|full|baseline [--origin URL] [--pages a,b] [--base-dir d --target-dir d] [--delay ms]'); process.exit(2); }
const cfgPath = path.join(root, 'brands', brand + '.json');
if (!fs.existsSync(cfgPath)) { console.error('브랜드 설정 없음: ' + cfgPath + ' (brands/brand.example.json 복사)'); process.exit(2); }
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const origin = String(opt.origin && opt.origin !== true ? opt.origin : cfg.origin).replace(/\/$/, '');
const baseOrigin = String(cfg.origin).replace(/\/$/, '');
const delay = Number(opt.delay || cfg.delayMs || 2500);
const only = opt.pages && opt.pages !== true ? new Set(String(opt.pages).split(',')) : null;
const pages = cfg.pages.filter((p) => !only || only.has(p.key));
const vps = cfg.viewports || ['pc', 'mobile'];
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const runDir = path.resolve(String(opt.out && opt.out !== true ? opt.out : path.join(root, 'out', `run-${brand}-${mode}-${stamp}`)));
const bdir = path.join(root, 'baselines', brand);
fs.mkdirSync(runDir, { recursive: true });
const perfRuns = String(opt.runs || cfg.perf?.runs || 3);
const slug120 = (u) => u.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 120); // render_check 규칙
const slug100 = (u) => u.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 100); // lib.slug 규칙
const redact = (u) => String(u).replace(/\?.*$/, '?…');
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const urlOf = (p, o = origin) => o + p.path;
const stagesOf = (p) => new Set((p.stages || [3, 4]).map(String));

const modeStages = (mode === 'quick' ? [3, 4] : [3, 4, '4b', '4c', 5, 6, 7, 8, 9, 10]).map(String);
const stagesOpt = opt.stages && opt.stages !== true ? String(opt.stages).split(',') : null; // 일부 단계만 다시 실행
const wantStages = new Set(modeStages.filter((x) => !stagesOpt || stagesOpt.includes(x)));
const doStage2 = !!(opt['base-dir'] && opt['target-dir'] && mode !== 'baseline' && (!stagesOpt || stagesOpt.includes('2')));
const log = [];
function run(step, label, args, outSub) {
  const out = path.join(runDir, `step${step}`, outSub);
  fs.mkdirSync(out, { recursive: true });
  sleep(delay);
  const r = spawnSync('node', [path.join(here, args[0]), ...args.slice(1), '--out', out], { encoding: 'utf8', timeout: 600000, env: process.env });
  fs.writeFileSync(path.join(out, 'stdout.txt'), (r.stdout || '') + (r.stderr || ''));
  let sum = null;
  try { sum = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf8')); } catch { /* 요약 없음 */ }
  const verdict = sum?.verdict || (r.status === 2 ? 'ERROR' : r.status === 0 ? 'PASS' : 'FAIL');
  console.log(`  단계${step} ${label.padEnd(26)} ${verdict}`);
  log.push({ step, label, verdict, out });
  return { out, sum, status: r.status };
}

// ---- 기준선 파일 → 현재 대상 주소용 임시 파일 변환 (origin이 달라도 비교되도록)
const tmp = path.join(runDir, '_baseline_tmp'); fs.mkdirSync(tmp, { recursive: true });
function baselineRender(page, vp) {
  const src = path.join(bdir, 'render', `${page.key}__${vp}.json`);
  if (!fs.existsSync(src)) return null;
  const d = path.join(tmp, 'render', `${page.key}__${vp}`); fs.mkdirSync(d, { recursive: true });
  fs.copyFileSync(src, path.join(d, `${slug120(urlOf(page))}__${vp}.json`));
  return d;
}
function baselinePerf(page) {
  const src = path.join(bdir, 'perf', `${page.key}.json`);
  if (!fs.existsSync(src)) return null;
  const j = JSON.parse(fs.readFileSync(src, 'utf8')); const v = Object.values(j)[0]; if (!v) return null;
  const preset = cfg.perf?.preset || 'mobile'; const dst = path.join(tmp, `perf-${page.key}.json`);
  fs.writeFileSync(dst, JSON.stringify({ [`${redact(urlOf(page))}|${preset}`]: v })); return dst;
}
function baselineVisual(page, vp) {
  const src = path.join(bdir, 'visual', `${page.key}__${vp}`);
  if (!fs.existsSync(src)) return null;
  const f = fs.readdirSync(src).find((x) => x.endsWith('.png')); if (!f) return null;
  const d = path.join(tmp, 'visual', `${page.key}__${vp}`); fs.mkdirSync(d, { recursive: true });
  fs.copyFileSync(path.join(src, f), path.join(d, `${slug100(urlOf(page))}__${vp === 'mobile' ? 'mobile' : 'pc'}.png`)); return d;
}

console.log(`\n### ${cfg.label} [${mode}] 대상 ${origin}  페이지 ${pages.map((p) => p.key).join(',')}  (요청 간격 ${delay}ms)\n`);
const stepResults = {}; // step -> [{page, vp, target, verdict, findings}]
const push = (step, page, vp, sum) => { (stepResults[step] ||= []).push(...(sum?.results || []).map((r) => ({ page: page.key, vp, target: r.url || r.target || r.name || '', verdict: r.verdict, findings: Array.isArray(r.findings) ? r.findings : [] }))); };

// 단계 2
let step2Json = null;
if (doStage2) {
  const out = path.join(runDir, 'step2'); fs.mkdirSync(out, { recursive: true });
  step2Json = path.join(out, 'static_diff.json');
  const r = spawnSync('node', [path.join(here, 'static_diff.mjs'), '--base', String(opt['base-dir']), '--target', String(opt['target-dir']), '--json', step2Json], { encoding: 'utf8' });
  fs.writeFileSync(path.join(out, 'stdout.txt'), r.stdout + r.stderr);
  const j = JSON.parse(fs.readFileSync(step2Json, 'utf8'));
  console.log(`  단계2 정적 diff                  ${j.verdict}`);
  stepResults[2] = [{ page: '-', vp: '-', target: 'static_diff', verdict: j.verdict, findings: j.findings.map((f) => ({ level: f.level, rule: f.rule, detail: `${f.file} ${f.detail}` })) }];
  log.push({ step: 2, label: '정적 diff', verdict: j.verdict, out });
}

for (const page of pages) {
  const st = stagesOf(page); const url = urlOf(page);
  console.log(`\n[${page.key}] ${redact(url)}`);
  for (const vp of vps) {
    const vpArg = vp === 'mobile' ? 'mobile' : 'pc';
    if (wantStages.has('3') && st.has('3')) {
      const args = ['render_check.mjs', '--url', url, '--viewport', vpArg];
      if (mode !== 'baseline') { const b = baselineRender(page, vp); if (b) args.push('--baseline', b); }
      const r = run(3, `렌더 ${page.key}/${vp}`, args, `${page.key}__${vp}`); push(3, page, vp, r.sum);
      if (mode === 'baseline') { // 기준 DOM 저장
        const jf = fs.readdirSync(r.out).find((x) => x.endsWith('.json') && x !== 'summary.json');
        if (jf) { fs.mkdirSync(path.join(bdir, 'render'), { recursive: true }); fs.copyFileSync(path.join(r.out, jf), path.join(bdir, 'render', `${page.key}__${vp}.json`)); }
      }
    }
    if (wantStages.has('4') && st.has('4')) {
      const bf = path.join(bdir, 'a11y', `${page.key}__${vp}.json`);
      const args = ['html_a11y.mjs', '--url', url, '--viewport', vpArg];
      if (mode === 'baseline') { fs.mkdirSync(path.dirname(bf), { recursive: true }); args.push('--save-baseline', bf); }
      else if (fs.existsSync(bf)) args.push('--baseline', bf);
      const r = run(4, `접근성 ${page.key}/${vp}`, args, `${page.key}__${vp}`); push(4, page, vp, r.sum);
    }
    if (wantStages.has('4c') && st.has('4c')) {
      const r = run('4c', `설정확인 ${page.key}/${vp}`, ['setting_check.mjs', '--url', url, '--viewport', vpArg], `${page.key}__${vp}`); push('4c', page, vp, r.sum);
    }
    if (wantStages.has('4b') && st.has('4b') && cfg.tokens && fs.existsSync(path.join(root, cfg.tokens))) {
      const r = run('4b', `토큰 ${page.key}/${vp}`, ['design_tokens.mjs', '--url', url, '--viewport', vpArg, '--tokens', path.join(root, cfg.tokens)], `${page.key}__${vp}`); push('4b', page, vp, r.sum);
    }
    if (wantStages.has('7') && st.has('7')) {
      const args = ['feature_check.mjs', '--url', url, '--viewport', vpArg]; if (cfg.hover) args.push('--hover', cfg.hover);
      const r = run(7, `신기능 ${page.key}/${vp}`, args, `${page.key}__${vp}`); push(7, page, vp, r.sum);
    }
    if (wantStages.has('9') && st.has('9')) {
      const args = ['visual_regression.mjs', '--url', url, '--viewport', vpArg];
      if (cfg.visualMask?.length) args.push('--mask', cfg.visualMask.join(','));
      if (mode === 'baseline') {
        const d = path.join(bdir, 'visual', `${page.key}__${vp}`); fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true });
        args.push('--baseline-dir', d, '--update');
      } else { const b = baselineVisual(page, vp); args.push('--baseline-dir', b || path.join(tmp, 'visual-none')); }
      const r = run(9, `시각 ${page.key}/${vp}`, args, `${page.key}__${vp}`); push(9, page, vp, r.sum);
    }
  }
  if (wantStages.has('5') && st.has('5')) {
    const m = (mode === 'full' ? cfg.matrix?.full : cfg.matrix?.quick) || cfg.matrix?.quick;
    const r = run(5, `반응형 ${page.key}`, ['responsive_matrix.mjs', '--url', url, '--viewports', m.viewports, '--browsers', m.browsers], page.key); push(5, page, 'matrix', r.sum);
  }
  if (wantStages.has('8') && st.has('8')) {
    const preset = cfg.perf?.preset || 'mobile'; const args = ['perf_check.mjs', '--url', url, '--preset', preset, '--runs', perfRuns];
    if (mode === 'baseline') { const f = path.join(bdir, 'perf', `${page.key}.json`); fs.mkdirSync(path.dirname(f), { recursive: true }); args.push('--save-baseline', f); }
    else { const b = baselinePerf(page); if (b) args.push('--baseline', b); }
    const r = run(8, `성능 ${page.key}`, args, page.key); push(8, page, preset, r.sum);
  }
  if (wantStages.has('10') && st.has('10')) {
    const r = run(10, `링크 ${page.key}`, ['link_check.mjs', '--url', url], page.key); push(10, page, '-', r.sum);
  }
}
if (wantStages.has('6') && cfg.flows) {
  const fp = path.join(root, cfg.flows);
  if (fs.existsSync(fp)) {
    const fl = JSON.parse(fs.readFileSync(fp, 'utf8')); fl.base = origin;
    const tf = path.join(runDir, 'flows.json'); fs.writeFileSync(tf, JSON.stringify(fl));
    for (const vp of vps) { const r = run(6, `흐름 ${vp}`, ['flow_check.mjs', '--flows', tf, '--viewport', vp === 'mobile' ? 'mobile' : 'pc'], vp); push(6, { key: 'flows' }, vp, r.sum); }
  } else console.log('  단계6 흐름 파일 없음 → 건너뜀(미실행)');
}

// ---- 기존 문제 구분
const fk = (step, page, vp, rule, detail) => `${step}|${page}|${vp}|${rule}|${(String(step) === '5' && rule === 'page-error' ? '' : String(detail).replace(/\(예:[^)]*\)/g, '')).replace(/\d+\s*(건|개|곳)/g, 'N$1').replace(/\d{4,}/g, '#').slice(0, 90)}`; // 건수·동적 id 변동은 같은 문제로 취급
const fkey = (step, e, f) => fk(step, e.page, e.vp, f.rule, f.detail);
const flat = [];
for (const [step, arr] of Object.entries(stepResults)) for (const e of arr) for (const f of e.findings) if (f.level === 'FAIL' || f.level === 'WARN') flat.push({ step, page: e.page, vp: e.vp, target: redact(e.target), level: f.level, rule: f.rule, detail: String(f.detail).slice(0, 300), key: fkey(step, e, f) });
const exPath = path.join(bdir, 'existing-issues.json');
let existing = new Set();
if (mode === 'baseline') {
  fs.mkdirSync(bdir, { recursive: true });
  let keep = []; // --stages 로 일부만 재저장할 때는 다른 단계의 기존 기록 유지
  if ((stagesOpt || only) && fs.existsSync(exPath)) keep = JSON.parse(fs.readFileSync(exPath, 'utf8')).issues.filter((i) => !((!stagesOpt || stagesOpt.includes(String(i.step))) && (!only || only.has(i.page) || (i.page === 'flows' && wantStages.has('6')))));
  fs.writeFileSync(exPath, JSON.stringify({ savedAt: new Date().toISOString(), origin, note: '수정 전 운영 상태에서 이미 있던 FAIL/WARN. 이후 실행에서 같은 key 는 "기존"으로 표시.', issues: [...keep, ...flat] }, null, 1));
  fs.writeFileSync(path.join(bdir, 'meta.json'), JSON.stringify({ savedAt: new Date().toISOString(), origin, pages: pages.map((p) => p.key), viewports: vps }, null, 1));
  console.log(`\n기준선 저장: ${bdir}  (기존 문제 ${flat.length}건 → existing-issues.json)`);
} else if (fs.existsSync(exPath)) existing = new Set(JSON.parse(fs.readFileSync(exPath, 'utf8')).issues.map((i) => fk(i.step, i.page, i.vp, i.rule, i.detail)));
for (const i of flat) i.origin = mode === 'baseline' ? 'baseline' : existing.has(i.key) ? 'existing' : 'new';
const nNewFail = flat.filter((i) => i.origin === 'new' && i.level === 'FAIL').length;
const nOldFail = flat.filter((i) => i.origin === 'existing' && i.level === 'FAIL').length;
const nNewWarn = flat.filter((i) => i.origin === 'new' && i.level === 'WARN').length;

// ---- 단계 파일 병합 + 종합 리포트(full)
const merged = {};
for (const [step, arr] of Object.entries(stepResults)) { const f = path.join(runDir, `step${step}.json`); const v = arr.some((e) => e.verdict === 'FAIL') ? 'FAIL' : arr.some((e) => e.verdict === 'WARN') ? 'WARN' : 'PASS'; fs.writeFileSync(f, JSON.stringify({ step, verdict: v, results: arr })); merged[step] = f; }
if (mode === 'full') {
  const a = [path.join(here, 'report.mjs')]; for (const [s, f] of Object.entries(merged)) a.push(`--step${s}`, s === '2' && step2Json ? step2Json : f);
  a.push('--target', `${brand} ${origin}`, '--note', '통합 실행기 full 모드(단계 0·1·11은 사람 확인 필요)', '--out', path.join(runDir, 'report.md'));
  spawnSync('node', a, { encoding: 'utf8' });
}
const stepV = Object.fromEntries(Object.entries(stepResults).map(([s, arr]) => [s, arr.some((e) => e.verdict === 'FAIL') ? 'FAIL' : arr.some((e) => e.verdict === 'WARN') ? 'WARN' : 'PASS']));
const summary = { brand, mode, origin, runDir, steps: stepV, counts: { newFail: nNewFail, existingFail: nOldFail, newWarn: nNewWarn, total: flat.length }, issues: flat };
fs.writeFileSync(path.join(runDir, 'run-summary.json'), JSON.stringify(summary, null, 1));
console.log(`\n=== ${cfg.label} [${mode}] 단계별: ${Object.entries(stepV).map(([s, v]) => `${s}:${v}`).join(' ')}`);
if (mode === 'baseline') console.log(`기준선 FAIL ${flat.filter((i) => i.level === 'FAIL').length} / WARN ${flat.filter((i) => i.level === 'WARN').length} (전부 "수정 전부터 있던 문제")`);
else console.log(`신규 FAIL ${nNewFail} / 기존 FAIL ${nOldFail} / 신규 WARN ${nNewWarn}   ${fs.existsSync(exPath) ? '' : '(기준선 없음: 전부 신규로 집계)'}`);
console.log(`결과: ${runDir}/run-summary.json`);
process.exit(mode === 'baseline' ? 0 : nNewFail ? 1 : 0);
