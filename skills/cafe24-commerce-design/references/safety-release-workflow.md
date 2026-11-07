# Safety and release workflow

## Stages and approval gates

| Stage | Allowed actions | Exit evidence | Approval needed |
|---|---|---|---|
| Discovery | Public audit, source read, inventory | issue list, source map | No |
| Figma demo | Tokens, components, screens, prototype | screenshots, node readback | No |
| Implementation | Backup and cloned-skin edits only | clone preview and diff | Login/OTP only if required |
| Pre-release QA | Responsive and flow tests on clone | QA matrix PASS or documented WARN | No |
| Release | Switch representative skin | explicit user approval | Yes |
| Live verification | Read-only smoke tests and screenshots | live PASS | No |
| Rollback | Restore previous representative skin | failure evidence and user direction, unless immediate safety restoration was pre-authorized | Yes |

## Backup manifest

Record timestamp, mall ID, PC skin ID, mobile skin ID, representative status, exported HTML/CSS/JS path, image backup path, and checksum or file count. Keep the previous representative skin unchanged until live verification passes.

## Preview contract

The preview must use the cloned skin and real Cafe24 modules/data where safe. Label mocked content. Include URLs for homepage, product list, product detail, search, cart, login entry, and collection page.

## Release contract

Before asking for approval, show the clone preview, change summary, QA result, known limitations, release action, and rollback target. After approval, switch once, verify live, and stop further live changes if verification fails.

## Situation report

Include objective, last known-good state, failed target/action, exact error, distinct recovery attempts, what was ruled out, preserved artifacts, user boundary if any, and safest next options.
