#!/usr/bin/env node
// 단계 5: 반응형·브라우저 매트릭스 (뷰포트 × 엔진). 읽기 전용 GET.
// 사용: node responsive_matrix.mjs --url <URL> [--viewports 390,430,768,1440] [--browsers chromium,webkit,firefox] [--shot] [--out dir] [--open "버튼셀렉터"]
// 주의: isMobile 에뮬은 쓰지 않음(켜면 고정폭 초과 콘텐츠가 레이아웃 뷰포트를 넓혀 가로 스크롤을 놓침)
// 판정: 가로 스크롤·깨진 이미지·페이지 오류=FAIL / 뷰포트 밖 요소·44px 미만 터치 대상=WARN. Playwright WebKit≠실제 iOS Safari(11단계 별도).
import { parseArgs, outDir, mkAdder, show, finish, redact, slug } from './lib.mjs';

const { urls, opt } = parseArgs();
if (!urls.length) { console.error('usage: responsive_matrix.mjs --url <URL> [--viewports 390,430,768,1440] [--browsers chromium,webkit,firefox]'); process.exit(2); }
const vps = String(opt.viewports && opt.viewports !== true ? opt.viewports : '390,430,768,1440').split(',').map(Number);
const engines = String(opt.browsers && opt.browsers !== true ? opt.browsers : 'chromium,webkit,firefox').split(',');
const dir = outDir(opt, 5);
const pw = await import('playwright');
const results = [];
for (const eng of engines) {
  let browser;
  try { browser = await pw[eng].launch(); } catch (e) { const A = mkAdder(); A.add('FAIL', 'launch', `${eng} 실행 실패: ${String(e.message).split('\n')[0]}`); results.push({ target: `${eng}`, verdict: 'FAIL', findings: A.findings }); show(eng, A.findings); continue; }
  for (const url of urls) for (const w of vps) {
    const A = mkAdder(), mobile = w < 768;
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, hasTouch: mobile, locale: 'ko-KR' });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    try { await page.goto(url, { waitUntil: 'load', timeout: 30000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); } catch (e) { A.add('FAIL', 'navigation', String(e.message).split('\n')[0]); }
    if (opt.open && opt.open !== true) { try { await page.click(String(opt.open), { timeout: 3000 }); await page.waitForTimeout(400); } catch { A.add('WARN', 'open-selector', `--open 셀렉터 클릭 실패: ${opt.open}`); } }
    const m = await page.evaluate((mobile) => {
      const W = window.innerWidth, vis = (el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const over = [], small = [], broken = [];
      for (const el of document.body.querySelectorAll('*')) {
        if (!vis(el)) continue;
        const r = el.getBoundingClientRect(), pos = getComputedStyle(el).position;
        if (pos !== 'fixed' && r.right > W + 1 && r.width < W * 3) over.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''}`);
        if (mobile && el.matches('a[href],button,input:not([type=hidden]),select,textarea,[role=button]') && (r.width < 44 || r.height < 44) && r.width * r.height > 0) small.push(`${el.tagName.toLowerCase()}:${Math.round(r.width)}x${Math.round(r.height)}`);
        if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0 && el.currentSrc && !el.currentSrc.startsWith('data:')) broken.push(el.currentSrc.slice(0, 80));
      }
      return { hscroll: document.documentElement.scrollWidth > W + 1, sw: document.documentElement.scrollWidth, W, over: [...new Set(over)].slice(0, 5), overN: over.length, small: small.slice(0, 5), smallN: small.length, broken };
    }, mobile).catch(() => null);
    if (m) {
      if (m.hscroll) A.add('FAIL', 'horizontal-scroll', `가로 스크롤 scrollWidth ${m.sw} > ${m.W}`);
      if (m.broken.length) A.add('FAIL', 'broken-image', `깨진 이미지 ${m.broken.length}건: ${m.broken.slice(0, 2).map(redact).join(' | ')}`);
      if (m.overN) A.add('WARN', 'overflow-element', `뷰포트 밖으로 나간 요소 ${m.overN}개: ${m.over.join(', ')}`);
      if (m.smallN) A.add('WARN', 'touch-target<44', `44px 미만 터치 대상 ${m.smallN}개 (예: ${m.small.slice(0, 3).join(', ')})`);
    }
    if (errs.length) A.add('FAIL', 'page-error', `${errs.length}건: ${errs[0].slice(0, 120)}`);
    if (opt.shot) await page.screenshot({ path: `${dir}/${slug(url)}__${eng}_${w}.png` }).catch(() => {});
    const t = `${redact(url)} [${eng} ${w}px]`;
    show(t, A.findings);
    results.push({ target: t, verdict: A.findings.some((f) => f.level === 'FAIL') ? 'FAIL' : A.findings.length ? 'WARN' : 'PASS', findings: A.findings });
    await ctx.close();
  }
  await browser.close();
}
finish(5, '반응형·브라우저', dir, results);
