# 검사 단계와 통과 기준 (설계 정본)

게이트는 순서대로. 하나라도 FAIL이면 배포 후보가 아니다. 대상은 복제 스킨 미리보기(PC·모바일 둘 다)뿐.

| 단계 | 이름 | 도구 | 통과 기준 |
|---|---|---|---|
| 0 | 사전 조건 | 체크리스트(사람 확인 포함) | 백업 매니페스트 존재(HTML 백업 + 이미지 FTP 별도 보관 — 카페24 HTML 백업은 이미지 제외·7일 보관), 복제 스킨·대표 디자인 식별 기록, 롤백 대상 지정, PC·모바일 대표 설정과 모바일 전용 디자인 사용설정 값 기록 |
| 1 | 가설 시험 | Playwright + 수동 | `step1-hypotheses.md` 항목을 복제 스킨에서 실측해 결과 기록. 사람 로그인이 필요할 수 있음 |
| 2 | 정적 소스 diff | `scripts/static_diff.mjs` (+ html-validate 전처리 후, stylelint, eslint는 후속) | 원본 대비 module 삭제·감소 0, import 삭제·대상 부재 0, 미등록 modifier 0, 파일 누락 0. WARN(신규 module·변수·미등록 module)은 의도 확인 후 사유 기록. 태그 닫힘·중복 id·혼합 콘텐츠(`http://`)·`$count` 과다는 4단계/후속 |
| 3 | 렌더 DOM·콘솔·네트워크 | `scripts/render_check.mjs` | 주요 페이지(홈·목록·상세·검색·장바구니·로그인 진입, PC·모바일)에서 `{$`/`<!--@` 잔존 0, 콘솔 error·CSP 0, 동일 도메인 4xx/5xx 0, jQuery 요청 ≤1, 원본 대비 xans 컨테이너 누락 0 |
| 4 | HTML·접근성 | html-validate(저장된 렌더 HTML) + axe-core | 신규 오류 0(baseline 대비), axe critical·serious 신규 0. 카페24 기본 모듈 유래 위반은 사람이 baseline 등록 |
| 5 | 반응형·브라우저 | Playwright 390·360·1440, chromium·webkit·firefox | 가로 스크롤 0, 잘림·겹침 없음, 터치 대상 44px, 햄버거·팝업·검색 열기/닫기 동작. Playwright WebKit은 실제 iOS Safari 아님 |
| 6 | 기능 흐름 | Playwright | 메뉴 전체 이동, 검색(결과·빈 결과), 필터·정렬, 옵션·수량·장바구니·바로구매 진입, 장바구니 수량·삭제·합계, 로그인·주문서 진입. **결제·가입·주문 생성 금지**(주문서 진입까지) |
| 7 | 신기능 전용 | Playwright + HEAD/ffprobe | 영상 `muted`·`playsinline`·poster·GIF 0·용량 예산, 호버 교체(hover/터치 분기·첫 줄 lazy 금지), 품절·사이즈 배지(품절·재고·옵션 없음), 3D Content-Type·콘솔 0, reduced-motion에서 애니메이션 0 |
| 8 | 성능 | Lighthouse CI(모바일·데스크톱, 3회 중앙값) | 변경 전 대비 LCP·CLS 악화가 합의 임계 이내. 절대 점수 게이트 없음 |
| 9 | 시각 회귀 | Playwright `toHaveScreenshot`(영역·mask) | 의도 영역 외 차이 0, 의도 영역은 승인 시연본과 사람 눈 대조. 맥북 단일 환경 고정 |
| 10 | 링크 | linkinator/lychee(렌더 HTML 로컬 모드) | 내부 링크 깨짐 0, 외부는 경고. `javascript:`·로그인 링크 skip |
| 11 | 실기기 | iOS 시뮬레이터 또는 사람 | iOS Safari에서 영상 자동재생·AR 버튼·스크롤. 자동화 불가분은 FAIL이 아닌 `MANUAL` 표기 |
| 12 | 판정·인계 | 리포트 | SKILL.md 판정 규칙. 리포트에 단계별 결과, 실행 명령, 증거 파일 경로, 알려진 한계, 롤백 대상 기재 |

## 리포트 최소 항목

대상(복제 스킨·URL 목록), 단계별 PASS/WARN/FAIL/MANUAL/미실행, FAIL·WARN 원문(스크립트 출력), 증거 파일(렌더 HTML·스크린샷·JSON 경로), 미확인 한계, 롤백 대상. 단계를 건너뛰었으면 '미실행'과 사유를 적고 PASS로 치지 않는다.
