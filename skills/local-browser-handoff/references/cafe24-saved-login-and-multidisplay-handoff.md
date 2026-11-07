# Cafe24 saved-login and multi-display handoff

Use when Cafe24 admin is logged out but the user's local Chrome has saved credentials, especially on a multi-monitor Mac.

## Goal

Exhaust agent-owned browser steps before asking the user to log in. The only expected user boundary is Touch ID/macOS authentication, password entry, 2FA, or unfamiliar OAuth consent.

## Workflow

1. Derive the Cafe24 mall ID from the storefront when possible. A storefront script URL may expose it, e.g. `...cid.generate.js?...&u=<mall_id>.1`.
2. Open the admin login in the authenticated local Chrome:
   `https://eclogin.cafe24.com/Shop/?mall_id=<mall_id>`.
3. Verify the matching Chrome tab by title/URL, not by assuming the newly opened tab is frontmost.
4. Read safe DOM state to confirm login fields are empty and determine whether Google/SNS login is present. Do not ask the user to type credentials yet.
5. If Chrome shows the key/password-manager icon, use macOS Accessibility (`System Events`) to open **비밀번호 관리** and inspect saved account labels only. Select the matching mall account through the password-manager UI; do not extract or print the password.
6. Chrome may raise a system authentication sheet: “Google Chrome.app wants to show password / Touch ID or enter password.” This is the true human boundary. Leave it open and ask for exactly one action: Touch ID once. Never click “Use Password,” type the macOS password, or bypass the sheet.
7. After Touch ID, verify both login fields became populated without exposing the password (report only ID label and password length/non-empty state), submit login, then inspect the requested permissions/settings.

## Multi-display diagnostics

- `screencapture -x` may capture only the primary display even when the target Chrome window is on another monitor.
- Use `screencapture -x -D <display_number> <path>` to inspect the target display.
- To locate a Chrome window and its bounds/window number without guessing, query `CGWindowListCopyWindowInfo` from Swift (`import Foundation`, `import CoreGraphics`) and match owner `Google Chrome` plus the window title.
- For exact popover controls, recursive `System Events` Accessibility inspection can return roles, descriptions, positions, and sizes. Prefer AX actions to coordinate clicks where possible.
- If `activate` brings forward the wrong Chrome window, use `AXRaise` on the window whose title matches the target, then verify the correct display/window before clicking.

## Reporting rule

When the user has already said “니가 해 / you do it,” do not bounce the task back with “please log in.” Continue through mall-ID discovery, local-Chrome tab selection, saved-login UI, and page inspection. Stop only at the system-authentication sheet and send a compact message: current state + one physical action + what the agent will continue afterward.

## Safety

- Never expose saved account passwords, password-manager details, or raw cookies.
- Selecting a saved credential through Chrome UI is acceptable; extracting/decrypting the secret is not.
- Touch ID, macOS account password, 2FA, and unfamiliar consent remain user-only boundaries.
