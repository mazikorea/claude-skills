#!/usr/bin/env node
// 단계 8: 성능·CWV (Lighthouse, 여러 회 중앙값). 절대 점수 게이트 없음 — 변경 전 대비 악화만 판정.
// 사용: node perf_check.mjs --url <URL> [--preset mobile|desktop] [--runs 3] [--baseline base.json] [--save-baseline base.json] [--out dir]
// 판정: 기준선 대비 LCP +25% 그리고 +500ms 이상, CLS +0.05 이상, 전송량 +30% 그리고 +100KB 이상 = FAIL. 기준선 없으면 수치만 기록하고 CWV 'poor'(LCP>4s, CLS>0.25)만 WARN.
// 주의: 서드파티 스크립트로 변동이 큼. 기준선·측정 모두 같은 URL·같은 네트워크에서 같은 runs로.
import fs from 'node:fs';
import { parseArgs, outDir, mkAdder, show, finish, redact, slug } from './lib.mjs';

const { urls, opt } = parseArgs();
if (!urls.length) { console.error('usage: perf_check.mjs --url <URL> [--preset mobile|desktop] [--runs 3] [--baseline f] [--save-baseline f]'); process.exit(2); }
const runs = Number(opt.runs || 3), preset = opt.preset === 'desktop' ? 'desktop' : 'mobile';
const dir = outDir(opt, 8);
const base = opt.baseline && opt.baseline !== true && fs.existsSync(opt.baseline) ? JSON.parse(fs.readFileSync(opt.baseline, 'utf8')) : {};
const saved = {};
const { chromium } = await import('playwright');
const { default: lighthouse, desktopConfig } = await import('lighthouse');
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const results = [];
const port = 9300 + Math.floor(Math.random() * 500);
const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
for (const url of urls) {
  const A = mkAdder(), m = { lcp: [], cls: [], tbt: [], bytes: [] };
  for (let i = 0; i < runs; i++) {
    try {
      const r = await lighthouse(url, { port, output: 'json', logLevel: 'error', onlyCategories: ['performance'] }, preset === 'desktop' ? desktopConfig : undefined);
      const a = r.lhr.audits;
      m.lcp.push(a['largest-contentful-paint'].numericValue); m.cls.push(a['cumulative-layout-shift'].numericValue); m.tbt.push(a['total-blocking-time'].numericValue); m.bytes.push(a['total-byte-weight'].numericValue);
    } catch (e) { A.add('FAIL', 'lighthouse', `실행 ${i + 1} 실패: ${String(e.message).split('\n')[0].slice(0, 120)}`); break; }
  }
  if (m.lcp.length) {
    const cur = { lcp: med(m.lcp), cls: med(m.cls), tbt: med(m.tbt), bytes: med(m.bytes), runs: m.lcp.length };
    const key = `${redact(url)}|${preset}`; saved[key] = cur;
    A.add('INFO', 'metrics', `LCP ${Math.round(cur.lcp)}ms / CLS ${cur.cls.toFixed(3)} / TBT ${Math.round(cur.tbt)}ms / 전송 ${(cur.bytes / 1048576).toFixed(2)}MB (중앙값 ${cur.runs}회, ${preset})`);
    const b = base[key];
    if (b) {
      if (cur.lcp > b.lcp * 1.25 && cur.lcp - b.lcp >= 500) A.add('FAIL', 'lcp-regression', `LCP ${Math.round(b.lcp)}→${Math.round(cur.lcp)}ms`);
      if (cur.cls - b.cls >= 0.05) A.add('FAIL', 'cls-regression', `CLS ${b.cls.toFixed(3)}→${cur.cls.toFixed(3)}`);
      if (cur.bytes > b.bytes * 1.3 && cur.bytes - b.bytes >= 102400) A.add('FAIL', 'bytes-regression', `전송량 ${(b.bytes / 1048576).toFixed(2)}→${(cur.bytes / 1048576).toFixed(2)}MB`);
      if (cur.tbt > b.tbt * 1.5 && cur.tbt - b.tbt >= 200) A.add('WARN', 'tbt-regression', `TBT ${Math.round(b.tbt)}→${Math.round(cur.tbt)}ms`);
    } else A.add('WARN', 'baseline-absent', '기준선 없음 — 변경 전 측정을 --save-baseline 으로 저장해야 악화 판정 가능');
    if (cur.lcp > 4000) A.add('WARN', 'lcp-poor', `LCP > 4s`); if (cur.cls > 0.25) A.add('WARN', 'cls-poor', `CLS > 0.25`);
  }
  const f = A.findings.filter((x) => x.level !== 'INFO');
  show(`${redact(url)} [${preset}]`, A.findings.map((x) => (x.level === 'INFO' ? { ...x, level: 'INFO' } : x)).filter(Boolean));
  results.push({ target: url, verdict: f.some((x) => x.level === 'FAIL') ? 'FAIL' : f.length ? 'WARN' : 'PASS', findings: A.findings });
}
await browser.close();
if (opt['save-baseline'] && opt['save-baseline'] !== true) { fs.writeFileSync(opt['save-baseline'], JSON.stringify({ ...base, ...saved }, null, 1)); console.log(`기준선 저장: ${opt['save-baseline']}`); }
finish(8, '성능', dir, results);
