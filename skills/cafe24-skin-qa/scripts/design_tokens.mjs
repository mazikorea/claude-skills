#!/usr/bin/env node
// 단계 4b(디자인 충실도): 승인된 디자인 토큰(JSON)과 렌더 화면의 computed style 대조. 읽기 전용 GET.
// 사용: node design_tokens.mjs --url <URL> --tokens tokens.json [--viewport pc|mobile] [--out dir]
// tokens.json 양식은 tokens/tokens.example.json 참고. 불일치=FAIL, 선택자 없음=FAIL(optional:true 면 WARN).
// 한계: 토큰 JSON 은 사람(디자이너)이 Figma 승인값에서 옮겨 적은 것을 전제로 한다. Figma 직접 추출·이미지 대조는 하지 않는다.
import fs from 'node:fs';
import { parseArgs, outDir, mkAdder, show, finish, launch, redact } from './lib.mjs';

const { urls, opt } = parseArgs();
if (!urls.length || !opt.tokens || opt.tokens === true) { console.error('usage: design_tokens.mjs --url U --tokens tokens.json [--viewport pc|mobile]'); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(String(opt.tokens), 'utf8'));
const dir = outDir(opt, '4b');
const mobile = opt.viewport === 'mobile';
const vpName = mobile ? 'mobile' : 'pc';
const browser = await launch();
const results = [];

const toRgb = (c) => { // #rgb/#rrggbb/rgb()/rgba() → "r,g,b,a"
  const s = String(c).trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3})$/); if (m) return [...m[1]].map((h) => parseInt(h + h, 16)).concat(1).join(',');
  m = s.match(/^#([0-9a-f]{6})$/); if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1).join(',');
  m = s.match(/^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?\s*\)$/); if (m) return [m[1], m[2], m[3], m[4] ?? 1].map(Number).join(',');
  return null;
};
const px = (v) => { const m = String(v).trim().match(/^(-?[\d.]+)px$/); return m ? Number(m[1]) : null; };
const COLOR = /(^|-)color$|^background$|^fill$|^stroke$/;
function same(prop, want, got, tol) {
  if (COLOR.test(prop)) { const a = toRgb(want), b = toRgb(got); return a && b ? a === b : String(want).toLowerCase() === String(got).toLowerCase(); }
  if (prop === 'font-family') { const w = String(want).split(',')[0].replace(/["']/g, '').trim().toLowerCase(); return String(got).toLowerCase().replace(/["']/g, '').split(',').map((x) => x.trim()).includes(w); }
  if (prop === 'font-weight') { const m = { normal: 400, bold: 700 }; return Number(m[want] ?? want) === Number(m[got] ?? got); }
  const a = px(want), b = px(got); if (a !== null && b !== null) return Math.abs(a - b) <= tol;
  return String(want).trim().toLowerCase() === String(got).trim().toLowerCase();
}

for (const url of urls) {
  const A = mkAdder();
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: mobile, locale: 'ko-KR' });
  const page = await ctx.newPage();
  try { await page.goto(url, { waitUntil: 'load', timeout: 30000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); }
  catch (e) { A.add('FAIL', 'navigation', String(e.message).split('\n')[0]); }
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  let n = 0;
  for (const [name, want] of Object.entries(spec.cssVars || {})) { // :root CSS 변수
    const got = await page.evaluate((k) => getComputedStyle(document.documentElement).getPropertyValue(k).trim(), name); n++;
    if (!got) A.add('FAIL', 'cssvar-missing', `${name} 정의 없음(기대 ${want})`);
    else if (!same(toRgb(want) ? 'color' : name, want, got, 0)) A.add('FAIL', 'cssvar-mismatch', `${name}: 기대 ${want} / 실제 ${got}`);
  }
  for (const c of spec.checks || []) {
    if (c.viewport && c.viewport !== 'any' && c.viewport !== vpName) continue;
    const tol = c.tolerancePx ?? spec.tolerancePx ?? 1;
    const els = await page.$$(c.selector); n++;
    if (!els.length) { A.add(c.optional ? 'WARN' : 'FAIL', 'selector-missing', `[${c.name || c.selector}] ${c.selector} 없음`); continue; }
    const targets = c.which === 'all' ? els.slice(0, 20) : [els[0]];
    for (const [i, el] of targets.entries()) {
      for (const [prop, want] of Object.entries(c.expect || {})) {
        const r = await el.evaluate((e, p) => { const cs = getComputedStyle(e); return { v: cs.getPropertyValue(p), fs: cs.fontSize }; }, prop);
        let ok;
        if (prop === 'line-height' && /^[\d.]+$/.test(String(want))) { const lh = px(r.v), f = px(r.fs); ok = lh !== null && f ? Math.abs(lh / f - Number(want)) <= 0.05 : false; } // 비율(배수) 표기
        else ok = same(prop, want, r.v, tol);
        if (!ok) A.add('FAIL', 'token-mismatch', `[${c.name || c.selector}${targets.length > 1 ? '#' + (i + 1) : ''}] ${prop}: 기대 ${want} / 실제 ${r.v}`);
      }
    }
  }
  if (!n) A.add('WARN', 'no-checks', '대조 항목 없음');
  show(`${redact(url)} [${vpName}] 토큰 대조 ${n}건`, A.findings);
  results.push({ target: url, viewport: vpName, verdict: A.findings.some((f) => f.level === 'FAIL') ? 'FAIL' : A.findings.length ? 'WARN' : 'PASS', findings: A.findings });
  await ctx.close();
}
await browser.close();
finish('4b', '디자인 충실도', dir, results);
