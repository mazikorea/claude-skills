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

# Google Apps Script 자동화 스킬

## 0. 착수 전 판단
1. 기존 Google Workspace API 경로(CLI·MCP·OAuth)로 해결되는지 먼저 확인한다.
2. GAS가 필요한 이유가 단순 API 호출인지, 시간 트리거·권한·시트 UI(메뉴·사이드바) 때문인지 구분한다. 단발 조회·수정이면 GAS를 새로 만들지 않는다.
3. 스크립트 작성 전 입력 시트 구조, 실행 주기, 실패 알림 채널, 쓰기 권한 범위를 고정한다.

## 1. 코드 작성 규칙

### 1-1. 구조
- CONFIG 객체를 최상단에 분리 (시트명, 채널명, 재시도 값 등 한 곳에서 관리)
- 웹훅 URL·API 키 같은 비밀값은 코드에 쓰지 않고 Script Properties에 둔다. CONFIG에는 속성 이름만 둔다 (clasp로 git에 올라가도 노출되지 않게).
- 함수는 단일 책임 원칙: 데이터 읽기 / 가공 / 포맷팅 / 전송을 각각 분리
- 테스트 함수를 반드시 포함 (testXxx 형태, 슬랙 전송은 주석처리 상태로)

```javascript
// 표준 구조
const CONFIG = {
  SLACK: { WEBHOOK_PROP: "SLACK_WEBHOOK_URL" },   // 실제 URL은 Script Properties
  SHEET: { NAME: "Data", START_ROW: 2 },
  RETRY: { MAX: 3, INTERVAL_MS: 60 * 60 * 1000 },
};

function getSecret(key) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw new Error(`Script Property "${key}" 없음`);
  return v;
}

function main() { /* 메인 실행 */ }
function testMain() { /* 테스트 (슬랙 전송 주석처리) */ }
function getData(sheetName) { /* 데이터 읽기 */ }
function formatReport(rows) { /* 포맷팅 */ }
function sendSlack(webhookUrl, message) { /* 전송 */ }
```

### 1-2. 슬랙 연동
- Slack Incoming Webhook 사용
- 메시지 포맷: 코드블록(```)으로 표 구현 → 고정폭 정렬
- 메시지 길이 제한: 4,000자 이내 (초과 시 분할 전송)
- rate limit 대응: Utilities.sleep(500) 삽입
- 에러 발생 시 에러 메시지를 슬랙으로 전송 (빈 메시지/무응답 방지)

```javascript
function sendSlack(webhookUrl, message) {
  try {
    const response = UrlFetchApp.fetch(webhookUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ text: message }),
    });
    Utilities.sleep(500);
    return response.getResponseCode() === 200;
  } catch (e) {
    Logger.log("슬랙 전송 실패: " + e.message);
    return false;
  }
}
```

### 1-3. 스프레드시트 데이터 읽기·쓰기
- getValues()로 전체 범위를 한번에 읽기 (셀 단위 접근 금지 → 속도 저하). 쓰기도 setValues()로 한번에.
- 날짜 비교 시 Utilities.formatDate()로 문자열 변환 후 비교
- 빈 행 스킵 로직 포함
- 시트명이 틀리면 명확한 에러 메시지 출력
- 사용자 입력값이 수식으로 실행될 수 있으면(`=`, `+`, `-`, `@`로 시작) 원문 그대로 텍스트로 쓰는 것을 기본으로 한다 (앞에 `'`를 붙이거나 대상 셀 서식을 `@`로 지정).

```javascript
function getData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);
  if (!ws) throw new Error(`시트 "${sheetName}" 없음`);
  return ws.getDataRange().getValues();
}
```

### 1-4. 숫자 포맷 (필수 분리)
```javascript
function formatNumber(num) {
  if (num === null || num === undefined || num === "") return "-";
  return Number(num).toLocaleString("ko-KR");
}

function formatPercent(num, digits = 1) {
  if (num === null || num === undefined || num === "") return "-";
  return (Number(num) * 100).toFixed(digits) + "%";
}

function formatWon(num) {
  return formatNumber(num) + "원";
}
```

### 1-5. 트리거 설정 + 데이터 미입력 재시도
- 시간 기반 트리거: ScriptApp.newTrigger() 사용. 시간대는 appsscript.json `timeZone: "Asia/Seoul"` 확인.
- 데이터 미입력 시 1시간 간격 재시도, 최대 3회. 재시도 횟수는 Script Properties로 세고, 실행이 끝난 1회성 트리거는 삭제한다(트리거 누적 → 프로젝트당 트리거 한도 초과 방지).

```javascript
function setupDailyTrigger() {            // GAS 웹 에디터에서 1회 실행
  ScriptApp.newTrigger("mainWithRetry")
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
}

function mainWithRetry() {
  const props = PropertiesService.getScriptProperties();
  const data = getData(CONFIG.SHEET.NAME);
  if (data.length > 1) {                  // 헤더 외 데이터 있음 → 정상 실행
    props.deleteProperty("RETRY_COUNT");
    main();
    return;
  }
  const n = Number(props.getProperty("RETRY_COUNT") || 0);
  if (n >= CONFIG.RETRY.MAX) {
    props.deleteProperty("RETRY_COUNT");
    sendSlack(getSecret(CONFIG.SLACK.WEBHOOK_PROP),
      `[오류] 데이터 미입력: ${CONFIG.RETRY.MAX}회 재시도 후 중단`);
    return;
  }
  props.setProperty("RETRY_COUNT", String(n + 1));
  ScriptApp.newTrigger("retryMain")
    .timeBased()
    .after(CONFIG.RETRY.INTERVAL_MS)
    .create();
}

function retryMain() {                    // 1회성 재시도 트리거 진입점
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === "retryMain")
    .forEach((t) => ScriptApp.deleteTrigger(t));
  mainWithRetry();
}
```

### 1-6. 에러 핸들링
- 모든 메인 함수를 try-catch로 감싸기
- catch에서 Logger.log + 슬랙 에러 알림

### 1-7. LLM API 연동 (뉴스레터 등)
- UrlFetchApp.fetch()로 호출 (Gemini·Claude 등 사용 중인 제공자). API 키는 Script Properties.
- 응답 JSON 파싱 시 ```json 펜스 제거 로직 포함
- 호출 간 sleep은 제공자·요금제의 분당 한도에 맞춘다 (예: 분당 5회 한도면 12초)
- 최대 출력 토큰은 넉넉하게 설정 (응답 잘림 방지)

## 2. 슬랙 리포트 반환 서식 규칙

GAS로 슬랙에 보내는 리포트 서식은 **sales-report-format 스킬을 참조**한다. 여기서는 GAS 코드 구현 시 추가 규칙만 정의:

- 코드블록(```)으로 표 구현 시 열 간격 최소 2칸 공백, 자릿수 맞춤
- 숫자 나열보다 "So What"이 보이도록: "순매출 300만원" (X) → "순매출 300만원, A/R 54.7% (목표 절반)" (O)
- 급상승/급락은 %만이 아니라 원인 추정도 가능하면 포함
- 주간 리포트는 요일별 패턴(주말↑, 평일↓ 등) 코멘트 추가
- 전체 코드를 한번에 제공 (부분 스니펫 지양)
- 주석처리된 테스트 함수 포함
- CONFIG 영역에 사용자가 수정할 부분 명시
- 코드 실행 검증 후 제공 (✅ 검증 완료 표기)

## 3. 안전 경계
- 대량 메일·Slack 발송은 draft/preview 후 승인 전 발송 금지. 테스트 중에도 실제 채널로 나가는 호출은 하지 않는다(테스트 채널 또는 주석처리).
- 시트 쓰기 자동화는 대상 범위와 rollback 방법(백업 탭·변경 전 값 보관)을 먼저 명시한다.
- 회사 구성원에게 나가는 새 알림·발송 경로를 만들 때는 기존 발송 경로 규칙(mazi-ops-boundaries)을 먼저 확인한다.

## 4. clasp 배포 체크리스트

### 배포 전
1. 코드 수정 완료 확인 + 문법 검사(로컬 `node --check` 등) 또는 로직 시뮬레이션
2. testMain() 함수로 로직 테스트 (슬랙 전송 주석처리 상태)
3. CONFIG 값·Script Properties 확인 (웹훅 속성, 시트명 등)

### 배포
1. `clasp push` — 로컬 → GAS 프로젝트 업로드
2. GAS 웹 에디터에서 testMain() 실행하여 동작 확인
3. 실제 전송 테스트는 테스트 채널로 하거나, 운영 채널이면 승인 후 main() 실행

### 배포 후
1. 트리거 설정 확인 (GAS 웹 에디터 → 트리거 메뉴)
2. 첫 정기 실행 후 슬랙 수신·실행 로그 확인
3. 보고: 실행 로그, 변경 행 수, readback 범위

### clasp 명령어 참고
- `clasp push` : 로컬 코드 → GAS 업로드
- `clasp pull` : GAS 코드 → 로컬 다운로드
- `clasp open` : GAS 웹 에디터 열기
- `clasp logs` : 실행 로그 확인

## 5. 트리거 설정 가이드

### 표준 트리거 패턴
- 일일 봇: 매일 9AM KST (오전 9시~10시 사이)
- 주간 봇: 매주 월요일 9AM KST
- 재시도: 데이터 미입력 시 1시간 간격, 최대 3회 (§1-5)

### 설정 방법 (UI)
1. GAS 웹 에디터 → 시계 아이콘 (트리거)
2. "+ 트리거 추가" 클릭
3. 함수: mainWithRetry (또는 해당 메인 함수)
4. 이벤트 소스: 시간 기반
5. 시간 유형: 일별/주별 선택
6. 시간: 오전 9시~10시

### 또는 코드로 설정 (setupDailyTrigger 함수)
GAS 웹 에디터에서 setup 함수를 1회 실행하면 자동 등록됨. 중복 등록을 막으려면 실행 전 트리거 목록을 확인한다.
⚠️ clasp run은 GCP API 활성화 필요하므로, GAS 웹 에디터에서 직접 실행 권장.
