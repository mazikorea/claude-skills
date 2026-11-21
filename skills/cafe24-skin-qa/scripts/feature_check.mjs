#!/usr/bin/env node
// 단계 7: 신기능 전용 점검 — 영상(muted·playsinline·poster·용량), GIF, 썸네일 호버, 첫 줄 lazy·이미지 크기 속성, 3D(model-viewer·USDZ), 모션(reduced-motion). 읽기 전용 GET/HEAD.
// 사용: node feature_check.mjs --url <URL> [--viewport pc|mobile] [--hover "카드 셀렉터"] [--video-budget-mb 5] [--out dir]
// 카페24에서의 실제 동작(에디터 video 보존·glb 업로드·CSP)은 단계 1 가설 시험 대상이며 여기서 가정하지 않음.
import { parseArgs, outDir, mkAdder, show, finish, launch, redact, slug } from './lib.mjs';

const { urls, opt } = parseArgs();
if (!urls.length) { console.error('usage: feature_check.mjs --url <URL> [--hover sel] [--video-budget-mb 5]'); process.exit(2); }
const budget = Number(opt['video-budget-mb'] || 5) * 1048576;
const dir = outDir(opt, 7);
const mobile = opt.viewport === 'mobile';
const browser = await launch();
const results = [];
const MIME = { glb: /^model\/gltf-binary$/, gltf: /^model\/gltf\+json$/, usdz: /^model\/vnd\.usdz\+zip$/ };
for (const url of urls) {
  const A = mkAdder();
  const vp = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const ctx = await browser.newContext({ viewport: vp, hasTouch: mobile, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errs = [], gifs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('response', (r) => { if (/\.gif(\?|$)/i.test(r.url())) gifs.push({ url: r.url(), n: Number(r.headers()['content-length'] || 0) }); });
  try { await page.goto(url, { waitUntil: 'load', timeout: 30000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); } catch (e) { A.add('FAIL', 'navigation', String(e.message).split('\n')[0]); }
  await page.waitForTimeout(1200);
  const head = async (u) => { try { const r = await ctx.request.head(new URL(u, url).href, { timeout: 8000 }); return { status: r.status(), type: (r.headers()['content-type'] || '').split(';')[0], size: Number(r.headers()['content-length'] || 0) }; } catch { return { status: 0, type: '', size: 0 }; } };

  const d = await page.evaluate(() => {
    const vids = [...document.querySelectorAll('video')].map((v) => ({ autoplay: v.autoplay || v.hasAttribute('autoplay'), muted: v.muted || v.hasAttribute('muted'), playsinline: v.hasAttribute('playsinline') || v.playsInline, poster: v.getAttribute('poster'), controls: v.controls, paused: v.paused, src: v.currentSrc || v.getAttribute('src') || v.querySelector('source')?.getAttribute('src') || '' }));
    const models = [...document.querySelectorAll('model-viewer')].map((m) => ({ src: m.getAttribute('src'), ios: m.getAttribute('ios-src'), poster: m.getAttribute('poster') }));
    const usdz = [...document.querySelectorAll('a[rel~=ar], a[href$=".usdz"]')].map((a) => ({ href: a.getAttribute('href'), hasImg: !!a.querySelector('img') }));
    const imgs = [...document.querySelectorAll('img')].filter((i) => { const r = i.getBoundingClientRect(); return r.width > 40 && r.height > 40; });
    const firstFold = imgs.filter((i) => i.getBoundingClientRect().top < window.innerHeight);
    let hoverRules = 0, guarded = 0;
    const walk = (rules, inGuard) => { for (const r of rules) { if (r.selectorText && r.selectorText.includes(':hover')) { hoverRules++; if (inGuard) guarded++; } if (r.cssRules) walk(r.cssRules, inGuard || (r.media ? /hover:\s*hover/.test(r.media.mediaText) : false)); } };
    for (const s of document.styleSheets) { try { walk(s.cssRules, false); } catch {} }
    return { vids, models, usdz, lazyFold: firstFold.filter((i) => i.loading === 'lazy').length, foldN: firstFold.length, noSize: imgs.filter((i) => !(i.getAttribute('width') && i.getAttribute('height')) && !i.style.aspectRatio).length, imgN: imgs.length, hoverRules, guarded, anims: document.getAnimations().filter((a) => a.playState === 'running').length };
  }).catch(() => ({ vids: [], models: [], usdz: [], lazyFold: 0, foldN: 0, noSize: 0, imgN: 0, hoverRules: 0, guarded: 0, anims: 0 }));

  d.vids.forEach((v, i) => {
    const t = `video#${i + 1}`;
    if (v.autoplay && !v.muted) A.add('FAIL', 'video-autoplay-unmuted', `${t} autoplay인데 muted 아님(자동재생 차단·iOS 전체화면)`);
    if (v.autoplay && !v.playsinline) A.add('FAIL', 'video-no-playsinline', `${t} playsinline 없음(iPhone 전체화면 재생)`);
    if (!v.poster) A.add('WARN', 'video-no-poster', `${t} poster 없음`);
    if (v.autoplay && v.muted && v.paused) A.add('WARN', 'video-not-playing', `${t} 자동재생 상태 아님(headless 코덱 제한일 수 있음, 실기기 확인)`);
  });
  for (const v of d.vids) if (v.src) { const h = await head(v.src); if (h.status >= 400 || h.status === 0) A.add('FAIL', 'video-src', `영상 로드 실패 ${h.status} ${redact(v.src)}`); else { if (h.type && !/^video\//.test(h.type)) A.add('FAIL', 'video-mime', `영상 Content-Type ${h.type}`); if (h.size > budget) A.add('WARN', 'video-size', `영상 ${(h.size / 1048576).toFixed(1)}MB > 예산 ${(budget / 1048576)}MB`); } }
  for (const g of gifs.filter((g) => g.n > 51200)) A.add('WARN', 'gif-heavy', `GIF ${(g.n / 1024).toFixed(0)}KB → 영상 교체 검토: ${redact(g.url).slice(0, 100)}`);
  d.models.forEach((m) => { if (!m.poster) A.add('WARN', 'model-no-poster', `model-viewer poster 없음`); });
  for (const m of d.models) for (const [k, u] of [['src', m.src], ['ios-src', m.ios]]) if (u) { const ext = u.split('?')[0].split('.').pop().toLowerCase(); const h = await head(u); if (h.status >= 400 || h.status === 0) A.add('FAIL', 'model-load', `${k} 로드 실패 ${h.status} ${redact(u)}`); else if (MIME[ext] && !MIME[ext].test(h.type)) A.add('FAIL', 'model-mime', `${k} Content-Type "${h.type}" (기대 ${MIME[ext].source.replace(/[\\^$]/g, '')})`); else if (h.size > 5 * 1048576) A.add('WARN', 'model-size', `${k} ${(h.size / 1048576).toFixed(1)}MB`); }
  for (const a of d.usdz) { if (!a.hasImg && /rel/.test('rel')) A.add('WARN', 'usdz-no-img', `AR 링크에 img 자식 없음(Quick Look 요건): ${a.href}`); const h = await head(a.href); if (h.status >= 400 || h.status === 0) A.add('FAIL', 'usdz-load', `USDZ 로드 실패 ${h.status}`); else if (!MIME.usdz.test(h.type)) A.add('FAIL', 'usdz-mime', `USDZ Content-Type "${h.type}" (기대 model/vnd.usdz+zip)`); }
  if (d.lazyFold) A.add('WARN', 'lcp-lazy', `첫 화면 이미지 ${d.lazyFold}/${d.foldN}개가 loading=lazy(LCP 지연)`);
  if (d.noSize) A.add('WARN', 'img-no-size', `width/height 없는 이미지 ${d.noSize}/${d.imgN}개(CLS 위험)`);
  if (d.hoverRules && d.guarded < d.hoverRules) A.add('WARN', 'hover-unguarded', `:hover 규칙 ${d.hoverRules}개 중 @media (hover:hover) 보호 ${d.guarded}개 — 터치 기기에서 hover 고착 가능`);
  if (opt.hover && opt.hover !== true && !mobile) {
    const sel = String(opt.hover), loc = page.locator(sel).first();
    if (!(await loc.count())) A.add('FAIL', 'hover-target', `--hover 대상 없음: ${sel}`);
    else {
      const snap = () => loc.evaluate((el) => [...el.querySelectorAll('img')].map((i) => (i.currentSrc || i.src) + '|' + getComputedStyle(i).opacity + '|' + getComputedStyle(i).visibility).join(';'));
      const before = await snap(); try { await loc.hover({ force: true, timeout: 5000 }); } catch (e) { A.add('WARN', 'hover-error', `hover 실행 실패(움직이는 요소일 수 있음): ${String(e.message).split('\n')[0].slice(0, 80)}`); } await page.waitForTimeout(600); const after = await snap();
      if (before === after) A.add('FAIL', 'hover-no-change', `hover 후 이미지 src/opacity 변화 없음: ${sel}`);
    }
  }
  // 모션: reduced-motion 에뮬
  const rctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce', locale: 'ko-KR' });
  const rp = await rctx.newPage();
  try { await rp.goto(url, { waitUntil: 'load', timeout: 30000 }); await rp.waitForTimeout(1200); const r = await rp.evaluate(() => ({ anims: document.getAnimations().filter((a) => a.playState === 'running').length, vid: [...document.querySelectorAll('video[autoplay]')].filter((v) => !v.paused).length })); if (r.anims) A.add('WARN', 'motion-reduced', `reduced-motion에서도 실행 중인 애니메이션 ${r.anims}개(prefers-reduced-motion 미대응)`); if (r.vid) A.add('WARN', 'video-reduced', `reduced-motion에서 자동재생 영상 ${r.vid}개 재생 중`); } catch {}
  await rctx.close();
  const ce = errs.filter((s) => !/ERR_UNKNOWN_URL_SCHEME/.test(s));
  if (ce.length) A.add('FAIL', 'console-error', `콘솔 error ${ce.length}건: ${ce[0].slice(0, 120)}`);
  if (!d.vids.length && !d.models.length && !d.usdz.length) A.add('WARN', 'no-media', '영상·3D 요소 없음(해당 기능이 없는 페이지면 정상)');
  show(`${redact(url)} [${mobile ? 'mobile' : 'pc'}]`, A.findings);
  results.push({ target: url, verdict: A.findings.some((f) => f.level === 'FAIL') ? 'FAIL' : A.findings.length ? 'WARN' : 'PASS', findings: A.findings });
  await ctx.close();
}
await browser.close();
finish(7, '신기능', dir, results);
