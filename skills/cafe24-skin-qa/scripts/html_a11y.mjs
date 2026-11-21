#!/usr/bin/env node
// 단계 4: 렌더 HTML(또는 소스 HTML 전처리) html-validate + axe-core 접근성 (읽기 전용)
// 사용: node html_a11y.mjs --url <URL> [--viewport pc|mobile] | --html <파일>  [--baseline base.json] [--save-baseline base.json] [--out dir]
//   --html 은 소스 파일 허용: {$...} 는 'x'로, <!--@...--> 는 제거하는 전처리 후 검사(axe는 URL 모드에서만)
// 기준선(baseline): 카페24 기본 모듈 유래 위반을 사람이 판정해 등록한 목록. 기준선에 없는 html-validate 오류·axe critical/serious=FAIL
import fs from 'node:fs';
import { HtmlValidate } from 'html-validate';
import { parseArgs, outDir, mkAdder, show, finish, launch, redact, slug } from './lib.mjs';

const { urls, opt } = parseArgs();
if (!urls.length && !opt.html) { console.error('usage: html_a11y.mjs --url <URL> | --html <file> [--baseline f] [--save-baseline f]'); process.exit(2); }
const dir = outDir(opt, 4);
const baseline = opt.baseline && opt.baseline !== true && fs.existsSync(opt.baseline) ? new Set(JSON.parse(fs.readFileSync(opt.baseline, 'utf8'))) : new Set();
const seen = new Set();
const hv = new HtmlValidate({ extends: ['html-validate:recommended'], rules: { 'no-trailing-whitespace': 'off', 'void-style': 'off', 'attribute-boolean-style': 'off', 'attribute-empty-style': 'off', 'no-inline-style': 'off', 'prefer-native-element': 'off', 'long-title': 'off', 'wcag/h30': 'off', 'wcag/h32': 'off', 'wcag/h36': 'off', 'wcag/h37': 'off', 'wcag/h63': 'off', 'wcag/h67': 'off', 'element-permitted-content': 'warn', 'doctype-style': 'off' } });
const results = [];
const norm = (t) => String(t ?? '').replace(/\d{4,}/g, '#'); // 로드마다 바뀌는 동적 id(숫자 4자리+)는 기준선 키에서 제외
const kinds = (key, level, rule, detail, A) => { seen.add(key); if (!baseline.has(key)) A.add(level, rule, detail); };

async function validate(html, A) {
  const rep = await hv.validateString(html);
  for (const r of rep.results) for (const m of r.messages) kinds(`hv|${m.ruleId}|${norm(m.message).slice(0, 80)}`, m.severity === 2 ? 'FAIL' : 'WARN', 'html-' + m.ruleId, `L${m.line} ${m.message.slice(0, 120)}`, A);
}
const pre = (s) => s.replace(/<!--@[\s\S]*?-->/g, '').replace(/\{\$[^}]*\}/g, 'x');

if (opt.html) {
  const A = mkAdder();
  await validate(pre(fs.readFileSync(opt.html, 'utf8')), A);
  show(`html-validate ${opt.html}`, A.findings);
  results.push({ target: opt.html, verdict: A.findings.some((f) => f.level === 'FAIL') ? 'FAIL' : A.findings.length ? 'WARN' : 'PASS', findings: A.findings });
}
if (urls.length) {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  const browser = await launch();
  for (const url of urls) {
    const A = mkAdder();
    const mobile = opt.viewport === 'mobile';
    const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, locale: 'ko-KR' });
    const page = await ctx.newPage();
    try { await page.goto(url, { waitUntil: 'load', timeout: 30000 }); await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); } catch (e) { A.add('FAIL', 'navigation', String(e.message).split('\n')[0]); }
    const html = await page.content().catch(() => '');
    fs.writeFileSync(`${dir}/${slug(url)}__${mobile ? 'mobile' : 'pc'}.html`, html);
    await validate(html, A);
    try {
      const ax = await new AxeBuilder({ page }).analyze();
      for (const v of ax.violations) kinds(`ax|${v.id}|${norm(v.nodes[0]?.target?.join(' '))?.slice(0, 80)}`, ['critical', 'serious'].includes(v.impact) ? 'FAIL' : 'WARN', 'axe-' + v.id, `${v.impact} ${v.help} (${v.nodes.length}곳, 예: ${v.nodes[0]?.target?.join(' ')?.slice(0, 60)})`, A);
    } catch (e) { A.add('WARN', 'axe-error', String(e.message).slice(0, 120)); }
    show(`${redact(url)} [${mobile ? 'mobile' : 'pc'}]`, A.findings);
    results.push({ target: url, verdict: A.findings.some((f) => f.level === 'FAIL') ? 'FAIL' : A.findings.length ? 'WARN' : 'PASS', findings: A.findings });
    await ctx.close();
  }
  await browser.close();
}
if (opt['save-baseline'] && opt['save-baseline'] !== true) { fs.writeFileSync(opt['save-baseline'], JSON.stringify([...new Set([...baseline, ...seen])], null, 1)); console.log(`기준선 저장: ${opt['save-baseline']} (${seen.size}건) — 사람이 판정한 뒤에만 사용`); }
finish(4, 'HTML·접근성', dir, results);
