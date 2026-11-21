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

최초 1회(프로젝트 전용, 전역 설치 금지): `cd scripts && npm install && PLAYWRIGHT_BROWSERS_PATH=$PWD/.browsers npx playwright install chromium webkit firefox`
모든 스크립트는 종료코드 0=PASS/WARN, 1=FAIL, 2=사용법 오류이며 `--out` 폴더에 `summary.json`(`{step, verdict, results}`)을 남긴다. 쓰기 요청·로그인은 하지 않는다.

| 단계 | 명령(요지) | 검사 |
|---|---|---|
| 2 | `static_diff.mjs --base <원본> --target <수정> [--json f]` | 파일 누락, `module="…"` 삭제·감소, `{$변수}` 삭제, `@import`/`@js` 삭제·대상 부재, 미등록 modifier(FAIL), 미등록 module(WARN). registry: `data/registry.json` |
| 3 | `render_check.mjs --url U [--urls f] --viewport pc\|mobile [--baseline 폴더] [--ignore re] [--shot]` | 렌더 HTML 저장, `{$`·`<!--@` 잔존, 콘솔 error·CSP, 동일 도메인 4xx/5xx(외부는 WARN), jQuery 중복, viewport meta, 가로 스크롤, 원본 대비 `xans-*` 누락 |
| 4 | `html_a11y.mjs --url U \| --html 파일 [--baseline f] [--save-baseline f]` | 렌더 HTML html-validate(소스는 `{$..}`→x·`<!--@-->` 제거 후), axe-core. 기준선에 없는 오류·critical/serious=FAIL. 기준선은 사람이 판정한 뒤에만 저장 |
| 4b | `design_tokens.mjs --url U --tokens tokens.json [--viewport pc\|mobile]` | 승인된 디자인 토큰(JSON: 폰트·크기·굵기·색·간격·높이·radius, `:root` CSS 변수)과 렌더 computed style 대조. 불일치·선택자 없음=FAIL. 양식 `tokens/tokens.example.json`. 토큰은 Figma 승인값을 사람이 옮겨 적음 |
| 4c | `setting_check.mjs --url U [--viewport pc\|mobile]` | 관리자 설정 간접 확인(추정): 이미지 지연 로딩 적용 정도, 이미지 포맷·용량, 압축, 정적 캐시, 혼합 콘텐츠, SEO 메타, noindex. 전부 WARN 이며 확정은 관리자에서 |
| 5 | `responsive_matrix.mjs --url U [--viewports 390,430,768,1440] [--browsers chromium,webkit,firefox] [--open 셀렉터]` | 가로 스크롤·깨진 이미지·페이지 오류(FAIL), 뷰포트 밖 요소·44px 미만 터치 대상(WARN) |
| 6 | `flow_check.mjs --flows flows.json` | 메뉴·검색·필터·옵션·장바구니·로그인 '진입' 흐름. GET/HEAD 외 요청은 전부 차단+FAIL, 결제·가입 완료 류 클릭 거부. 쓰기는 `allowedWrites`에 사람이 명시해야만(복제 스킨 한정). 템플릿 `flows/cafe24-default.template.json` |
| 7 | `feature_check.mjs --url U [--hover 셀렉터] [--video-budget-mb 5]` | video muted·playsinline·poster·MIME·용량, GIF, 호버 변화·`@media(hover:hover)` 보호, 첫 줄 lazy·이미지 크기 속성, model-viewer·USDZ MIME, reduced-motion |
| 8 | `perf_check.mjs --url U [--runs 3] [--baseline f] [--save-baseline f]` | Lighthouse 중앙값. 기준선 대비 LCP·CLS·전송량 악화=FAIL, 절대 점수 게이트 없음 |
| 9 | `visual_regression.mjs --url U --baseline-dir d [--update] [--mask sel,sel]` | 기준 스크린샷 대비 픽셀 비교(pixelmatch), 차이 이미지 저장. 기준은 승인된 원본에서만 `--update` |
| 10 | `link_check.mjs --url U [--recurse]` | linkinator. 내부 깨진 링크=FAIL, 외부=WARN, `javascript:`·로그인·주문 경로 skip |
| 11·12 | `report.mjs --step2 f … --step10 f [--manual0/1/11 PASS] [--target] [--rollback] [--out md]` | 단계별 결과 종합. FAIL 1개면 FAIL, 0~11 전부 PASS일 때만 PASS, 미실행·MANUAL이면 WARN(미완료). 단계 0·1·11은 사람 확인값을 `--manualN`으로 입력 |

자가 시험: `node scripts/selftest.mjs [--with-perf]` — 로컬 `fixtures/`로 단계 2~12의 PASS/FAIL 재현(기대 exit code 대조). 원본 스킨 렌더를 먼저 `--out`에 저장해 두고 수정본에 `--baseline`으로 넘긴다(같은 URL·뷰포트일 때 파일명이 맞음).

## 통합 실행기 (`scripts/run_all.mjs`) — 수정할 때마다 한 줄

브랜드 설정은 `brands/<brand>.json`(URL 목록·뷰포트·단계 선택·지연, 공개 저장소 제외; 양식 `brands/brand.example.json`), 수정 전 기준선은 `baselines/<brand>/`(공개 저장소 제외).

| 용도 | 명령 |
|---|---|
| 수정 전 기준선 저장(운영 현재 상태) | `node scripts/run_all.mjs --brand cosset --mode baseline` |
| 빠른 모드(단계 2·3·4) | `node scripts/run_all.mjs --brand cosset --mode quick --origin <미리보기 URL> [--base-dir 원본 --target-dir 수정]` |
| 전체 모드(단계 2~10 + 종합 리포트) | `node scripts/run_all.mjs --brand cosset --mode full --origin <미리보기 URL> [--base-dir … --target-dir …]` |

- `--pages home,list` 로 일부만, `--delay ms`(기본 2500) 로 요청 간격 조절. 로그인·쓰기·결제·장바구니 담기 없음.
- 출력은 `run-summary.json`: 단계별 PASS/WARN/FAIL + 이슈마다 `origin = existing(수정 전 기준선에도 있던 문제) | new(이번 수정으로 생긴 문제)`. 종료코드 1은 **신규 FAIL**이 있을 때만. 종합 PASS 판정은 `report.mjs`(full 모드가 `report.md`로 생성) 기준이며 기존 FAIL도 거기엔 남음.
- 기준선은 승인된 원본(현재 라이브)에서만 저장한다. 기준선 재저장 전에는 이전 폴더를 백업.
- 시각 회귀·성능은 같은 맥북·같은 네트워크에서만 비교(OS·엔진이 다르면 폰트·타이밍이 달라 오탐).

## 신규 디자인 도착 시 체크리스트

1. **착수 전**: 구현 세션과 분리된 세션인지 확인 → `baselines/<brand>/meta.json` 날짜 확인(너무 오래됐으면 운영이 바뀐 것이므로 기준선 재저장).
2. **원본 보존**: 원본 스킨 폴더(복제 직전)와 수정 스킨 폴더 위치 확보. 복제 스킨 미리보기 URL 확보(사람 로그인이 필요하면 `references/step1-hypotheses.md` H1 대로 MANUAL).
3. **빠른 모드**: 수정할 때마다 `--mode quick --base-dir --target-dir --origin`. 신규 FAIL 0 이 될 때까지 구현 세션에 되돌림.
4. **신기능 시험(단계 1·7)**: 영상(muted·playsinline·poster·용량)·썸네일 호버·3D(glb/usdz MIME)·모션을 `feature_check` 로. 에디터 video 보존·확장자 업로드·CSP 는 로그인 필요 가설 → `references/step1-hypotheses.md` 목록으로 사람 확인.
5. **전체 모드**: 후보 확정 직전 `--mode full`(+ 단계 6 흐름 파일에 신기능 셀렉터 추가). 신규 FAIL 0, 기존 FAIL 은 "기존" 표시 유지(해결 의무는 별도 합의).
6. **실기기(단계 11)**: iPhone Safari·Android Chrome 실기기 또는 시뮬레이터로 사람 확인 → `report.mjs --manual11 PASS`.
7. **판정·인계**: `report.md` 첨부 + 롤백 대상(원본 스킨명) 기재 → 준선님 승인 게이트(`cafe24-commerce-design`). 반영 후 읽기 전용 라이브 스모크(`--mode quick`, 운영 주소) 1회, 실패 시 롤백.
8. **사후**: 반영이 확정되면 새 운영 상태를 `--mode baseline` 으로 다음 기준선 저장.

## 한계·미확인

`references/limits.md` 필독. 복제 스킨 외부 미리보기 방법·에디터 video 보존·glb/usdz·CSP·jQuery 중복 등은 **미확인**이며 단계 1에서 사람 로그인이 필요할 수 있다.

## 보완 단계 한계 (요약)
- 실제 iOS Safari: 이 Mac 에 Xcode 가 없어 iOS 시뮬레이터 사용 불가(`xcrun simctl` 없음). 단계 5 의 WebKit 은 근사치. 실기기·시뮬레이터 확인은 단계 11 사람 몫.
- 로그인·장바구니 담기·주문서: 공식 테스트 방식 근거 못 찾음. 설계·준비물은 `references/login-flow-design.md`.
