---
name: gas-automation
description: |
  Google Apps Script(GAS) 코드를 작성, 수정, 디버깅할 때 사용하는 스킬.
  이 스킬은 다음 상황에서 반드시 트리거한다:
  - "GAS", "구글 앱스 스크립트", "Google Apps Script" 언급 시
  - "슬랙 봇", "슬랙으로 보내", "슬랙 자동화" 관련 요청 시
  - "스프레드시트 자동화", "시트에서 데이터 읽어서", "트리거 설정" 요청 시
  - "뉴스레터 자동화", "리포트 자동 발송" 관련 작업 시
  - 기존 GAS 코드의 버그 수정, 기능 추가 요청 시
  GAS, 스프레드시트 자동화, 슬랙 연동 관련 키워드가 나오면 이 스킬을 적용할 것.
---
# GAS Automation

## Trigger
GAS, Google Apps Script, 슬랙봇, 스프레드시트 자동화, Gmail/Calendar/Drive 자동화.

## Workflow
1. 기존 Google Workspace MCP 또는 gws/OAuth 사용 가능 여부를 먼저 확인한다.
2. GAS가 필요한 이유가 단순 API 호출인지, 트리거/권한/사용자 UI 때문인지 구분한다.
3. 스크립트 작성 전 입력 Sheet 구조, 실행 주기, 실패 알림 채널, 쓰기 권한 범위를 고정한다.
4. 코드 제공 전 문법 검사 또는 로컬 시뮬레이션을 수행한다.

## Guardrails
- 대량 메일/Slack 발송은 draft/preview 후 승인 전 발송 금지.
- Sheet 쓰기 자동화는 대상 범위와 rollback 방법을 먼저 명시한다.
- 사용자 제공 값이 수식으로 실행될 수 있으면 RAW 입력을 기본값으로 쓴다.

## Verification
- 최소 1회 dry-run 또는 제한 범위 실행.
- 실행 로그, 변경 row 수, readback 범위를 보고한다.
