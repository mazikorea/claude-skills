---
name: 29cm-partner-admin-operations
description: "29CM 파트너센터의 상품 조회·수정·검수요청·옵션/재고 운영을 headless-first로 안전하게 수행하는 스킬. 동일 스타일/아더컬러 상품코드 조회, 상품정보 수정 전 preflight, 저장 후 readback에 사용한다."
version: 1.0.0
created_by: agent
metadata:
  hermes:
    tags: [29cm, partner-admin, product-management, headless, readback]
    related_skills: [mazikorea-sales-md, local-browser-handoff]
---

# 29CM Partner Admin Operations

## 언제 쓰나
- 29CM 상품번호·상품명·동일 스타일 아더컬러 조회
- 상품정보, 혼용률, 이미지, 가격, 옵션·재고 수정
- 등록반려 사유 확인, 재검수 요청, 승인 상태 readback
- MAZI/COSSET 29CM 파트너센터 작업 전 대상 범위 확정

## 기본 원칙
1. 기본은 headless/background + 기존 persistent profile 재사용이다.
2. 조회 요청은 read-only로 끝내고, 저장·재검수·상태변경은 사용자의 명시적 실행 지시 후 수행한다.
3. 로그인 비밀번호·OTP·Authorization·쿠키는 메모리 안에서만 사용하고 출력·파일·보고에 남기지 않는다.
4. 변경 전 상품번호·스타일·컬러·브랜드·현재 상태를 대조한다.
5. 변경 후 저장 성공 메시지만 믿지 말고 상품 상세 재조회와 목록 상태 readback을 모두 확인한다.
6. MAZI/COSSET 업무 규칙과 외부 발송·승인 경계는 `mazikorea-sales-md`를 함께 따른다.

## 세션·인증
- 코셋 alias/profile: `musinsa_29cm_cosset`
- 마지 alias/profile: `musinsa_29cm_unified`
- 기존 secure credential 및 fresh email OTP bridge를 우선 사용한다.
- 한 context 안에서 로그인→대상 전체 조회/작업→readback을 끝내 OTP 반복을 피한다.
- 사용자 화면을 띄우는 것은 CAPTCHA·법적 동의·실제 사용자 경계가 있을 때만 한다.

## 상품 조회 preflight
- 상품관리: `https://partner-item.29cm.co.kr/list`
- 특정 코드만 바로 수정하지 말고, 먼저 스타일명으로 동일/유사 상품을 조회한다.
- 검색 결과의 SET/세트, `[MOM]`, 3Color 통합, 키즈/성인, 소재·실루엣 변형은 별도 판매 단위일 수 있으므로 자동 포함하지 않는다.
- 원 요청 코드, 아더컬러 코드, 별도 상품 후보를 분리 보고한다.
- 상세한 읽기 전용 API 조회 패턴은 `references/product-family-code-readonly-lookup.md`를 따른다.

## 수정 작업 표준 순서
1. 사용자 지시에서 스타일별 적용값과 아더컬러 포함 여부를 확정한다.
2. read-only preflight로 전체 대상 코드와 현재 검수 상태를 수집한다.
3. 원본 값과 적용 예정값의 프리뷰를 만든다.
4. 사용자가 이미 명시적으로 실행을 지시한 범위만 저장한다.
5. 스타일·컬러별 상세값을 재조회한다.
6. 등록반려/검수중/승인 상태와 대상 건수를 목록에서 재확인한다.
7. `완료 / 제외 / WARN / 검수상태`만 짧게 보고한다.

## 금지
- 검색 substring 결과를 전부 동일 스타일로 간주하지 않는다.
- 화면 input 값이나 클릭 성공만으로 조회·수정 완료를 선언하지 않는다.
- read-only 확인 요청을 저장·재검수 요청으로 확대하지 않는다.
- 검수중 상품을 중복 제출하거나 승인 상품을 불필요하게 재검수하지 않는다.

## 완료 기준
- 조회: 스타일별 결과 수와 추출 행 수 일치, 코드·상품명·상태 대조, `미수정` 명시
- 수정: 대상 전건 저장 readback, 값 재조회, 검수상태 확인, 누락/중복 0건
