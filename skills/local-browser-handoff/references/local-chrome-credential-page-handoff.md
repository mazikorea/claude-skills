# Local Chrome credential-page handoff

Use this when the user says a service is already logged in on the local Mac and asks the agent to open credential/API setup pages on their screen.

## Rules
- Treat “로그인 다 해줬잖아 / 너가 찾아서 해” as permission to inspect the already-authenticated local Chrome page and continue low-risk navigation/copy-to-local-env work.
- Do not print raw credentials, tokens, customer IDs, or copied table values. Report only `SET/MISSING` and sample `PASS/FAIL`.
- Stop for user input at true security boundaries: password, 2FA, OAuth consent for an unfamiliar app, destructive credential reissue/delete, billing, or account creation.

## React/Meta Business UI click pitfall
- Some Meta Business / Accounts Center React screens expose Korean text in `document.body.innerText` but ignore plain DOM `.click()` on text descendants.
- Actionable rows may be `role="row"` / `role="gridcell"` rather than `button`; inspect with `document.elementFromPoint(x, y)` and climb to the nearest actionable ancestor.
- Try pointer/mouse event dispatch first. If React still ignores synthetic events, use real local GUI coordinates with `cliclick` after activating the exact Chrome tab (`brew install cliclick` if absent).
- After each click, verify by re-reading `document.body.innerText`, checking dialogs, or taking a screenshot; do not infer success from the click command alone.
- If the user specifically asks to notify them after opening screens, include their actual Slack mention in the message, not just “준선님”.

## AppleScript/Chrome patterns
- `open -a 'Google Chrome' <url...>` may not make target tabs easy to verify when many tabs are open. If needed, create a dedicated new Chrome window:
  ```applescript
  tell application "Google Chrome"
    activate
    set w to make new window
    set URL of active tab of w to "https://example.com/first"
    tell w
      make new tab with properties {URL:"https://example.com/second"}
    end tell
  end tell
  ```
- For local Chrome DOM inspection, the reliable syntax is:
  ```applescript
  tell application "Google Chrome"
    tell tab ti of window wi to execute javascript "document.title"
  end tell
  ```
  Avoid `execute javascript ... in active tab of front window`; it can fail with `access not allowed` even when AppleScript JavaScript is enabled.
- When injecting larger JavaScript through AppleScript, write an `.applescript` file or base64-wrap the JS and run `eval(atob(...))` to avoid quoting failures.
- Before declaring a page visible, enumerate windows/tabs and count/identify matching URLs or titles. Do not rely on the active tab only.

## Credential extraction safety
- It is acceptable to parse an authenticated page and write discovered values directly into local `~/.hermes/.env` when the user requested local env storage and forbade Slack/document sharing.
- The script/result should print only booleans like `NAVER_SEARCHAD_API_KEY=SET`, never the values.
- Prefer a two-step flow: extract/write local env silently, then run the product helper’s `status` command plus one sample API call.

## Example: Naver SearchAd API page
- SearchAd API management page pattern: `https://ads.naver.com/manage/ad-accounts/<adAccountNo>/sa/tool/api`.
- If the menu path is unclear, inspect the site bundle/menu text for `SA API 사용 관리` and route path `/sa/tool/api`.
- After API service application, the page may reveal `CUSTOMER_ID`, access license, and secret key. Copy values only into local env; report `SET/MISSING`.
- Do not click reissue/withdraw/delete controls unless the user explicitly asks.