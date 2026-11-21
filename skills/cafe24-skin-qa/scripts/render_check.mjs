#!/usr/bin/env node
// 단계 3: 렌더 HTML 수집 + 콘솔·네트워크 에러 + 치환 잔존({$ / <!--@) + xans 모듈 컨테이너 검사 (읽기 전용, GET만)
// 사용: node render_check.mjs --url <URL> [--url <URL2>] | --urls file.txt  [--viewport pc|mobile|WxH]
//        [--out dir] [--baseline dir] [--ignore regex] [--shot] [--timeout ms]
// 브라우저: scripts/.browsers 에 설치된 프로젝트 전용 chromium (PLAYWRIGHT_BROWSERS_PATH 자동 지정)
// 종료코드: 0=PASS/WARN, 1=FAIL, 2=사용법 오류
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(here, '.browsers');
const { chromium } = await import('playwright');

const argv = process.argv.slice(2);
const urls = [], opt = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const k = argv[i].slice(2), v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  if (k === 'url') urls.push(v); else opt[k] = v;
}
if (opt.urls && opt.urls !== true) urls.push(...fs.readFileSync(opt.urls, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#')));
if (!urls.length) { console.error('usage: render_check.mjs --url <URL> [--viewport pc|mobile|WxH] [--out dir] [--baseline dir] [--ignore regex] [--shot]'); process.exit(2); }

const vpName = String(opt.viewport || 'pc');
const vp = vpName === 'mobile' ? { width: 390, height: 844, mobile: true } : vpName === 'pc' ? { width: 1440, height: 900, mobile: false }
  : (() => { const [w, h] = vpName.split('x').map(Number); return { width: w, height: h || 900, mobile: w < 768 }; })();
const outDir = path.resolve(String(opt.out && opt.out !== true ? opt.out : path.join(here, '..', 'out', `render-${Date.now()}`)));
fs.mkdirSync(outDir, { recursive: true });
const ignore = opt.ignore && opt.ignore !== true ? new RegExp(String(opt.ignore)) : null;
const timeout = Number(opt.timeout || 30000);
const slug = (u) => u.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 120);

const browser = await chromium.launch();
const results = [];
for (const url of urls) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const findings = [], add = (level, rule, detail) => findings.push({ level, rule, detail });
  const origin = new URL(url).origin;
  const consoleErrs = [], failed = [], badStatus = [], jq = new Set();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  page.on('pageerror', (e) => consoleErrs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => failed.push({ url: r.url(), err: r.failure()?.errorText }));
  page.on('response', (r) => {
    if (r.status() >= 400) badStatus.push({ url: r.url(), status: r.status() });
    if (/jquery[-.\d]*(\.min)?\.js/i.test(r.url())) jq.add(r.url());
  });
  let navStatus = null;
  try {
    const resp = await page.goto(url, { waitUntil: 'load', timeout });
    navStatus = resp?.status() ?? null;
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  } catch (e) { add('FAIL', 'navigation', String(e.message).split('\n')[0]); }
  if (navStatus && navStatus >= 400) add('FAIL', 'http-status', `페이지 응답 ${navStatus}`);

  const html = await page.content().catch(() => '');
  const name = slug(url) + '__' + (vpName === 'pc' || vpName === 'mobile' ? vpName : vpName.replace(/\W/g, ''));
  fs.writeFileSync(path.join(outDir, name + '.html'), html);
  if (opt.shot) await page.screenshot({ path: path.join(outDir, name + '.png'), fullPage: false }).catch(() => {});

  // 치환 잔존: 보이는 텍스트·속성(FAIL) / script·style 내부(WARN)
  const leak = await page.evaluate(() => {
    const out = { text: [], attr: [], code: [] };
    const re = /\{\$[A-Za-z_]/;
    const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      const t = n.nodeValue || '', tag = n.parentElement?.tagName;
      if (!re.test(t)) continue;
      (tag === 'SCRIPT' || tag === 'STYLE' ? out.code : out.text).push(t.trim().slice(0, 80));
    }
    for (const el of document.querySelectorAll('*')) for (const a of el.attributes) if (re.test(a.value)) out.attr.push(`${el.tagName.toLowerCase()}[${a.name}]=${a.value.slice(0, 60)}`);
    const comments = [];
    const cw = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT);
    for (let n; (n = cw.nextNode());) if ((n.nodeValue || '').trim().startsWith('@')) comments.push(n.nodeValue.trim().slice(0, 60));
    out.comments = comments;
    return out;
  }).catch(() => ({ text: [], attr: [], code: [], comments: [] }));
  if (leak.text.length) add('FAIL', 'unreplaced-var-text', `화면 텍스트에 {$ 잔존 ${leak.text.length}건: ${leak.text.slice(0, 3).join(' | ')}`);
  if (leak.attr.length) add('FAIL', 'unreplaced-var-attr', `속성에 {$ 잔존 ${leak.attr.length}건: ${leak.attr.slice(0, 3).join(' | ')}`);
  if (leak.comments.length) add('FAIL', 'unreplaced-directive', `<!--@ 지시문 잔존 ${leak.comments.length}건: ${leak.comments.slice(0, 3).join(' | ')}`);
  if (leak.code.length) add('WARN', 'var-in-script', `script/style 내부 {$ ${leak.code.length}건(템플릿 리터럴일 수 있음, 수동 확인): ${leak.code.slice(0, 2).join(' | ')}`);

  // 콘솔·네트워크
  const keep = (s) => !(ignore && ignore.test(s)) && !/^about:/.test(s);
  const red = (u) => String(u).replace(/\?.*$/, '?…'); // 쿼리(토큰 가능) 제거
  const ce = consoleErrs.filter(keep);
  if (ce.length) add('FAIL', 'console-error', `콘솔 error ${ce.length}건: ${ce.slice(0, 3).join(' | ').slice(0, 300)}`);
  if (ce.some((s) => /Refused to load|Content Security Policy/i.test(s))) add('FAIL', 'csp-refused', 'CSP/Refused to load 감지(외부 스크립트·미디어 차단)');
  if (ce.some((s) => /\$ is not a function|jQuery is not defined|\$ is not defined/i.test(s))) add('FAIL', 'jquery-error', 'jQuery 관련 스크립트 오류');
  const side = (u) => { try { return new URL(u).origin === origin ? 'same' : 'third'; } catch { return 'same'; } };
  const bs = badStatus.filter((b) => keep(b.url)), ff = failed.filter((b) => keep(b.url) && !/net::ERR_ABORTED/.test(b.err || ''));
  for (const b of bs) add(side(b.url) === 'same' ? 'FAIL' : 'WARN', 'http-4xx5xx', `${b.status} ${red(b.url).slice(0, 140)}${side(b.url) === 'same' ? '' : ' (외부 도메인)'}`);
  for (const b of ff) add(side(b.url) === 'same' ? 'FAIL' : 'WARN', 'request-failed', `${b.err} ${red(b.url).slice(0, 140)}`);
  if (jq.size > 1) add('FAIL', 'jquery-duplicate', `jQuery 요청 ${jq.size}개: ${[...jq].join(', ').slice(0, 200)}`);

  // 구조: xans 모듈 컨테이너, viewport meta, 가로 스크롤
  const dom = await page.evaluate(() => {
    const mods = {};
    for (const el of document.querySelectorAll('[class*="xans-"]')) {
      for (const c of el.classList) if (/^xans-[a-z0-9]+-[A-Za-z0-9_]+/i.test(c) && !/^xans-(element|record)-$/.test(c) && !/^xans-element-/.test(c) && !/^xans-record-/.test(c)) mods[c] = (mods[c] || 0) + 1;
    }
    return { mods, viewportMeta: !!document.querySelector('meta[name="viewport"]'), hscroll: document.documentElement.scrollWidth > window.innerWidth + 1, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, title: document.title };
  }).catch(() => ({ mods: {}, viewportMeta: false, hscroll: false }));
  if (vp.mobile && !dom.viewportMeta) add('FAIL', 'viewport-meta', '모바일 viewport meta 없음');
  if (dom.hscroll) add('WARN', 'horizontal-scroll', `가로 스크롤 발생(scrollWidth ${dom.scrollW} > ${dom.innerW})`);
  if (!Object.keys(dom.mods).length) add('WARN', 'no-xans', 'xans-* 모듈 컨테이너가 하나도 없음(카페24 페이지가 아니거나 모듈 전부 누락)');

  // 기준(원본 스킨 렌더) 비교
  if (opt.baseline && opt.baseline !== true) {
    const bp = path.join(String(opt.baseline), name + '.json');
    if (fs.existsSync(bp)) {
      const base = JSON.parse(fs.readFileSync(bp, 'utf8')).dom.mods;
      for (const k of Object.keys(base)) if (!(k in dom.mods)) add('FAIL', 'xans-missing', `원본엔 있던 ${k} 컨테이너가 사라짐`);
      for (const k of Object.keys(dom.mods)) if (!(k in base)) add('WARN', 'xans-added', `${k} 컨테이너 신규`);
    } else add('WARN', 'baseline-absent', `기준 파일 없음: ${bp}`);
  }

  const fails = findings.filter((f) => f.level === 'FAIL').length, warns = findings.filter((f) => f.level === 'WARN').length;
  const r = { url, viewport: vpName, verdict: fails ? 'FAIL' : warns ? 'WARN' : 'PASS', navStatus, title: dom.title, dom: { mods: dom.mods }, html: name + '.html', findings };
  fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(r, null, 2));
  results.push(r);
  console.log(`\n== ${r.verdict}  ${url}  [${vpName}]  xans ${Object.keys(dom.mods).length}종`);
  for (const f of findings) console.log(`  ${f.level.padEnd(4)} ${f.rule.padEnd(20)} ${f.detail}`);
  await ctx.close();
}
await browser.close();

const order = { FAIL: 2, WARN: 1, PASS: 0 };
const overall = results.reduce((a, r) => (order[r.verdict] > order[a] ? r.verdict : a), 'PASS');
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ step: 3, verdict: overall, results: results.map((r) => ({ url: r.url, viewport: r.viewport, verdict: r.verdict, findings: r.findings.length })) }, null, 2));
console.log(`\n[단계3 렌더 검사] ${overall}  (${results.length}개 URL)  결과폴더: ${outDir}`);
process.exit(overall === 'FAIL' ? 1 : 0);
