// 단계 4~12 공통 도우미 (인자 파싱, 브라우저 경로, 결과 출력·요약 저장)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const here = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(here, '.browsers');

export function parseArgs(argv = process.argv.slice(2)) {
  const multi = {}, opt = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2), v = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    if (k === 'url') (multi.url ||= []).push(v); else opt[k] = v;
  }
  if (opt.urls && opt.urls !== true) (multi.url ||= []).push(...fs.readFileSync(opt.urls, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#')));
  return { urls: multi.url || [], opt };
}
export const redact = (u) => String(u).replace(/\?.*$/, '?…'); // 쿼리(토큰 가능) 제거
export const slug = (u) => String(u).replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 100);
export function outDir(opt, step) {
  const d = path.resolve(String(opt.out && opt.out !== true ? opt.out : path.join(here, '..', 'out', `step${step}-${Date.now()}`)));
  fs.mkdirSync(d, { recursive: true });
  return d;
}
export const mkAdder = () => { const f = []; return { findings: f, add: (level, rule, detail) => f.push({ level, rule, detail }) }; };
export const verdictOf = (findings) => (findings.some((f) => f.level === 'FAIL') ? 'FAIL' : findings.some((f) => f.level === 'WARN') ? 'WARN' : 'PASS');
export const worst = (vs) => vs.reduce((a, v) => ({ FAIL: 2, WARN: 1, PASS: 0 }[v] > { FAIL: 2, WARN: 1, PASS: 0 }[a] ? v : a), 'PASS');
export function show(title, findings) {
  console.log(`\n== ${verdictOf(findings)}  ${title}`);
  for (const f of findings) console.log(`  ${f.level.padEnd(4)} ${f.rule.padEnd(22)} ${f.detail}`);
}
export function finish(step, label, dir, results) {
  const overall = worst(results.map((r) => r.verdict));
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify({ step, verdict: overall, results }, null, 2));
  console.log(`\n[단계${step} ${label}] ${overall}  (${results.length}건)  결과폴더: ${dir}`);
  process.exit(overall === 'FAIL' ? 1 : 0);
}
export async function launch(name = 'chromium') {
  const pw = await import('playwright');
  return pw[name].launch();
}
