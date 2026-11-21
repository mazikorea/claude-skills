#!/usr/bin/env node
// 단계 6: 기능 흐름(메뉴·검색·필터·옵션 UI·장바구니·로그인/주문서 '진입'까지). 기본 읽기 전용.
// 사용: node flow_check.mjs --flows flows.json [--base https://mall] [--viewport pc|mobile] [--out dir]
// flows.json: {"base":"https://…","flows":[{"name":"검색","steps":[{"goto":"/product/search.html?keyword=a"},{"expectVisible":"sel"},{"click":"sel"},{"fill":["sel","값"]},{"press":"Enter"},{"expectText":["sel","정규식"]},{"expectUrl":"정규식"},{"expectCount":["sel",1]},{"expectNoText":"정규식"}]}],"allowedWrites":[]}
// 안전장치: GET/HEAD/OPTIONS 외 요청은 전부 차단하고 FAIL(결제·가입·주문 생성 방지). 복제 스킨에서 장바구니 담기처럼 쓰기가 필요하면
//   flows.json 의 allowedWrites(URL 정규식 배열)에 사람이 명시해야만 통과. 결제·가입 완료 류 버튼 클릭은 항상 거부.
import fs from 'node:fs';
import { parseArgs, outDir, mkAdder, show, finish, launch, redact } from './lib.mjs';

const { opt } = parseArgs();
if (!opt.flows || opt.flows === true) { console.error('usage: flow_check.mjs --flows flows.json [--base URL] [--viewport pc|mobile]'); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(opt.flows, 'utf8'));
const base = String(opt.base && opt.base !== true ? opt.base : spec.base || '');
const allowed = (spec.allowedWrites || []).map((r) => new RegExp(r));
const FORBIDDEN = /결제하기|결제 완료|가입하기|회원가입|주문 완료|입금 완료|구매 확정|pay now|place order|sign up/i;
const dir = outDir(opt, 6);
const mobile = opt.viewport === 'mobile';
const browser = await launch();
const results = [];
for (const flow of spec.flows) {
  const A = mkAdder();
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: mobile, locale: 'ko-KR' });
  const blocked = [];
  await ctx.route('**/*', (route) => {
    const m = route.request().method();
    if (['GET', 'HEAD', 'OPTIONS'].includes(m) || allowed.some((r) => r.test(route.request().url()))) return route.continue();
    blocked.push(`${m} ${redact(route.request().url())}`); return route.abort();
  });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  let n = 0;
  for (const st of flow.steps) {
    n++;
    const k = Object.keys(st)[0], v = st[k], tag = `step${n}:${k}`;
    try {
      if (k === 'goto') { const r = await page.goto(new URL(v, base || undefined).href, { waitUntil: 'load', timeout: 30000 }); await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {}); if (r && r.status() >= 400) A.add('FAIL', tag, `${redact(v)} 응답 ${r.status()}`); }
      else if (k === 'click') {
        const loc = page.locator(v).first(); const txt = ((await loc.innerText({ timeout: 4000 }).catch(() => '')) + ' ' + ((await loc.getAttribute('value').catch(() => '')) || '')).trim();
        if (FORBIDDEN.test(txt)) { A.add('FAIL', 'forbidden-click', `${tag} "${txt.slice(0, 30)}" 클릭은 결제·가입 완료 류라 QA에서 거부`); continue; }
        await loc.click({ timeout: 5000 }); await page.waitForLoadState('load', { timeout: 8000 }).catch(() => {});
      }
      else if (k === 'fill') await page.locator(v[0]).first().fill(v[1], { timeout: 5000 });
      else if (k === 'press') { await page.keyboard.press(v); await page.waitForLoadState('load', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(300); }
      else if (k === 'expectVisible') await page.locator(v).first().waitFor({ state: 'visible', timeout: 5000 });
      else if (k === 'expectText') { const t = await page.locator(v[0]).first().innerText({ timeout: 5000 }); if (!new RegExp(v[1]).test(t)) A.add('FAIL', tag, `${v[0]} 텍스트가 /${v[1]}/ 와 불일치: "${t.slice(0, 50)}"`); }
      else if (k === 'expectUrl') { if (!new RegExp(v).test(page.url())) A.add('FAIL', tag, `URL이 /${v}/ 와 불일치: ${redact(page.url())}`); }
      else if (k === 'expectCount') { const c = await page.locator(v[0]).count(); if (c < v[1]) A.add('FAIL', tag, `${v[0]} ${c}개 < 기대 ${v[1]}`); }
      else if (k === 'expectNoText') { const body = await page.locator('body').innerText(); if (new RegExp(v).test(body)) A.add('FAIL', tag, `본문에 /${v}/ 가 존재`); }
      else A.add('WARN', tag, `알 수 없는 스텝 ${k}`);
    } catch (e) { A.add('FAIL', tag, `${JSON.stringify(v).slice(0, 60)} 실패: ${String(e.message).split('\n')[0].slice(0, 100)}`); }
  }
  // 방문 즉시 자동 발사되는 분석 비콘(GA·카페24 로그 등)은 차단은 하되 FAIL이 아닌 WARN. 그 외 POST 등은 FAIL.
  const beacon = /^POST (https?:\/\/([^/]*\.)?(google-analytics\.com|google\.com\/g\/collect|merchant-center-analytics\.goog|cafe24data\.com|facebook\.com\/tr|doubleclick\.net|googletagmanager\.com|analytics\.google\.com|wcs\.naver\.(?:net|com)|js-error-tracer-api\.cafe24\.com|events\d*\.cre\.ma|amazonaws\.com\/production\/events\/collect)|https?:\/\/[^/]+\/(?:shop\d+\/)?api\/member\/LoginSaveid|https?:\/\/[^/]+\/exec\/front\/Member\/JoinCsrf)/i;
  for (const b of blocked) A.add(beacon.test(b) ? 'WARN' : 'FAIL', beacon.test(b) ? 'beacon-blocked' : 'write-blocked', `${beacon.test(b) ? '분석·자동 비콘 POST 차단(정상 방문 시 자동 발생)' : '쓰기 요청 차단됨(결제·가입·주문 방지)'}: ${b}`);
  if (errs.length) A.add('FAIL', 'page-error', `${errs.length}건: ${errs[0].slice(0, 100)}`);
  show(`흐름 "${flow.name}" [${mobile ? 'mobile' : 'pc'}]`, A.findings);
  results.push({ target: flow.name, verdict: A.findings.some((f) => f.level === 'FAIL') ? 'FAIL' : A.findings.length ? 'WARN' : 'PASS', findings: A.findings });
  await ctx.close();
}
await browser.close();
finish(6, '기능 흐름', dir, results);
