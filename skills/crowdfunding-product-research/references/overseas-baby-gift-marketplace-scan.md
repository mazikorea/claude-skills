# Overseas baby gift marketplace scan — session note

Use when answering Korean requests like “아기 선물 해외에서 인기 많은 제품 조사해서 이미지나 링크로 보여줘, 왜 인기 있는지도”.

## Useful source pattern

- Amazon search pages with sorting parameters can expose Korean-localized evidence in the accessibility/DOM tree:
  - `s=exact-aware-popularity-rank` → best-seller/popularity ordering.
  - `s=review-rank` → high average-review ordering.
  - Extract fields from result cards: title, rating (`별 5개 중 ...`), review count (`...개 평가`), recent sales (`지난달 구매횟수 ...`), price (`KRW...`), image (`img.s-image.src`), and product/search URL.
- Official brand pages are useful for high-trust products when Amazon data is incomplete:
  - Lovevery Play Kits official page exposed `4.9 star rating`, `21626 Reviews`, age segmentation, price cadence, and product images.
- Google/DuckDuckGo may hit bot checks; use direct known brand/retailer pages or Bing/Amazon/Babylist as alternatives.

## Product examples captured in one session

| Product/category | Evidence observed | Image URL | Why it works as a gift |
|---|---|---|---|
| Lovevery Play Kits | Official page: 4.9 star rating, 21,626 reviews; age-based kits; $80 per 0-12 month kit visible | `https://lovevery.com/_next/image/?url=https%3A%2F%2Fimages.ctfassets.net%2F0sea1vycfyqy%2F1xmrb3hU9QvgRWBoZLjlV4%2Fc24286f5bedba76fd688aff5a06a27d2%2FPkayKits_Phase1_Web.png&w=3840&q=75` | Premium educational/developmental positioning; good for parents who value Montessori-style play. |
| Sophie la Girafe teether | Amazon: 4.7 rating, 20,703 reviews, `지난달 구매횟수 4천 이상` observed | `https://m.media-amazon.com/images/I/71uMCfoaLnL._AC_UL320_.jpg` | Classic overseas baby shower gift; natural-rubber/material story; easy low-risk price point. |
| BabyBjörn Bouncer Bliss | Amazon: 4.8 rating, 4,296 reviews, `지난달 구매횟수 1천 이상` observed | `https://m.media-amazon.com/images/I/61ZVRZCr9BL._AC_UL320_.jpg` | Solves parent pain point by freeing hands; premium practical gift; high price, so good for close relations/joint gifts. |
| Jellycat Bashful Bunny | Amazon: 4.8 rating, `지난달 구매횟수 700 이상` for one variant observed | `https://m.media-amazon.com/images/I/81VeJf19jcL._AC_UL320_.jpg` | Emotional/photogenic plush gift; duplicate-tolerant across colors/sizes; strong brand recognition. |
| Hatch Rest baby sound machine | Amazon: 4.3 rating, 8,902 reviews, `지난달 구매횟수 300 이상` observed | `https://m.media-amazon.com/images/I/51vOkfnRDNL._AC_UL320_.jpg` | Practical sleep-routine/white-noise/night-light product parents use immediately. |
| Muslin swaddle blankets | Amazon baby gifts review-rank page: 4.9 rating and `지난달 구매횟수 6천 이상` observed for one muslin swaddle product | `https://m.media-amazon.com/images/I/81aNn2byC+L._AC_UL320_.jpg` | Low price, high utility, duplicate-tolerant newborn essential. |
| Bright Starts / Lamaze sensory toys | Amazon baby gifts page: Bright Starts item 4.9 rating, 80,697 reviews observed; Lamaze item 4.9 and `지난달 구매횟수 400 이상` observed | Bright Starts: `https://m.media-amazon.com/images/I/81s2ANvlrAL._AC_UL320_.jpg`; Lamaze: `https://m.media-amazon.com/images/I/81mQi7SEttL._AC_UL320_.jpg` | Color/sound/tactile stimulation; budget-friendly and immediately engaging for babies. |
| Stokke Tripp Trapp high chair | Amazon: 4.6 rating, 75 reviews, `지난달 구매횟수 50 이상` observed for one bundle | `https://m.media-amazon.com/images/I/61yIhW3DhbL._AC_UL320_.jpg` | Premium long-use furniture; best framed as joint/close-family gift rather than casual gift. |

## Answer format that worked

- Korean, concise.
- Start with a ranked table: product/category, image/link, popularity evidence, why popular, gift suitability.
- Add budget-tier recommendations and “most fail-safe choices”.
- Include cautions: age range, duplicate risk, overseas shipping/customs/AS, safety/material checks.
- End with `사용자가 지금 할 일`: ask for baby age/month and budget to narrow to 3–5 purchase candidates.
