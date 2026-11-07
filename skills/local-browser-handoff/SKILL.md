---
name: local-browser-handoff
description: Use when a task needs the user's already-logged-in local Chrome session (29CM/Cafe24/Meta/Google 등), or when the user wants a page opened/shown on their own Mac screen. macOS only.
---

# Local Browser Handoff

Claude Code에는 브라우저 자동화 도구(Playwright MCP 등)가 별도로 붙을 수 있지만, 그 브라우저는 **에이전트 전용 세션**이라 사용자의 실제 로그인 쿠키를 갖고 있지 않다. 반면 macOS `osascript`로 사용자의 실제 로컬 Chrome을 조작하면 29CM/Cafe24/Meta/Google 등 **이미 로그인된 세션을 그대로 재사용**할 수 있다. 이 스킬은 그 판단 기준과 안전 경계를 압축 정리한 것이다.

원본(Hermes, 60개+ 참조파일)은 `~/.hermes/skills/productivity/local-browser-handoff/`에 있다. 여기는 핵심만 남긴 압축본이며, 대표 참조파일 3개만 `references/`에 선별 포함했다.

## 핵심 원리

- 에이전트가 제어하는 브라우저(Playwright 등)와 사용자의 눈에 보이는 로컬 Chrome은 **별개의 세션**이다. 하나가 로그인되어 있다고 다른 하나도 로그인된 게 아니다.
- `open -a 'Google Chrome' <url>`은 사용자의 로컬 Chrome에서 그 URL을 연다 — 이미 로그인된 Google/Slack/커머스 어드민 세션을 그대로 쓸 수 있다.
- `osascript`로 Chrome의 AppleScript 딕셔너리를 통해 탭 열기·탭/창 열람·활성 탭 URL·제목 읽기·JS 실행이 가능하다.
- "페이지를 열었다"와 "사용자가 그 페이지를 보고 있다"는 다른 주장이다. `open`/AppleScript 호출이 성공 리턴을 해도, 실제로 맞는 탭이 활성화됐는지 URL/제목으로 반드시 재확인한다. "내 화면에 보여줘" 요청에는 스크린샷(`screencapture`)까지 확인해야 "보인다"고 말할 수 있다.

## 언제 쓰나 (판단 기준)

쓴다:
- 에이전트 브라우저가 로그인 월(login wall)에 걸렸는데 사용자가 "이미 로그인되어 있는데?"라고 말할 때
- 사용자가 특정 페이지를 자기 화면에 띄워달라고 명시적으로 요청할 때
- 커머스/광고 어드민(Cafe24, 29CM, Meta Business, Google Ads 등)처럼 사용자 계정에 이미 로그인돼 있을 가능성이 높은 작업
- 로그인 상태 확인만 필요하고, 클릭/입력 같은 조작은 필요 없는 읽기 전용 상태 점검

안 쓴다 (기본값 유지):
- 별도 자동화 브라우저 컨텍스트로 충분한 일반 크롤링/헤드리스 조회
- 사용자가 지금 다른 작업 중인 탭/창을 방해할 수 있는 상황 — 새 창을 열어 확인하는 쪽을 우선한다
- 비밀번호/OTP/결제/법적 동의처럼 사용자만 할 수 있는 단계 — 이 경우 로컬 Chrome을 열어서 "지금 이 화면에서 이거 눌러주세요"까지만 안내하고 대신 클릭하지 않는다

## 안전 경계 (절대 규칙)

- 비밀번호·OTP·2FA·계좌비밀번호·공동인증서·결제·계정 생성/삭제/재발급·낯선 OAuth 동의는 사용자만 처리한다. 에이전트는 입력·제출하지 않는다.
- 사용자의 현재 작업 탭/창을 덮어쓰거나 방해하지 않는다. 새 창/새 탭을 열어 확인하는 것을 기본으로 한다.
- 비밀값(API 키, 토큰, 비밀번호)은 화면에서 읽었더라도 Slack/채팅/로그에 원문을 출력하지 않는다. `SET/MISSING`, 길이, 마스킹된 앞뒤 몇 글자 정도만 보고한다. 저장이 필요하면 로컬 파일(예: `.env`, `600` 권한)에만 쓴다.
- `document.cookie`만으로 인증된 요청을 재현하려 하지 않는다(HttpOnly 쿠키는 못 읽는다). 세션이 필요한 작업은 눈에 보이는 UI 경로를 그대로 쓰는 게 안전하다.
- 데이터를 바꾸는 조작(동기화, 매칭 반영, 삭제, 상품 수집 등)은 화면 상태를 보고한 뒤 실행 전에 사용자 승인을 받는다.

## Claude Code Bash 도구로 실행하는 법

Claude Code의 Bash 도구는 로컬 macOS 셸이므로 `osascript`를 그대로 실행할 수 있다.

로컬 Chrome에서 URL 열기:
```bash
open -a 'Google Chrome' 'https://example.com/path'
```

활성 탭 URL/제목 확인 (열었다고 주장하기 전에 항상 재확인):
```bash
osascript -e 'tell application "Google Chrome" to get URL of active tab of front window' \
          -e 'tell application "Google Chrome" to get title of active tab of front window'
```

특정 탭에서 안전한 DOM 상태 읽기 — `tab ti of window wi` 형식을 쓴다 (`execute javascript ... in active tab of front window`는 `access not allowed`로 실패할 수 있음):
```applescript
tell application "Google Chrome"
  tell tab 1 of window 1
    execute javascript "document.title"
  end tell
end tell
```

여러 창/탭 중 목표 URL을 찾을 때는 활성 탭만 믿지 말고 전체를 순회한다:
```applescript
tell application "Google Chrome"
  set out to ""
  repeat with w from 1 to count of windows
    repeat with i from 1 to count of tabs of window w
      set t to tab i of window w
      if (URL of t contains "target-domain.com") then
        set out to out & "window " & w & " tab " & i & " title=" & (title of t) & " url=" & (URL of t) & linefeed
      end if
    end repeat
  end repeat
  return out
end tell
```

## 자주 나오는 함정

- "열었다"로 끝내지 말 것. URL/제목을 재확인하고, 사용자가 "안 보인다"고 하면 스크린샷까지 확인한다.
- Chrome AppleScript JS 실행이 꺼져 있으면(`Apple Events의 자바스크립트 실행 기능이 꺼져 있습니다`), 진짜 필요한 경우에만 활성화를 요청하고, 그냥 화면 스크린샷/제목 비교로 대체할 수 있으면 그렇게 한다.
- 탭이 많을 때 `open -a`가 새 탭을 만들었는지 불확실하면, 전용 새 창을 만들어 목표 URL을 지정하는 쪽이 더 안정적이다.

## 참조파일 (선별 3개)

- `references/notebooklm-local-chrome-handoff.md` — 이 스킬을 촉발한 원 사례: 에이전트 브라우저 로그인월 vs 사용자 로컬 Chrome 구분, 창/탭 전체 순회 AppleScript 패턴.
- `references/local-chrome-credential-page-handoff.md` — 인증/API 설정 페이지 핸드오프: 비밀값 비노출 원칙, `tab ti of window wi` 안정 문법, React/Meta UI 클릭 안 먹힐 때의 대응.
- `references/cafe24-saved-login-and-multidisplay-handoff.md` — 안전 경계 적용 예시: Touch ID/비밀번호 시트가 뜨면 절대 대신 입력하지 않고 딱 한 동작만 요청, 멀티모니터에서 특정 디스플레이 스크린샷 촬영.
