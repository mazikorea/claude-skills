#!/usr/bin/env node
// 단계 10: 링크 검사(linkinator). 같은 도메인(내부) 깨진 링크=FAIL, 외부=WARN. javascript:·로그인·주문 경로는 건너뜀. 읽기 전용 GET.
// 사용: node link_check.mjs --url <URL> [--recurse] [--skip "정규식"] [--out dir]
//   기본은 해당 페이지의 링크만 검사(--recurse 는 같은 도메인 하위 페이지까지, 크롤 범위 주의)
import { LinkChecker } from 'linkinator';
import { parseArgs, outDir, mkAdder, show, finish, redact } from './lib.mjs';

const { urls, opt } = parseArgs();
if (!urls.length) { console.error('usage: link_check.mjs --url <URL> [--recurse] [--skip regex]'); process.exit(2); }
const dir = outDir(opt, 10);
const skip = ['^javascript:', '^mailto:', '^tel:', '^#', '/member/login', '/order/', '/myshop/', '/exec/', '/api/'];
if (opt.skip && opt.skip !== true) skip.push(String(opt.skip));
const results = [];
for (const url of urls) {
  const A = mkAdder(), origin = new URL(url).origin;
  const checker = new LinkChecker();
  const res = await checker.check({ path: url, recurse: !!opt.recurse, timeout: 15000, linksToSkip: skip, concurrency: 8 });
  let ok = 0;
  const seen = new Set();
  for (const l of res.links) {
    if (l.state === 'OK') { ok++; continue; }
    if (l.state === 'SKIPPED') continue;
    const key = l.url; if (seen.has(key)) continue; seen.add(key);
    const internal = (() => { try { return new URL(l.url).origin === origin; } catch { return true; } })();
    A.add(internal ? 'FAIL' : 'WARN', internal ? 'broken-internal' : 'broken-external', `${l.status || l.state} ${redact(l.url).slice(0, 120)} ← ${redact(l.parent || '').slice(0, 60)}`);
  }
  A.add('INFO', 'summary', `검사 ${res.links.length}개 중 OK ${ok}개, 건너뜀 ${res.links.filter((l) => l.state === 'SKIPPED').length}개`);
  const f = A.findings.filter((x) => x.level !== 'INFO');
  show(`${redact(url)}`, A.findings);
  results.push({ target: url, verdict: f.some((x) => x.level === 'FAIL') ? 'FAIL' : f.length ? 'WARN' : 'PASS', findings: A.findings });
}
finish(10, '링크', dir, results);
