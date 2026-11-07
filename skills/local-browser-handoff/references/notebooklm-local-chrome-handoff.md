# NotebookLM local Chrome handoff pattern

## Situation

A NotebookLM URL opened in the agent-attached browser showed a Google login wall. The user pointed out that they were already logged in locally and later could not see the agent browser window.

## Durable lesson

For authenticated Google/merchant/admin pages, the user's local Chrome session may already have the required cookies. The agent browser is separate and may be invisible to the user. Switch to local Chrome when the user expects to use their own logged-in browser.

## Useful probes

Open in visible/local Chrome:

```bash
open -a 'Google Chrome' 'https://notebooklm.google.com/notebook/<id>?pli=1'
```

Verify active local Chrome tab:

```bash
osascript -e 'tell application "Google Chrome" to get URL of active tab of front window' \
          -e 'tell application "Google Chrome" to get title of active tab of front window'
```

Enumerate windows and active tabs when `open` does not appear to bring the expected page forward:

```applescript
tell application "Google Chrome"
  set out to ""
  repeat with w from 1 to count of windows
    set ti to active tab index of window w
    set t to active tab of window w
    set out to out & "window " & w & " activeTab=" & ti & " title=" & (title of t) & " url=" & (URL of t) & linefeed
  end repeat
  return out
end tell
```

Find target NotebookLM tabs:

```applescript
tell application "Google Chrome"
  set out to ""
  repeat with w from 1 to count of windows
    repeat with i from 1 to count of tabs of window w
      set t to tab i of window w
      if (URL of t contains "notebooklm") or (title of t contains "Notebook") then
        set out to out & "window " & w & " tab " & i & " title=" & (title of t) & " url=" & (URL of t) & linefeed
      end if
    end repeat
  end repeat
  return out
end tell
```

Read text from a verified target tab:

```applescript
tell application "Google Chrome"
  repeat with w from 1 to count of windows
    repeat with i from 1 to count of tabs of window w
      set t to tab i of window w
      if (URL of t contains "notebooklm.google.com/notebook/") then
        set active tab index of window w to i
        return execute t javascript "document.body.innerText"
      end if
    end repeat
  end repeat
  return "NOT_FOUND"
end tell
```

## Reporting pattern

Bad:
- "I opened it" after `browser_navigate` only.
- "Please log in" when the user is already logged in locally.

Good:
- "The first browser was the agent session, not your visible Chrome. I opened the URL in your local Chrome and verified the tab title is `<title>`."
