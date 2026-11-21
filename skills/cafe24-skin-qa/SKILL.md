---
name: cafe24-skin-qa
description: Independent, read-only pre-release QA for Cafe24 skin changes (PC + mobile). Use before any representative-skin switch or live write for COSSET COSSET or MAZI UNTITLED storefront work, when asked to "QA", "전수 점검", "버그 검사", "배포 전 검수" a cloned Cafe24 skin, to diff a modified skin against its original (module / {$variable} / @import paths), or to check rendered pages for console errors, network errors, unreplaced template tokens and missing xans containers. Produces PASS/WARN/FAIL; never releases.
---

# Cafe24 Skin QA (독립 검수)

구현자와 분리된 **읽기 전용** 검수. 대상은 복제 스킨 미리보기와 공개 페이지뿐이다. 이 스킬은 판정만 하고 배포하지 않는다. 설계 정본: `references/steps.md`.

## 규칙

- 구현 세션과 다른 세션(또는 서브에이전트)이 수행한다. 구현자가 자기 작업을 자기 QA로 통과시키지 않는다.
- 쓰기 금지: 관리자·운영 화면, 로그인, 스킨 저장, 대표 디자인 전환, 주문·가입 생성. GET 조회와 로컬 파일 읽기만.
- 라이브 반영은 PASS 후에도 **준선님 승인 1회** 뒤에만(`cafe24-commerce-design`의 승인 게이트). 반영 후 읽기 전용 라이브 스모크, 실패 시 롤백.
- 추측으로 채우지 않는다. 미확인 항목은 `references/step1-hypotheses.md`의 가설 시험으로 실측하고, 못 하면 'MANUAL/미확인'으로 남긴다.
- 판정: **PASS**(0~10단계 전부 통과+실기기 완료) / **WARN**(합의된 한계만, 사유 기록) / **FAIL**(하나라도 실패 → 배포 후보 아님).

## 절차 (요약, 상세·통과 기준은 `references/steps.md`)

0 사전 조건 → 1 가설 시험 → 2 정적 소스 diff → 3 렌더 DOM·콘솔·네트워크 → 4 HTML·접근성 → 5 반응형·브라우저 → 6 기능 흐름 → 7 신기능 전용 → 8 성능 → 9 시각 회귀 → 10 링크 → 11 실기기 → 12 판정·인계.

## 구현된 스크립트 (`scripts/`)

최초 1회(프로젝트 전용, 전역 설치 금지): `cd scripts && npm install && PLAYWRIGHT_BROWSERS_PATH=$PWD/.browsers npx playwright install chromium`

| 단계 | 명령 | 검사 |
|---|---|---|
| 2 | `node scripts/static_diff.mjs --base <원본스킨폴더> --target <수정스킨폴더> [--json out.json]` | 파일 누락, `module="…"` 삭제·개수 감소, `{$변수}` 삭제, `@import`/`@js` 삭제·대상 파일 부재, 미등록 modifier(FAIL), 미등록 module(WARN). registry는 `data/registry.json`(출처·라이선스는 `data/LICENSE.cafe24-smart-design`) |
| 3 | `node scripts/render_check.mjs --url <URL> [--urls 파일] --viewport pc\|mobile\|WxH [--baseline <원본 렌더 결과폴더>] [--ignore 정규식] [--shot] [--out 폴더]` | 렌더 HTML 저장, 화면·속성의 `{$`·`<!--@` 잔존, 콘솔 error·CSP, 동일 도메인 4xx/5xx·요청 실패(외부 도메인은 WARN), jQuery 중복, 모바일 viewport meta, 가로 스크롤, 원본 대비 `xans-*` 컨테이너 누락 |

두 스크립트 모두 종료코드 0=PASS/WARN, 1=FAIL. 원본 스킨의 렌더 결과를 먼저 `--out`으로 저장해 두고, 수정본에 `--baseline`으로 넘긴다(같은 URL·뷰포트일 때 파일명이 맞음). 시험 픽스처: `fixtures/`.

## 아직 스크립트 없음 (단계 4~10)

html-validate·axe-core(렌더 HTML 대상), 반응형·브라우저 매트릭스, 기능 흐름, 신기능 어서션, Lighthouse CI, `toHaveScreenshot`, linkinator는 `references/steps.md`의 기준대로 표준 도구로 수행하고 결과를 같은 판정 체계로 기록한다. 스크립트화는 후속.

## 한계·미확인

`references/limits.md` 필독. 복제 스킨 외부 미리보기 방법·에디터 video 보존·glb/usdz·CSP·jQuery 중복 등은 **미확인**이며 단계 1에서 사람 로그인이 필요할 수 있다.
