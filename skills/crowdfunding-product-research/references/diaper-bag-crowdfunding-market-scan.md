# Diaper Bag Crowdfunding / Funding-Site Market Scan

Session context: user asked to expand a global best-selling diaper bag scan to Wadiz-like funding sites for 코셋코셋 shoulder, tote, and backpack diaper bags. This note captures durable examples and research heuristics; it is not a complete live ranking.

## Research workflow notes

- For diaper bags, marketplace best sellers and funding projects answer different questions:
  - Amazon/retail best sellers = proven mass-market features and price/value expectations.
  - Wadiz/Makuake/Kickstarter/Indiegogo = feature-led story hooks that can create a launch narrative.
- Wadiz pages may block direct browser access. Search-result pages can still reveal project titles and direct campaign URLs; label these as snippet/search-result evidence unless the campaign page itself is readable.
- Makuake project pages are often readable through text extraction and include rich problem-solution story content and image URLs.
- Kickstarter direct project pages may hit Cloudflare, but discovery/search result excerpts can expose project title, creator, category, and funded percentage.
- Indiegogo pages vary: some project bodies are readable and useful for feature extraction; some slugs return generic explore content or security pages. Use project body only when the title/body matches the intended project.

## Domestic Korea: Wadiz patterns

Observed through Yahoo/Search snippets and direct campaign URLs, not full Wadiz page readback in this session.

| Case | URL | Durable signal | 코셋코셋 implication |
|---|---|---|---|
| Mika Backpack Ver.2 | https://www.wadiz.kr/web/campaign/detail/258874 | “3.2만명 Pick”, “국민기저귀가방”, water-wipes pocket / built-in cooler / stroller hook style claims | Large social-proof headline + functional icons matter. |
| The Better Bag 2nd encore | https://www.wadiz.kr/web/campaign/detail/391697 | “공간분리 특허”, “생수만큼 가벼운” | Korean buyers respond to light weight + patented/structured organization. |
| Unisex mom/dad diaper bag | https://www.wadiz.kr/web/campaign/detail/251746 | “엄마아빠가 함께 쓰는 기저귀가방” | Keep colors and silhouette parent-neutral; include father-use shots. |
| Diaper bag + cooler bag | https://www.wadiz.kr/web/campaign/detail/200137 | “기저귀가방과 보냉가방 두가지 사용성” | Add cooler pouch/insulated pocket and position as picnic/travel capable. |
| Custom divider / no inner-bag | https://www.wadiz.kr/web/campaign/detailPost/389686/news/561563 | “이너백 필요없는 1초 커스텀 수납”, “기저귀가방+보냉백” | Adjustable dividers can be a funding hook; show before/after organization. |
| Portable baby bed + diaper bag | https://www.wadiz.kr/web/campaign/detail/34253 | diaper bag combined with portable baby bed / changing space | Treat as inspiration for fold-out mat/changing station only; avoid unsafe sleep claims unless professionally validated. |
| Daily bag + diaper bag | https://www.wadiz.kr/web/campaign/detail/369977 | “데일리백+기저귀가방”, 3-pocket, cooler-style positioning | Best direction for fashion-led Cosset Cosset tote. |

### Korean funding-site lesson

- Campaign title must combine a category with a clear problem-solver: `기저귀가방 + 보냉백`, `이너백 필요없는`, `공간분리`, `초경량`, `물티슈포켓`, `유모차 고리`.
- Do not rely on “pretty diaper bag” alone. Make the fashion benefit the surface layer and the organization/cooling/changing features the proof layer.
- If launching on Wadiz, build the detailed story around 4–6 real use moments: hospital discharge, stroller walk, cafe, car trunk/back seat, no changing-table restroom, dad finding items.

## Japan: Makuake examples

| Case | URL | Verified/observed detail | 코셋코셋 implication |
|---|---|---|---|
| Large-capacity mothers bag | https://www.makuake.com/project/mothersbag/ | Text body showed 23L capacity, separate nursing/diaper/main pockets, access without taking off backpack, self-standing, laptop/thin pocket, changing sheet accessory, schedule ended 2022-10-29, planned 2023-01 shipping. | Use named zones: nursing pocket / diaper pocket / main pocket / laptop pocket. Show “ask dad for this pocket” scenario. |
| Storage-box mothers bag | https://www.makuake.com/project/kabag_mothers/ | Search result: “moms’ voices”, improved organization / box-style storage. | Boxy/self-standing organizer silhouette can be a funding hook. |
| NEWAY baby-bed transform bag | https://www.makuake.com/project/neway/communication/detail/252699/ | Search result: mothers bag transforms into baby bed. | Use only as inspiration for changing mat/lay-flat utility; do not market as sleep-safe bed without safety validation. |
| Ottoemezzo | https://www.makuake.com/project/ottoemezzo/ | Search result: Italian women’s brand built a high-function bag for Japanese moms. | Imported/fashion-brand origin story can work if paired with localized mom feedback. |
| MOMHUG 4way | https://www.makuake.com/project/momhug/ | Search result: large-capacity 4way bag + baby-carrier use. | Multi-way carry is useful, but carrier integration raises complexity. Keep bag-only first. |

### Makuake lesson

- Makuake pages sell by dramatizing daily friction, then showing a structured solution. Good copy pattern:
  1. Parent has child in arms and cannot get wallet/keys.
  2. Bag is messy and partner cannot find items.
  3. The bag solves it with named pockets and access points.
  4. GIF/detail images prove each use case.
- For 코셋코셋 상세페이지, add situation-first blocks rather than only feature grids.

## Kickstarter / Indiegogo examples

| Case | URL | Observed signal | 코셋코셋 implication |
|---|---|---|---|
| Hie Diaper Bag | https://www.kickstarter.com/projects/kimormsby/hie-diaper-bag-your-new-best-friend | Kickstarter discovery excerpt: ended, 659% funded; “only diaper bag you’ll ever need”. | Strong all-in-one claim works for functional backpack. |
| Peke•Buo Smart Little Diaper Bag | https://www.kickstarter.com/projects/sariahtate/pekebuo-the-smart-little-diaper-bag | Discovery excerpt: ended, 136% funded; compact bag unfolds into changing station with instant access. | Best reference for mini crossbody/sling line with fold-out changing mat. |
| Daddy Bag | https://www.kickstarter.com/projects/1334494512/daddy-bag-thinnest-and-first-minimalist-diaper-bac | Discovery excerpt: ended, 122% funded; “Diaper bag + BackPack = Daddy Bag”. | Make at least one colorway and styling page father-friendly. |
| Elkton Diaper Bag | https://www.kickstarter.com/projects/buffalojackson/the-elkton-diaper-bag-by-buffalo-jackson-trading-c | Discovery excerpt: ended, 114% funded; heritage/leather masculine positioning. | Useful for premium/heritage material mood, not baby-cute design. |
| Ayla Bag + Vacuum | https://www.kickstarter.com/projects/aylabag/ayla-bag-vacuum-helping-parents-with-lifes-messy-moments | Discovery excerpt: ended, 150% funded; diaper bag + small hand-held vacuum. | “messy moments” copy is useful; built-in electronics/AS are not recommended for 코셋코셋. |
| Freshly Picked Diaper Bag | https://www.indiegogo.com/projects/the-diaper-bag-by-freshly-picked | Project body readable: 3-way wear (backpack/cross-body/purse), wipeable interior/exterior, magnetic flap, 10 pockets, premium vegan leather, luxe hardware, metal feet, 13-inch laptop/tablet sleeve. | Most relevant premium fashion/function reference for Cosset Cosset tote/backpack. |
| World’s Smartest Diaper Bag Backpack | https://www.indiegogo.com/projects/world-s-smartest-diaper-bag-backpack | Search snippet: 5-in-1 diaper bag, easy changes without public restrooms. | Use “changing anywhere” promise carefully as convenience, not safety/medical claim. |
| ChangePal Crossbody Diaper Bag | https://www.indiegogo.com/projects/changepal-portable-functional-crossbody-diaper-bag | Search snippet: crossbody diaper bag with easy access to wipes, masks, sanitizer, gloves, essentials. | Strong reference for small shoulder/sling line. |
| Daddy GO Bag | https://www.indiegogo.com/projects/daddy-go-bag | Search snippet: daddy diaper bag with an “Afterlife”. | Include post-baby use case: travel, work, picnic, gym. |

## Product direction for 코셋코셋

### Recommended launch priority

1. Fashion-led diaper tote first.
   - Differentiator: looks like a daily mother’s tote, not a standard baby backpack.
   - Must still show funding-site proof features: cooler pouch, wipes pocket, stroller strap, self-standing base, wipeable lining, named compartments.
2. Functional backpack second.
   - Harder to differentiate because Amazon/Wadiz are crowded, but useful as a volume SKU.
3. Mini shoulder/sling third.
   - Best as a quick-outing companion: diaper 2–3 pcs, wipes, mini changing pad, bottle/tumbler, stroller attachment.

### Copy/feature checklist

- `기저귀가방처럼 보이지 않는 데일리백` as the fashion promise.
- `보냉`, `물티슈`, `기저귀`, `노트북`, `유모차`, `자립`, `방수/닦이는 안감` as proof keywords.
- Use pocket naming instead of only pocket count: `수유 포켓`, `기저귀 포켓`, `엄마 포켓`, `노트북 포켓`, `젖병 보냉 포켓`.
- Show partner usability: “이 포켓만 열면 돼” style copy.
- Add `육아 이후에도 쓰는 가방` to reduce purchase hesitation.

## Risk / QC notes

- Avoid direct safe-sleep or baby-bed claims unless the product has expert safety validation and appropriate warnings. Fold-out changing mat is safer than “bed”.
- Avoid electronics/cleaner-integrated products for first launch because of certification, AS, battery, and defect risk.
- Funding percentages from Kickstarter discovery are valid only as visible discovery evidence. If using in external documents, re-open the project or search result and re-verify.
- Wadiz evidence in this session was search-result/snippet-based due access denial; do not present as full page readback unless independently opened later.
