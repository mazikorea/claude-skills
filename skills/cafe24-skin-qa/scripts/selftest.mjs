#!/usr/bin/env node
// 스크립트 자가 시험: 로컬 픽스처로 단계 2~12 의 PASS/FAIL 재현. 사용: node selftest.mjs [--with-perf]
// 공개 페이지·운영 접근 없음. 결과 폴더는 ../out/selftest (gitignore).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { here } from './lib.mjs';

const fx = path.join(here, '..', 'fixtures'), out = path.join(here, '..', 'out', 'selftest'), port = 8791, B = `http://localhost:${port}`;
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const srv = spawn('node', [path.join(fx, 'serve.mjs'), path.join(fx, 'render'), String(port)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const flows = (f) => { const t = fs.readFileSync(path.join(here, '..', 'flows', f), 'utf8').replace(/localhost:8765/g, `localhost:${port}`); const p = path.join(out, f); fs.writeFileSync(p, t); return p; };
const o = (n) => path.join(out, n);
const C = [
  ['2 정적diff 동일스킨', 'static_diff.mjs', ['--base', `${fx}/skin_base`, '--target', `${fx}/skin_pass`, '--json', o('s2p.json')], 0],
  ['2 정적diff 결함스킨', 'static_diff.mjs', ['--base', `${fx}/skin_base`, '--target', `${fx}/skin_fail`, '--json', o('s2f.json')], 1],
  ['3 렌더 정상', 'render_check.mjs', ['--url', `${B}/good.html`, '--viewport', 'mobile', '--out', o('s3p')], 0],
  ['3 렌더 결함', 'render_check.mjs', ['--url', `${B}/bad.html`, '--viewport', 'mobile', '--out', o('s3f')], 1],
  ['4 HTML·접근성 정상', 'html_a11y.mjs', ['--url', `${B}/a11y_good.html`, '--out', o('s4p')], 0],
  ['4 HTML·접근성 결함', 'html_a11y.mjs', ['--url', `${B}/a11y_bad.html`, '--out', o('s4f')], 1],
  ['4b 디자인토큰 정상', 'design_tokens.mjs', ['--url', `${B}/tokens_page.html`, '--tokens', `${fx}/tokens_good.json`, '--out', o('s4bp')], 0],
  ['4b 디자인토큰 모바일 정상', 'design_tokens.mjs', ['--url', `${B}/tokens_page.html`, '--viewport', 'mobile', '--tokens', `${fx}/tokens_good.json`, '--out', o('s4bm')], 0],
  ['4b 디자인토큰 불일치', 'design_tokens.mjs', ['--url', `${B}/tokens_page.html`, '--tokens', `${fx}/tokens_bad.json`, '--out', o('s4bf')], 1],
  ['4c 설정간접 정상', 'setting_check.mjs', ['--url', `${B}/settings_good.html`, '--out', o('s4cp')], 0],
  ['4c 설정간접 결함(WARN, exit 0)', 'setting_check.mjs', ['--url', `${B}/settings_bad.html`, '--out', o('s4cf')], 0],
  ['5 반응형 정상', 'responsive_matrix.mjs', ['--url', `${B}/resp_good.html`, '--viewports', '390,1440', '--out', o('s5p')], 0],
  ['5 반응형 결함', 'responsive_matrix.mjs', ['--url', `${B}/resp_bad.html`, '--viewports', '390,1440', '--out', o('s5f')], 1],
  ['6 기능흐름 정상', 'flow_check.mjs', ['--flows', flows('fixture-pass.json'), '--out', o('s6p')], 0],
  ['6 기능흐름 결함(쓰기·결제 차단)', 'flow_check.mjs', ['--flows', flows('fixture-fail.json'), '--out', o('s6f')], 1],
  ['7 신기능 정상', 'feature_check.mjs', ['--url', `${B}/feat_pass.html`, '--hover', '.card', '--out', o('s7p')], 0],
  ['7 신기능 결함', 'feature_check.mjs', ['--url', `${B}/feat_bad.html`, '--hover', '.card', '--out', o('s7f')], 1],
  ['9 시각 기준 저장', 'visual_regression.mjs', ['--url', `${B}/vis_a.html`, '--baseline-dir', o('vb'), '--update', '--out', o('s9u')], 0],
  ['9 시각 동일', 'visual_regression.mjs', ['--url', `${B}/vis_a.html`, '--baseline-dir', o('vb'), '--out', o('s9p')], 0],
  ['10 링크 정상', 'link_check.mjs', ['--url', `${B}/links_ok.html`, '--out', o('s10p')], 0],
  ['10 링크 결함', 'link_check.mjs', ['--url', `${B}/links_bad.html`, '--out', o('s10f')], 1],
];
if (process.argv.includes('--with-perf')) C.push(
  ['8 성능 기준 저장', 'perf_check.mjs', ['--url', `${B}/perf_fast.html`, '--runs', '2', '--save-baseline', o('pb.json'), '--out', o('s8u')], 0],
  ['8 성능 동일', 'perf_check.mjs', ['--url', `${B}/perf_fast.html`, '--runs', '2', '--baseline', o('pb.json'), '--out', o('s8p')], 0]);
let bad = 0;
for (const [name, script, args, want] of C) {
  const r = spawnSync('node', [path.join(here, script), ...args], { encoding: 'utf8', timeout: 300000 });
  const ok = r.status === want; if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'NG  '} ${name.padEnd(30)} exit=${r.status} (기대 ${want})`);
}
// 단계 4c: WARN 규칙 재현 확인(결함 페이지에는 있어야 하고 정상 페이지에는 없어야 함)
{ const rules = (d) => JSON.parse(fs.readFileSync(o(d + '/summary.json'), 'utf8')).results.flatMap((r) => r.findings.map((f) => f.rule));
  const bad4 = rules('s4cf'), good4 = rules('s4cp'); const want = ['lazy-off-suspected', 'mixed-content', 'seo-title', 'seo-description', 'noindex'];
  const ok = want.every((w) => bad4.includes(w)) && !want.some((w) => good4.includes(w)); if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'NG  '} ${'4c WARN 규칙 재현'.padEnd(30)} 결함:${want.filter((w) => bad4.includes(w)).length}/${want.length} 정상 오탐:${good4.filter((w) => want.includes(w)).length}`); }
// 시각 회귀 차이 케이스: 다른 페이지를 같은 기준 이름으로 비교
fs.copyFileSync(o('vb/localhost_8791_vis_a_html__pc.png'), o('vb/localhost_8791_vis_b_html__pc.png'));
{ const r = spawnSync('node', [path.join(here, 'visual_regression.mjs'), '--url', `${B}/vis_b.html`, '--baseline-dir', o('vb'), '--out', o('s9f')], { encoding: 'utf8' }); const ok = r.status === 1; if (!ok) bad++; console.log(`${ok ? 'OK  ' : 'NG  '} ${'9 시각 차이'.padEnd(30)} exit=${r.status} (기대 1)`); }
// 단계 12 종합 리포트
const rep = (args, want, name) => { const r = spawnSync('node', [path.join(here, 'report.mjs'), ...args], { encoding: 'utf8' }); const ok = r.status === want; if (!ok) bad++; console.log(`${ok ? 'OK  ' : 'NG  '} ${name.padEnd(30)} exit=${r.status} (기대 ${want})`); };
rep(['--step2', o('s2p.json'), '--step3', o('s3p/summary.json'), '--step4', o('s4p/summary.json'), '--step5', o('s5p/summary.json'), '--step6', o('s6p/summary.json'), '--step7', o('s7p/summary.json'), ...(process.argv.includes('--with-perf') ? ['--step8', o('s8p/summary.json')] : []), '--step9', o('s9p/summary.json'), '--step10', o('s10p/summary.json'), '--manual0', 'PASS', '--manual1', 'PASS', '--manual11', 'PASS', '--out', o('report-pass.md')], 0, process.argv.includes('--with-perf') ? '12 종합 PASS(전 단계 정상)' : '12 종합 WARN(8단계 생략)');
rep(['--step2', o('s2f.json'), '--step3', o('s3f/summary.json'), '--out', o('report-fail.md')], 1, '12 종합 FAIL(결함 포함)');
rep(['--step2', o('s2p.json'), '--out', o('report-warn.md')], 0, '12 종합 WARN(미실행 단계)');
srv.kill();
console.log(bad ? `\n자가 시험 실패 ${bad}건` : '\n자가 시험 전부 기대대로 재현됨');
process.exit(bad ? 1 : 0);
