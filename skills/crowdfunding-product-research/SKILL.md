---
name: crowdfunding-product-research
description: Research overseas crowdfunding products and translate them into actionable product/merchandising ideas, especially for baby/kids apparel, accessories, and lifestyle goods.
tags:
  - crowdfunding
  - product-research
  - merchandising
  - baby-products
  - market-research
---

# Crowdfunding Product Research

Use this skill when the user asks to investigate overseas Tumblbug-like platforms (Kickstarter, Indiegogo, etc.), **overseas consumer-marketplace popularity**, or **domestic Korean baby/kids gift-market examples** for product ideas, gift recommendations, funding cases, example links/images, or ideas that can be adapted to a brand such as 코셋코셋/MAZI KOREA.

## Output standard for this user

1. Respond in Korean unless explicitly asked otherwise.
2. Lead with a short ranked recommendation table, not a long narrative.
3. Include concrete example links and image URLs where available.
4. Separate: `펀딩 사례`, `핵심 포인트`, `브랜드 접목 방향`, `주의/리스크`, `확신도`.
5. End with `사용자가 지금 할 일` and a small decision prompt for the next action.
6. Avoid overstating trend certainty. Mark facts as verified only when grounded in page/search output.

## Research workflow

### Domestic Korea baby-gift workflow

Use this path when the user asks for “국내에서도 선물로 유명한 제품”, Korean 출산선물/백일선물/돌선물 examples, or domestic brand benchmarks.

1. Prioritize evidence from Korean surfaces: Naver Search/Shopping snippets, official brand malls, Kakao Gift, SSG/Galleria/Lotte/Kurly/Gmarket/Coupang listings, and mom-cafe/blog snippets.
2. Rank by domestic gift suitability, not novelty:
   - `출산 기본`: 배냇저고리, 내의, 손싸개/발싸개, 모자 sets.
   - `사진/기념`: 우주복, 바디수트, 백일룩/돌룩, 보넷/헤어밴드.
   - `실사용`: 손수건, 천기저귀, 목욕타월, 턱받이, 블랭킷, 파우치.
   - `귀여운 add-on`: 애착인형, 딸랑이, 치발기/쪽쪽이 클립.
3. Treat familiar composition + polished gift packaging + low failure risk as the core Korean market lesson. Domestic gift buyers often need a set that is immediately understandable more than a novel feature.
4. For 코셋코셋, recommend soft-goods gift boxes before high-certification products:
   - 출산선물 4/6종 박스.
   - 백일/돌 촬영룩 세트.
   - 손수건+블랭킷 실용 세트.
   - Matching-pattern pouches/bibs/socks as add-ons.
5. Include official or retail links and image URLs when available, but do not overclaim “국민템” unless the evidence is visible. Prefer “검색/쇼핑/블로그에서 출산선물로 반복 노출”.

### Marketplace / gift-popularity workflow

Use this path when the user asks for “해외에서 인기 많은 아기 선물/제품” rather than crowdfunding cases.

1. Triangulate across at least two source types when possible:
   - Marketplace evidence: Amazon Best Sellers/search sorted by `베스트셀러`, `평균 고객 리뷰`, or visible “지난달 구매횟수”.
   - Brand/official evidence: official product page review counts, ratings, age ranges, material/safety claims.
   - Registry/editorial evidence: Babylist or similar baby-registry guides, if accessible.
2. Extract compact evidence per product: product name, rating, review count, recent purchase count, price if visible, link, and image URL.
   - Browser DOM extraction pattern on Amazon result pages: gather `h2` title, `별 5개 중 ...`, `...개 평가`, `지난달 구매횟수 ...`, `KRW...`, `h2 a.href`, and `img.s-image.src`.
   - Keep Amazon links as search links if individual product URLs are missing or region/session-dependent.
3. Rank by gift suitability, not raw sales alone:
   - `실패 확률 낮음`: Jellycat-style plush, Sophie la Girafe, muslin swaddles, burp cloths.
   - `부모 실사용`: Hatch Rest, BabyBjörn Bouncer, diapering/feeding essentials.
   - `프리미엄/공동선물`: Stokke Tripp Trapp, premium bouncers, high chairs.
4. Explain popularity in practical terms: parent pain point solved, gift presentation, brand trust, safety/material story, age range, and whether duplicates are acceptable.
5. Include image links directly when requested; do not only describe products.
6. End with a budget/month-age narrowing prompt so the next step can produce final purchase candidates.

### Crowdfunding / product-idea workflow

1. Identify the target category and brand fit.
   - For 코셋코셋: prioritize baby/kids apparel, sleepwear, swaddles, blankets, gift sets, accessories, and low-certification-risk soft goods.
   - Treat electronics, car seats, baby carriers, medical/safety products, and weighted infant sleep products as higher-risk.

2. Search across multiple surfaces.
   - Kickstarter pages may be blocked by Cloudflare in browser or direct requests. If blocked, use search-result discovery via DuckDuckGo Lite/HTML and cite the Kickstarter URL only if found.
   - Indiegogo search often works better interactively through the browser search box than by URL query parameters.
   - Use project pages and search result snippets as evidence; do not invent funding totals.

3. Capture visual evidence.
   - Use `browser_get_images` on accessible project pages or search result pages to extract image URLs.
   - Prefer product/gallery/rich-text images over site logos or unrelated recommended-content images.
   - If the page has multiple images with blank alt text, keep the URL and describe only what is visible/confirmed from context.

4. Extract product-adaptation logic.
   - For each case, map `what worked in funding` → `what can be safely copied/adapted` → `what should be avoided`.
   - For baby/kids products, explicitly assess certification, safety, claims, and manufacturing complexity.

5. Verify and qualify claims.
   - Funding amount/backer count: only quote if visible on the project page or reliable search result.
   - Safety/regulatory concerns: cite authoritative sources where possible (e.g., CPSC/NASA/official project pages), and keep wording conservative.
   - If a project page is only a preview/upcoming page, say so and avoid calling it a successful funding case.

## Common adaptation patterns

- `4-season sleep sack / sleeping bag` → seasonal sleep vest/sleepwear line, detachable liner, diaper-change snaps, daycare nap positioning.
- `smart/temperature-regulating swaddle or blanket` → premium swaddle/blanket gift set; use claims only with material test evidence.
- `baby carrier campaigns` → avoid carrier body unless certified; adapt accessories such as drool pads, pacifier clips, teether straps, rain/winter covers, pouches.
- `eco baby subscription boxes` → curated newborn/100-day/first-birthday gift boxes.
- `smart baby monitors/temperature devices` → use as content/partnership inspiration, not direct apparel development unless electronics certification is planned.

## Pitfalls

- Do not recommend weighted infant sleep products as a product direction. Mention that market interest existed, but safety/regulatory concern makes it unsuitable unless professionally validated.
- Do not treat crowdfunding popularity as proof of Korean market demand; present it as an idea signal needing local validation.
- Do not omit images when the user explicitly asks for examples/images; provide image URLs or say if accessible images could not be extracted.
- Do not spend the response on tool limitations. If Kickstarter blocks access, use search/discovery workarounds and report the usable findings.

## References

- See `references/baby-kids-crowdfunding-cossetcosset.md` for a condensed case bank from a session on baby/kids apparel, accessories, and gift-set ideas for 코셋코셋.
- See `references/diaper-bag-crowdfunding-market-scan.md` for Wadiz/Makuake/Kickstarter/Indiegogo diaper-bag funding examples, feature hooks, evidence caveats, and 코셋코셋 tote/backpack/sling productization guidance.
- See `references/overseas-baby-gift-marketplace-scan.md` for a concise marketplace/official-page evidence bank and answer format for overseas popular baby gift recommendations with links/images.
- See `references/korea-baby-gift-market-scan.md` for domestic Korean 출산/백일/돌 gift-market categories, example brands/links, and 코셋코셋 gift-box productization guidance.
