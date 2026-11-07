---
name: cafe24-commerce-design
description: Build, redesign, test, and safely release Cafe24 storefronts through a Figma-first workflow. Use for Cafe24 homepage or skin redesigns, pixel-level UI edits, responsive mobile/desktop work, menu or link fixes, product-list and product-detail improvements, preview/demo requests, skin backup and cloning, pre-release QA, approval-gated deployment, live verification, rollback, and reusable commerce design systems for COSSET COSSET or MAZI UNTITLED.
---

# Cafe24 Commerce Design

Create the editable Figma design first, implement only in a cloned Cafe24 skin, and move to the representative skin only after explicit approval and verification.

## Required workflow

1. Read `references/safety-release-workflow.md` before any Cafe24 write.
2. Read `references/design-system-scope.md` when creating or changing Figma foundations, components, or screens.
3. Establish a project `CURRENT-STATE.md` and `state-ledger.json`. Record objective, exclusions, exact IDs, last known-good state, validations, and next action.
4. Audit the public storefront read-only at mobile and desktop sizes. Separate functional defects from design preferences.
5. Inventory the current Figma file, Cafe24 skin, assets, fonts, categories, modules, and existing work before creating anything. Do not duplicate.
6. Build in this order: tokens and styles, reusable components, mobile screens, desktop screens, interaction states, clickable prototype.
7. Validate every phase with structural readback and rendered screenshots. Fix failures before building on them.
8. Back up HTML/CSS/JS and image assets separately. Clone PC and mobile skins. Implement only in the clone.
9. Test the clone against `references/qa-matrix.md`. Preserve order, payment, login, and Cafe24 modules unless the approved scope explicitly changes them.
10. Show the preview and receive explicit approval before representative-skin switching or any live write.
11. After release, re-read the live site, run smoke tests, and retain the previous skin as rollback.

## Non-negotiable boundaries

- Never edit the representative production skin during design or preview work.
- Never switch representative skin, deploy, delete, pay, publish, or change permissions without preview and explicit user approval.
- The user handles passwords, OTP, CAPTCHA, and genuinely missing permissions.
- A successful command is not completion. Require target readback plus visual or functional verification.
- Do not treat Cafe24 HTML backup as an image backup; preserve image files separately.
- Do not replace Cafe24 checkout, authentication, order, or payment logic with mock behavior.

## Recovery loop

On failure, capture the exact action, target, error, and last known-good state. Diagnose first, apply the smallest correction, retry once with changed conditions, and read the target back. Continue until success or a real user boundary. Never repeat an unchanged failing action. If unresolved, leave a situation report with attempts, evidence, preserved artifacts, and next options.

## Figma execution

Load the applicable official Figma skills before their tools. Use `figma-use` for writes, `figma-generate-library` for variables/components, and `figma-generate-design` for composed screens. Use deterministic names and return every created or mutated node ID. Keep all Figma writes sequential.

## Completion report

Report the Figma link, preview location, changed scope, checks run, PASS/WARN/FAIL result, production status, rollback target, and unresolved items. State clearly whether the live site changed.
