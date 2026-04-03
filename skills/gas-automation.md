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

## 코드 작성 규칙

### 1. 구조
- CONFIG 객체를 최상단에 분리 (API 키, 웹훅 URL, 시트명 등 한 곳에서 관리)
- 함수는 단일 책임 원칙: 데이터 읽기 / 가공 / 포맷팅 / 전송을 각각 분리
- 테스트 함수를 반드시 포함 (testXxx 형태, 슬랙 전송은 주석처리 상태로)

```
// 표준 구조
const CONFIG = {
  SLACK: { WEBHOOK: "...", CHANNEL: "..." },
  SHEET: { NAME: "...", START_ROW: 2 },
  // ...
};

function main() { ... }        // 메인 실행
function testMain() { ... }    // 테스트 (슬랙 전송 주석처리)
function getData() { ... }     // 데이터 읽기
function formatReport() { ... } // 포맷팅
function sendSlack() { ... }   // 전송
```

### 2. 슬랙 연동
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
      payload: JSON.stringify({ text: message })
    });
    Utilities.sleep(500);
    return response.getResponseCode() === 200;
  } catch (e) {
    Logger.log("슬랙 전송 실패: " + e.message);
    return false;
  }
}
```

### 3. 스프레드시트 데이터 읽기
- getValues()로 전체 범위를 한번에 읽기 (셀 단위 접근 금지 → 속도 저하)
- 날짜 비교 시 Utilities.formatDate()로 문자열 변환 후 비교
- 빈 행 스킵 로직 포함
- 시트명이 틀리면 명확한 에러 메시지 출력

```javascript
function getData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(sheetName);
  if (!ws) throw new Error(`시트 "${sheetName}" 없음`);
  return ws.getDataRange().getValues();
}
```

### 4. 숫자 포맷 (필수 분리)
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

### 5. 트리거 설정
- 시간 기반 트리거: ScriptApp.newTrigger() 사용
- 데이터 미입력 대응: 1시간 간격 재시도 로직
```javascript
function setupDailyTrigger() {
  ScriptApp.newTrigger("main")
    .timeBased()
    .atHour(8).nearMinute(30)
    .everyDays(1)
    .create();
}

// 데이터 미입력 시 재시도
function mainWithRetry() {
  const data = getData(CONFIG.SHEET.NAME);
  if (data.length <= 1) {
    // 1시간 후 재시도 트리거 설정
    ScriptApp.newTrigger("mainWithRetry")
      .timeBased()
      .after(60 * 60 * 1000)
      .create();
    return;
  }
  // 정상 실행
  main();
}
```

### 6. 에러 핸들링
- 모든 메인 함수를 try-catch로 감싸기
- catch에서 Logger.log + 슬랙 에러 알림

### 7. AI API 연동 (뉴스레터 등)
- Gemini API: UrlFetchApp.fetch()로 호출
- 응답 JSON 파싱 시 ```json 펜스 제거 로직 포함
- API 호출 간 12초 sleep (rate limit 대응)
- max_tokens 넉넉하게 설정 (응답 잘림 방지)

## 슬랙 리포트 반환 서식 규칙

GAS로 슬랙에 보내는 리포트 서식은 **sales-report-format 스킬을 참조**한다. 여기서는 GAS 코드 구현 시 추가 규칙만 정의:

- 코드블록(```)으로 표 구현 시 열 간격 최소 2칸 공백, 자릿수 맞춤
- 숫자 나열보다 "So What"이 보이도록: "순매출 300만원" (X) → "순매출 300만원, A/R 54.7% (목표 절반)" (O)
- 급상승/급락은 %만이 아니라 원인 추정도 가능하면 포함
- 주간 리포트는 요일별 패턴(주말↑, 평일↓ 등) 코멘트 추가
- 전체 코드를 한번에 제공 (부분 스니펫 지양)
- 주석처리된 테스트 함수 포함
- CONFIG 영역에 사용자가 수정할 부분 명시
- 코드 실행 검증 후 제공 (✅ 검증 완료 표기)

## clasp 배포 체크리스트

### 배포 전
1. 코드 수정 완료 확인
2. testMain() 함수로 로직 테스트 (슬랙 전송 주석처리 상태)
3. CONFIG 값 확인 (Webhook URL, 시트명 등)

### 배포
1. `clasp push` — 로컬 → GAS 프로젝트 업로드
2. GAS 웹 에디터에서 testMain() 실행하여 동작 확인
3. 슬랙 전송 주석 해제 후 main() 실행하여 실제 전송 테스트

### 배포 후
1. 트리거 설정 확인 (GAS 웹 에디터 → 트리거 메뉴)
2. 다음 날 슬랙 수신 확인

### clasp 명령어 참고
- `clasp push` : 로컬 코드 → GAS 업로드
- `clasp pull` : GAS 코드 → 로컬 다운로드
- `clasp open` : GAS 웹 에디터 열기
- `clasp logs` : 실행 로그 확인

## 트리거 설정 가이드

### 표준 트리거 패턴
- 일일 봇: 매일 9AM KST (오전 9시~10시 사이)
- 주간 봇: 매주 월요일 9AM KST
- 재시도: 데이터 미입력 시 1시간 간격, 최대 3회

### 설정 방법
1. GAS 웹 에디터 → 시계 아이콘 (트리거)
2. "+ 트리거 추가" 클릭
3. 함수: main (또는 해당 메인 함수)
4. 이벤트 소스: 시간 기반
5. 시간 유형: 일별/주별 선택
6. 시간: 오전 9시~10시

### 또는 코드로 설정 (setupTriggers 함수)
GAS 웹 에디터에서 setupTriggers() 함수를 1회 실행하면 자동 등록됨.
⚠️ clasp run은 GCP API 활성화 필요하므로, GAS 웹 에디터에서 직접 실행 권장.
