# 동일 스타일·아더컬러 상품코드 읽기 전용 조회

## 관리자 경로와 API
- 상품관리: `https://partner-item.29cm.co.kr/list`
- 목록 API: `POST .../partner-admin/v4/item-manage/paging?size={size}&page={page}&sort={sort}`
- 초기 목록 요청의 URL·POST body·Authorization을 브라우저 메모리에서 캡처하고 body의 `itemName`만 바꿔 같은 세션에서 조회한다.
- Authorization/쿠키/OTP/비밀번호는 로그·파일·응답에 남기지 않는다.

## 안전한 조회 순서
1. 브랜드 alias의 persistent context를 연다.
2. `/list`에 접근하고 필요 시 secure login + fresh email OTP를 처리한다.
3. 첫 목록 로드에서 `item-manage/paging` 요청을 캡처한다.
4. 기존 POST body를 복사해 `itemName`만 스타일명으로 변경하고 같은 endpoint에 조회성 POST한다.
5. 응답 `data.content[]`의 `itemId`, `itemName`, `itemStatusType`, `inspectionStatusType`을 추출한다.
6. 원 요청 상품번호를 빼고 아더컬러 코드만 정리한다.
7. `total_elements`와 추출 행 수를 대조한다.

## React/UI pitfall
- 공지 팝업 이미지가 `검색하기` 클릭을 가로막을 수 있다. 단순 확인 팝업만 닫거나 목록 API로 우회한다.
- `input.fill()` 후 검색을 반복하면 프론트 store의 이전 검색값이 남아 같은 결과가 재표시될 수 있다. 화면 입력값만 믿지 말고 API request body와 결과 상품명·count를 검증한다.
- context 종료 후 SSO가 유지되지 않을 수 있으므로 한 context 안에서 로그인→전체 스타일 조회를 끝낸다. 스타일마다 새 context/OTP를 만들지 않는다.

## 동일 스타일 판정
- substring 검색 결과를 전부 동일 스타일로 간주하지 않는다.
- 예: `TINY TANKIE`의 `TINY TANKIE SET`은 단품과 별도 상품이므로 기본 제외하고 제외 사실을 보고한다.
- `3Color`, `[MOM]`, SET/세트, 키즈/성인, 소재·실루엣 변형은 판매 단위가 다를 수 있어 별도 후보로 표시한다.
- 불확실한 후보는 수정 대상에 자동 포함하지 않는다.

## 상태 매핑
- `ON_STOCK` + `APPROVED` → 판매중·승인
- `REJECTED` + `DECLINED` → 등록반려
- `WAITING_FOR_REVIEW` + `IN_REVIEW` → 등록검수중

## 보고 형식
- 스타일명 아래 `상품코드 — 컬러/상품명`만 압축 표시한다.
- 별도 세트·통합 컬러 상품은 한 줄 주석으로 분리한다.
- 마지막에 다른 컬러 코드 총수, 조회 원천, `상품정보 미수정`을 명시한다.
