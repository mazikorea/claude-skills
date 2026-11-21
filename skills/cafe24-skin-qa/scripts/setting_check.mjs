#!/usr/bin/env node
// 단계 4c(관리자 설정 간접 확인): 관리자 화면 없이 렌더 결과·응답 헤더로 설정 상태를 추정. 읽기 전용 GET.
// 사용: node setting_check.mjs --url <URL> [--viewport pc|mobile] [--out dir]
// 확인 항목(전부 '추정'이며 관리자 설정값 자체를 읽는 것은 아님):
//   이미지 지연 로딩 적용 정도(loading=lazy / data-src), 이미지 포맷·용량, 압축(gzip/br), 정적 파일 캐시 헤더,
//   혼합 콘텐츠(http:// 자원), SEO 메타(title/description/og:image/canonical/lang), noindex, favicon, viewport meta
// 판정: 혼합 콘텐츠·noindex(운영 주소에서)=FAIL 후보 → 여기선 WARN, 압축·캐시·SEO·지연 로딩 이상=WARN. FAIL 은 페이지 로드 실패뿐. (설정 문제는 사람이 관리자에서 확정)
import { parseArgs, outDir, mkAdder, show, finish, launch, redact } from './lib.mjs';

const { urls, opt } = parseArgs();
if (!urls.length) { console.error('usage: setting_check.mjs --url U [--viewport pc|mobile]'); process.exit(2); }
const dir = outDir(opt, '4c');
const mobile = opt.viewport === 'mobile';
const browser = await launch();
const results = [];
for (const url of urls) {
  const A = mkAdder();
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: mobile, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const resp = [];
  page.on('response', (r) => { const h = r.headers(); resp.push({ url: r.url(), status: r.status(), type: (h['content-type'] || '').split(';')[0], enc: h['content-encoding'] || '', cc: h['cache-control'] || '', size: Number(h['content-length'] || 0), res: r.request().resourceType() }); });
  try { await page.goto(url, { waitUntil: 'load', timeout: 30000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); }
  catch (e) { A.add('FAIL', 'navigation', String(e.message).split('\n')[0]); }
  const origin = new URL(url).origin;
  const d = await page.evaluate(() => {
    const imgs = [...document.images];
    const fold = innerHeight;
    return {
      imgTotal: imgs.length,
      lazyAttr: imgs.filter((i) => i.loading === 'lazy' || i.getAttribute('loading') === 'lazy').length,
      lazyData: imgs.filter((i) => i.dataset.src || i.getAttribute('ec-data-src') || i.dataset.original || /lazy/i.test(i.className)).length,
      below: imgs.filter((i) => i.getBoundingClientRect().top > fold * 1.5).length,
      belowEager: imgs.filter((i) => i.getBoundingClientRect().top > fold * 1.5 && i.loading !== 'lazy' && !i.dataset.src && !i.getAttribute('ec-data-src') && !/lazy/i.test(i.className)).length,
      httpRes: [...document.querySelectorAll('[src],[href][rel=stylesheet]')].map((e) => e.getAttribute('src') || e.getAttribute('href')).filter((u) => /^http:\/\//i.test(u || '')).slice(0, 5),
      title: document.title, desc: document.querySelector('meta[name=description]')?.content || '', ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
      ogTitle: !!document.querySelector('meta[property="og:title"]'), canonical: !!document.querySelector('link[rel=canonical]'), lang: document.documentElement.lang,
      robots: document.querySelector('meta[name=robots]')?.content || '', favicon: !!document.querySelector('link[rel~=icon]'), viewport: !!document.querySelector('meta[name=viewport]'),
    };
  }).catch(() => null);
  if (d) {
    // 지연 로딩
    const lazy = d.lazyAttr + d.lazyData;
    A.add('INFO', 'lazy-status', `이미지 ${d.imgTotal}개 중 지연 로딩 표식 ${lazy}개(loading=lazy ${d.lazyAttr}, data-src류 ${d.lazyData}); 화면 아래 이미지 ${d.below}개 중 즉시 로딩 ${d.belowEager}개`);
    if (d.below >= 6 && d.belowEager / d.below > 0.6) A.add('WARN', 'lazy-off-suspected', `화면 아래 이미지 ${d.below}개 중 ${d.belowEager}개가 즉시 로딩 — 지연 로딩 설정 꺼짐·미적용 의심(관리자 설정 확인)`);
    if (d.httpRes.length) A.add('WARN', 'mixed-content', `http:// 자원 ${d.httpRes.length}건+: ${d.httpRes.map((u) => redact(u)).join(' | ').slice(0, 200)}`);
    if (!d.title) A.add('WARN', 'seo-title', 'title 없음'); if (!d.desc) A.add('WARN', 'seo-description', 'meta description 없음');
    if (!d.ogImage) A.add('WARN', 'seo-og-image', 'og:image 없음(공유 미리보기)'); if (!d.canonical) A.add('WARN', 'seo-canonical', 'canonical 없음');
    if (!d.lang) A.add('WARN', 'html-lang', '<html lang> 없음'); if (!d.favicon) A.add('WARN', 'favicon', 'favicon 링크 없음');
    if (/noindex/i.test(d.robots)) A.add('WARN', 'noindex', `robots meta=${d.robots} — 운영 주소면 검색 제외(미리보기라면 정상)`);
    if (mobile && !d.viewport) A.add('WARN', 'viewport-meta', 'viewport meta 없음');
  }
  // 응답 헤더: 압축·캐시·이미지 포맷
  const mine = resp.filter((r) => r.url.startsWith(origin) && r.status < 400);
  const textual = mine.filter((r) => /html|javascript|css|json|svg/.test(r.type) && r.size > 2048);
  const uncompressed = textual.filter((r) => !r.enc);
  A.add('INFO', 'compression', `같은 도메인 텍스트 ${textual.length}건 중 압축 없음 ${uncompressed.length}건(content-length 기준)`);
  if (uncompressed.length) A.add('WARN', 'no-compression', `압축(gzip/br) 없는 2KB+ 텍스트 ${uncompressed.length}건: ${uncompressed.slice(0, 3).map((r) => redact(r.url).slice(-60)).join(' | ')}`);
  const statics = mine.filter((r) => /(javascript|css|image|font)/.test(r.type) || r.res === 'image');
  const noCache = statics.filter((r) => !r.cc || /no-cache|no-store|max-age=0/i.test(r.cc));
  A.add('INFO', 'cache', `같은 도메인 정적 ${statics.length}건 중 캐시 헤더 없음/no-cache ${noCache.length}건`);
  if (statics.length >= 5 && noCache.length / statics.length > 0.5) A.add('WARN', 'static-no-cache', `정적 파일 ${noCache.length}/${statics.length}건이 캐시 금지·미설정(CDN·브라우저 캐시 설정 확인)`);
  const imgs = resp.filter((r) => r.res === 'image' && r.status < 400);
  const big = imgs.filter((r) => r.size > 300 * 1024);
  const fmt = {}; for (const r of imgs) fmt[r.type || '?'] = (fmt[r.type || '?'] || 0) + 1;
  A.add('INFO', 'image-formats', `이미지 ${imgs.length}건 포맷 ${JSON.stringify(fmt)}, 300KB+ ${big.length}건`);
  if (big.length) A.add('WARN', 'image-heavy', `300KB 초과 이미지 ${big.length}건(예: ${redact(big[0].url).slice(-50)} ${(big[0].size / 1024).toFixed(0)}KB) — 이미지 최적화·리사이즈 설정 확인`);
  if (imgs.length >= 5 && !imgs.some((r) => /webp|avif/.test(r.type))) A.add('WARN', 'no-modern-format', 'webp/avif 이미지 없음(자동 변환 미사용)');
  show(`${redact(url)} [${mobile ? 'mobile' : 'pc'}] 설정 간접 확인`, A.findings);
  const f = A.findings.filter((x) => x.level !== 'INFO');
  results.push({ target: url, viewport: mobile ? 'mobile' : 'pc', verdict: f.some((x) => x.level === 'FAIL') ? 'FAIL' : f.length ? 'WARN' : 'PASS', findings: A.findings });
  await ctx.close();
}
await browser.close();
finish('4c', '설정 간접 확인', dir, results);
