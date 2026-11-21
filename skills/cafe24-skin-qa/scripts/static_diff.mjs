#!/usr/bin/env node
// 단계 2: 원본 스킨 폴더 대비 대상 스킨 폴더의 module / {$변수} / @import·@js 경로 diff (읽기 전용, 의존성 없음)
// 사용: node static_diff.mjs --base <원본폴더> --target <수정폴더> [--json out.json] [--ext html,htm,xml]
// 종료코드: 0=PASS/WARN, 1=FAIL, 2=사용법 오류
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? true : arr[i + 1]]] : a), []));
if (!args.base || !args.target) {
  console.error('usage: static_diff.mjs --base <dir> --target <dir> [--json out.json] [--ext html,htm]');
  process.exit(2);
}
const exts = String(args.ext || 'html,htm').split(',').map((e) => '.' + e.trim());
const here = path.dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'registry.json'), 'utf8'));
const regMods = new Set(registry.modules), regVars = new Set(registry.variables), regMods13 = new Set(registry.modifiers);

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else out.push(path.relative(base, p));
  }
  return out;
}
const stripComments = (s) => s.replace(/<!--(?!@)[\s\S]*?-->/g, ''); // 일반 주석 제거, <!--@...--> 는 유지

function parse(src) {
  const s = stripComments(src);
  const modules = new Map(), vars = new Map(), imports = [], modifiers = new Set();
  for (const m of s.matchAll(/\bmodule\s*=\s*["']([^"']+)["']/g)) modules.set(m[1], (modules.get(m[1]) || 0) + 1);
  for (const m of s.matchAll(/\{\$([A-Za-z0-9_.\[\]]+)((?:\|[^}]*)?)\}/g)) {
    vars.set(m[1], (vars.get(m[1]) || 0) + 1);
    for (const mod of m[2].split('|').filter(Boolean)) modifiers.add(mod.split(':')[0]);
  }
  for (const m of s.matchAll(/<!--@(import|js)\(\s*([^)]*?)\s*\)\s*-->/g)) imports.push({ kind: m[1], target: m[2].replace(/^["']|["']$/g, '') });
  // 모듈 열림/닫힘 균형(태그 닫힘 전수 검사는 단계 4 html-validate 담당) — 여기선 module 태그 수만 확인
  return { modules, vars, imports, modifiers };
}

const baseFiles = walk(args.base).filter((f) => exts.includes(path.extname(f).toLowerCase()));
const tgtFiles = walk(args.target).filter((f) => exts.includes(path.extname(f).toLowerCase()));
const findings = []; // {level, rule, file, detail}
const add = (level, rule, file, detail) => findings.push({ level, rule, file, detail });

const baseSet = new Set(baseFiles), tgtSet = new Set(tgtFiles);
for (const f of baseFiles) if (!tgtSet.has(f)) add('FAIL', 'file-missing', f, '원본에 있던 파일이 대상에 없음');
for (const f of tgtFiles) if (!baseSet.has(f)) add('WARN', 'file-added', f, '원본에 없던 신규 파일(의도한 추가인지 확인)');

const tgtAll = new Set(walk(args.target)); // 경로 존재 검사용(모든 확장자)
for (const f of tgtFiles) {
  const t = parse(fs.readFileSync(path.join(args.target, f), 'utf8'));
  const b = baseSet.has(f) ? parse(fs.readFileSync(path.join(args.base, f), 'utf8')) : null;
  if (b) {
    for (const [m, n] of b.modules) {
      const tn = t.modules.get(m) || 0;
      if (tn === 0) add('FAIL', 'module-removed', f, `module="${m}" 사라짐(원본 ${n}개)`);
      else if (tn < n) add('FAIL', 'module-count-down', f, `module="${m}" ${n}→${tn}개`);
      else if (tn > n) add('WARN', 'module-count-up', f, `module="${m}" ${n}→${tn}개(중복 사용 확인)`);
    }
    for (const [m] of t.modules) if (!b.modules.has(m)) add('WARN', 'module-added', f, `module="${m}" 신규(원본에 없음)`);
    for (const [v, n] of b.vars) {
      const tn = t.vars.get(v) || 0;
      if (tn === 0) add('WARN', 'var-removed', f, `{$${v}} 사라짐(원본 ${n}개) — 의도한 제거인지 확인`);
    }
    for (const [v] of t.vars) if (!b.vars.has(v)) add(regVars.has(v) ? 'WARN' : 'WARN', 'var-added', f, `{$${v}} 신규${regVars.has(v) ? '' : '(registry 미등록·오류 단정 불가)'}`);
    const bi = new Set(b.imports.map((i) => i.kind + ':' + i.target));
    for (const i of b.imports) if (!t.imports.some((x) => x.kind === i.kind && x.target === i.target)) add('FAIL', 'import-removed', f, `@${i.kind}(${i.target}) 사라짐`);
    for (const i of t.imports) if (!bi.has(i.kind + ':' + i.target)) add('WARN', 'import-added', f, `@${i.kind}(${i.target}) 신규`);
  }
  for (const [m] of t.modules) if (!regMods.has(m)) add('WARN', 'module-unregistered', f, `module="${m}" registry 미등록(오류 단정 불가, 공식 문서로 확인)`);
  for (const mod of t.modifiers) if (!regMods13.has(mod)) add('FAIL', 'modifier-unknown', f, `미등록 modifier "${mod}" (공식 13종 외)`);
  for (const i of t.imports) {
    const dir = path.posix.dirname(f.split(path.sep).join('/'));
    const cands = [i.target, path.posix.join(dir, i.target), i.target.replace(/^\//, '')].map((p) => path.posix.normalize(p));
    if (!cands.some((c) => tgtAll.has(c))) add('FAIL', 'import-target-missing', f, `@${i.kind}(${i.target}) 대상 파일이 대상 폴더에 없음`);
  }
}

const fails = findings.filter((f) => f.level === 'FAIL').length, warns = findings.filter((f) => f.level === 'WARN').length;
const verdict = fails ? 'FAIL' : warns ? 'WARN' : 'PASS';
const result = { step: 2, verdict, summary: { baseFiles: baseFiles.length, targetFiles: tgtFiles.length, fails, warns }, findings };
if (args.json && args.json !== true) fs.writeFileSync(args.json, JSON.stringify(result, null, 2));
for (const f of findings) console.log(`${f.level.padEnd(4)} ${f.rule.padEnd(22)} ${f.file}  ${f.detail}`);
console.log(`\n[단계2 정적 diff] ${verdict}  (FAIL ${fails} / WARN ${warns}, 파일 ${baseFiles.length}→${tgtFiles.length})`);
process.exit(fails ? 1 : 0);
