# QA matrix

## Required viewport coverage

- 390px and 430px mobile
- 768px tablet
- 1440px desktop
- Chrome and Safari for the final clone check

## Visual checks

- No clipped or overlapping text, images, menus, popups, or controls.
- Long Korean and English product names wrap or truncate intentionally.
- Touch targets are at least 44x44px.
- Focus states are visible; color is not the only status signal.
- Text and UI contrast meet WCAG AA where applicable.
- Brand fonts, colors, spacing, and images match approved Figma values.

## Functional checks

- Homepage hero and CTA links.
- All top-level and nested navigation destinations.
- Search open, query, result, empty result, and close.
- Category filters and sorting.
- Product options, quantity, add to cart, buy-now entry.
- Cart quantity, delete, totals, login and checkout entry.
- Popup open, close, persistence, and edge fit.
- Sold-out, sale, unavailable option, empty category, and error states.

## Release result

- PASS: no critical issue; safe to request release approval.
- WARN: usable with explicitly accepted limitation.
- FAIL: do not release or keep live; fix or roll back.
