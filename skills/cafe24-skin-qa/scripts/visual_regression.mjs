#!/usr/bin/env node
// 단계 9: 시각 회귀 — 기준 스크린샷 대비 픽셀 비교(pixelmatch). 읽기 전용.
// 사용: node visual_regression.mjs --url <URL> --baseline-dir <dir> [--update] [--viewport pc|mobile] [--mask "sel1,sel2"] [--max-diff 0.1] [--full] [--out dir]
//   --update : 기준 이미지 저장(승인된 시안·현재 라이브/원본 스킨에서만). 없으면 비교.
// 판정: 차이 비율 > --max-diff(%, 기본 0.1) = FAIL, 크기 불일치 = FAIL, 기준 없음 = WARN. 차이 이미지는 out 폴더에 저장.
// 비교 이미지는 롤링 배너·재고 숫자 등은 --mask 로 가림. 맥북 단일 환경·같은 뷰포트에서만 비교(OS·엔진이 다르면 폰트 렌더가 달라짐).
// 참고: 설계안은 Playwright toHaveScreenshot 이었으나 테스트러너 없이 단계 스크립트와 같은 구조로 돌리기 위해 pixelmatch 로 직접 비교(Playwright 스크린샷 + mask 사용).
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { parseArgs, outDir, mkAdder, show, finish, launch, redact, slug } from './lib.mjs';

const { urls, opt } = parseArgs();
if (!urls.length || !opt['baseline-dir'] || opt['baseline-dir'] === true) { console.error('usage: visual_regression.mjs --url <URL> --baseline-dir <dir> [--update] [--mask sel,sel] [--max-diff 0.1]'); process.exit(2); }
const bdir = path.resolve(String(opt['baseline-dir'])); fs.mkdirSync(bdir, { recursive: true });
const dir = outDir(opt, 9);
const maxDiff = Number(opt['max-diff'] || 0.1);
const mobile = opt.viewport === 'mobile';
const masks = opt.mask && opt.mask !== true ? String(opt.mask).split(',') : [];
const browser = await launch();
const results = [];
for (const url of urls) {
  const A = mkAdder();
  const name = `${slug(url)}__${mobile ? 'mobile' : 'pc'}.png`;
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: mobile, locale: 'ko-KR', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  try { await page.goto(url, { waitUntil: 'load', timeout: 30000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); await page.addStyleTag({ content: '*{animation:none!important;transition:none!important;caret-color:transparent!important}' }); await page.waitForTimeout(500); } catch (e) { A.add('FAIL', 'navigation', String(e.message).split('\n')[0]); }
  const shot = await page.screenshot({ fullPage: !!opt.full, mask: masks.map((s) => page.locator(s)), maskColor: '#ff00ff' }).catch(() => null);
  const bp = path.join(bdir, name);
  if (!shot) A.add('FAIL', 'screenshot', '스크린샷 실패');
  else if (opt.update) { fs.writeFileSync(bp, shot); A.add('INFO', 'baseline-saved', `기준 저장: ${bp}`); }
  else if (!fs.existsSync(bp)) A.add('WARN', 'baseline-absent', `기준 이미지 없음: ${bp} (--update 로 먼저 저장)`);
  else {
    const a = PNG.sync.read(fs.readFileSync(bp)), b = PNG.sync.read(shot);
    if (a.width !== b.width || a.height !== b.height) A.add('FAIL', 'size-mismatch', `크기 ${a.width}x${a.height} → ${b.width}x${b.height}`);
    else {
      const diff = new PNG({ width: a.width, height: a.height });
      const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
      const ratio = (n / (a.width * a.height)) * 100;
      fs.writeFileSync(path.join(dir, name.replace('.png', '.diff.png')), PNG.sync.write(diff));
      fs.writeFileSync(path.join(dir, name), shot);
      if (ratio > maxDiff) A.add('FAIL', 'visual-diff', `차이 ${ratio.toFixed(3)}% > 허용 ${maxDiff}% (${n}px) — 의도한 변경인지 사람 눈으로 대조: ${path.join(dir, name.replace('.png', '.diff.png'))}`);
      else A.add('INFO', 'visual-same', `차이 ${ratio.toFixed(3)}% ≤ ${maxDiff}%`);
    }
  }
  const f = A.findings.filter((x) => x.level !== 'INFO');
  show(`${redact(url)} [${mobile ? 'mobile' : 'pc'}]`, A.findings);
  results.push({ target: url, verdict: f.some((x) => x.level === 'FAIL') ? 'FAIL' : f.length ? 'WARN' : 'PASS', findings: A.findings });
  await ctx.close();
}
await browser.close();
finish(9, '시각 회귀', dir, results);
