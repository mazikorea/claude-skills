---
name: local-browser-handoff
description: Use when a task needs the user's already-logged-in browser session (Cafe24, Meta, Google 등), or when the user wants a page opened/shown on their own screen. Aside 브라우저로만 처리한다(open -a·osascript 사용 금지). macOS only.
---

# Local Browser Handoff (Aside 기준, 2026-11-25 개정)

사용자가 이미 로그인해 둔 브라우저 세션을 재사용하거나, 페이지를 사용자 화면에 띄워야 할 때의 판단 기준과 안전 경계다. 도구는 **Aside 브라우저** 하나로 통일한다. 기본 브라우저·`open`·`open -a`·osascript·Chrome AppleScript는 쓰지 않는다(CLAUDE.md `ASIDE_ONLY_LINK_OPEN_20261125`).

운영 라우팅 상세(채널별 담당 경로, 금지 목록, 측정 결과)는 비공개 문서 `mazi-ops-boundaries/references/browser-routing.md`에 있다. 이 공개 스킬에는 일반 원칙만 둔다.

## 핵심 원리

- Aside는 사용자의 실제 로그인 브라우저를 제어한다. 이미 로그인된 쿠키를 그대로 쓰므로 에이전트 전용 빈 브라우저(Playwright 등)와 달리 로그인 월에 덜 걸린다.
- `openTab`은 백그라운드 탭을 연다(기존 활성 탭을 바꾸지 않는다). 사용자가 "화면에 띄워 달라"고 직접 요청했을 때만 보이는 탭을 연다.
- "페이지를 열었다"와 "사용자가 보고 있다"는 다른 주장이다. 열었다고 보고하기 전에 `listBrowserTabs()`나 `snapshot(page)`로 URL·제목을 다시 확인한다.

## 도구 선택

| 상황 | 도구 |
|---|---|
| 대화·조사처럼 상태를 이어 가는 작업 | `mcp__aside__repl` (변수·탭 상태가 호출 사이에 유지됨) |
| cron·스크립트·원격 실행 | `aside repl [--account <id>] "<코드>"` (호출마다 독립 실행) |
| 공개 페이지의 격리 검사·여러 브라우저 엔진 검사 | Playwright headless |

- `aside exec`(Aside 자체 에이전트)는 쓰지 않는다. 기본 모델이 Claude가 아닐 수 있다.
- 한 번의 호출은 120초 안에 끝나야 한다. 길면 작업을 나눈다.
- 연 탭은 작업이 끝나면 `closeTab`으로 닫는다. 실패해도 닫는다(try/finally).
- Aside가 응답하지 않으면 다른 앱으로 우회하지 말고 `ASIDE_UNAVAILABLE`로 보고하고 URL만 텍스트로 전달한다.

## 언제 쓰나

쓴다:
- 에이전트 브라우저가 로그인 월에 걸렸는데 사용자는 "이미 로그인되어 있다"고 할 때
- 사용자가 특정 페이지를 자기 화면에 띄워 달라고 명시적으로 요청할 때
- 로그인 상태 확인만 필요한 읽기 전용 점검

안 쓴다:
- 로그인 폼이 보이는 화면에서 아이디·비밀번호·OTP를 입력하거나 제출하는 일(사람 경계)
- 별도 격리 컨텍스트로 충분한 일반 크롤링·헤드리스 조회
- 사용자가 다른 작업 중인 탭·창을 방해할 수 있는 조작

## 안전 경계 (절대 규칙)

- 비밀번호·OTP·2FA·계좌 비밀번호·공동인증서·결제·계정 생성/삭제/재발급·낯선 OAuth 동의는 사용자만 처리한다. 에이전트는 입력·제출하지 않는다. 로그인 폼이 보이면 입력 0으로 멈추고 사람 경계로 보고한다.
- 저장 로그인(Vault) 자동 채우기 제안을 클릭하지 않는다.
- 사용자의 현재 작업 탭·창을 덮어쓰거나 방해하지 않는다.
- 비밀값은 화면에서 읽었더라도 Slack·채팅·로그에 원문을 출력하지 않는다(`SET/MISSING`, 길이, 마스킹만).
- `document.cookie`만으로 인증된 요청을 재현하려 하지 않는다. 세션이 필요한 작업은 눈에 보이는 UI 경로를 쓴다.
- 데이터를 바꾸는 조작(동기화, 반영, 삭제 등)은 화면 상태를 보고한 뒤 실행 전에 사용자 승인을 받는다.

## 사용법

사용자에게 URL을 보여줄 때(공통 원칙은 CLAUDE.md `ASIDE_ONLY_LINK_OPEN`):
```bash
~/.local/bin/aside repl "await openTab('https://example.com/path')"
```

현재 탭 확인(열었다고 주장하기 전에 항상 재확인):
```bash
~/.local/bin/aside repl "const t = await listBrowserTabs(); console.log(JSON.stringify(t.map(x=>({active:x.active,url:x.url}))));"
```

페이지 읽기(읽기 전용):
```js
const p = await openTab('https://example.com');
const s = await snapshot(p);
console.log(String(s.tree || s).slice(0, 2000));
await closeTab(p);
```

## 자주 나오는 함정

- "열었다"로 끝내지 말 것. URL·제목을 재확인하고, 사용자가 "안 보인다"고 하면 스크린샷(`page.screenshot()`)까지 확인한다.
- REPL의 "set it active" 출력은 `page` 변수 포인터이고 브라우저 포커스가 아니다.
- 재연결되면 탭 인덱스가 바뀔 수 있다. 탭은 인덱스 대신 `targetId`나 URL로 다시 찾는다.
- 같은 Aside를 여러 작업이 함께 쓴다. 남의 탭을 닫지 말고 내가 연 탭만 닫는다.

## 참조파일 (과거 Chrome AppleScript 방식 — 사용 금지, 판단 사례로만 보존)

- `references/notebooklm-local-chrome-handoff.md` — 에이전트 브라우저 로그인 월 vs 사용자 로그인 세션 구분 사례
- `references/local-chrome-credential-page-handoff.md` — 비밀값 비노출 원칙 사례
- `references/cafe24-saved-login-and-multidisplay-handoff.md` — Touch ID·비밀번호 시트가 뜨면 대신 입력하지 않는 경계 사례
