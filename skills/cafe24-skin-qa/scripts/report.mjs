#!/usr/bin/env node
// 단계 11~12: 판정·인계 리포트 생성기. 각 단계 결과(summary.json 또는 static_diff --json 파일)를 모아 PASS/WARN/FAIL 종합.
// 사용: node report.mjs --step2 <json> --step3 <summary.json> ... --step10 <summary.json> [--manual0 PASS --manual1 WARN --manual11 PASS] [--target "복제 스킨 식별(비밀정보 금지)"] [--rollback "롤백 대상"] [--note "한계·합의 사유"] [--out report.md]
//   단계 0(사전 조건)·1(가설 시험)·11(실기기)은 사람이 확인한 값을 --manualN PASS|WARN|FAIL|MANUAL 로 넘김. 안 넘기면 '미실행'.
// 종합: FAIL 1개라도 → FAIL / 0~11 전부 PASS 일 때만 PASS / 그 외(미실행·MANUAL·WARN) → WARN(미완료). 종료코드 1=FAIL.
// 이 리포트가 PASS여도 라이브 반영은 운영 책임자 승인 후 1회, 반영 후 읽기 전용 라이브 스모크, 실패 시 롤백.
import fs from 'node:fs';
import { parseArgs, here } from './lib.mjs';

const { opt } = parseArgs();
const names = { 0: '사전 조건(백업·롤백 기록)', 1: '가설 시험(스테이징 실측)', 2: '정적 소스 diff', 3: '렌더 DOM·콘솔·네트워크', 4: 'HTML·접근성', '4b': '디자인 충실도(토큰)', '4c': '관리자 설정 간접 확인', 5: '반응형·브라우저', 6: '기능 흐름', 7: '신기능 전용', 8: '성능·CWV', 9: '시각 회귀', 10: '링크', 11: '실기기 최종', 12: '판정·인계' };
const rows = [];
for (const n of [0, 1, 2, 3, 4, '4b', '4c', 5, 6, 7, 8, 9, 10, 11]) {
  if (typeof n === 'string' && !opt['step' + n] && !opt['manual' + n]) continue; // 선택 단계: 입력 있을 때만 포함
  let verdict = '미실행', detail = '', findings = [];
  const p = opt['step' + n], man = opt['manual' + n];
  if (p && p !== true) {
    if (!fs.existsSync(p)) { verdict = 'FAIL'; detail = `결과 파일 없음: ${p}`; }
    else {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      verdict = j.verdict || '미실행'; detail = p;
      findings = j.findings || (j.results || []).flatMap((r) => (r.findings || []).map((f) => ({ ...f, detail: `[${(r.target || r.url || '').toString().slice(0, 60)}${r.viewport ? ' ' + r.viewport : ''}] ${f.detail}` })));
    }
  } else if (man && man !== true) { verdict = String(man).toUpperCase(); detail = '사람 확인'; }
  rows.push({ n, name: names[n], verdict, detail, findings: findings.filter((f) => f.level === 'FAIL' || f.level === 'WARN') });
}
const any = (v) => rows.some((r) => r.verdict === v);
const overall = any('FAIL') ? 'FAIL' : rows.every((r) => r.verdict === 'PASS') ? 'PASS' : 'WARN';
const incomplete = rows.filter((r) => ['미실행', 'MANUAL'].includes(r.verdict)).map((r) => r.n);
const md = [];
md.push(`# Cafe24 스킨 QA 리포트`, '', `- 종합 판정: **${overall}**${overall === 'WARN' && incomplete.length ? ` (미완료 단계: ${incomplete.join(', ')})` : ''}`, `- 대상: ${opt.target && opt.target !== true ? opt.target : '(미기재)'}`, `- 생성: ${new Date().toISOString()}`, `- 롤백 대상: ${opt.rollback && opt.rollback !== true ? opt.rollback : '(미기재 — 0단계 기록 필요)'}`, '');
md.push('| 단계 | 이름 | 판정 | 증거 |', '|---|---|---|---|');
for (const r of rows) md.push(`| ${r.n} | ${r.name} | ${r.verdict} | ${r.detail || '-'} |`);
md.push('| 12 | 판정·인계 | ' + overall + ' | 이 리포트 |', '');
for (const r of rows.filter((x) => x.findings.length)) {
  md.push(`## 단계 ${r.n} ${r.name} — FAIL/WARN 원문`);
  for (const f of r.findings.slice(0, 15)) md.push(`- ${f.level} ${f.rule}: ${f.detail}`);
  if (r.findings.length > 15) md.push(`- … 외 ${r.findings.length - 15}건 (증거 파일 참조)`);
  md.push('');
}
if (opt.note && opt.note !== true) md.push('## 합의된 한계·사유', String(opt.note), '');
md.push('## 알려진 한계', '`references/limits.md` 참조. 단계 1 가설 시험 미확인 항목은 확정 전까지 구현 가정으로 쓰지 않음.', '', '## 인계', overall === 'PASS' ? '- 배포 후보. **라이브 반영은 운영 책임자 승인 후 1회만.** 반영 후 읽기 전용 라이브 스모크, 실패 시 롤백.' : overall === 'WARN' ? '- 미완료 단계 또는 합의 필요한 WARN이 남아 있음. 사유를 기록하고 운영 책임자 판단을 받은 뒤에만 승인 요청.' : '- **배포 후보 아님.** FAIL 해소 후 재검수.', '');
const text = md.join('\n');
const out = opt.out && opt.out !== true ? opt.out : null;
if (out) fs.writeFileSync(out, text);
console.log(text);
console.log(`\n[단계12 종합] ${overall}${out ? '  리포트: ' + out : ''}`);
process.exit(overall === 'FAIL' ? 1 : 0);
