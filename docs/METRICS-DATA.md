# Metrics — daily table data contract

`metrics.html` renders the «Daily Metrics» table from `<script type="application/json" id="metrics-data">`
(demo data: `design/metrics-demo.json`).

```json
{
  "period":    { "first": "2026-09-01", "last": "2026-10-08" },
  "snapshots": { "first": "2026-09-11", "last": "2026-10-01" },
  "profiles": [
    {
      "name": "BBJ La Tavola - Seattle", "is_client": true, "url": "single-location.html",
      "reviews": 11, "rating": 5, "services": 0, "service_details": 0, "service_media": 0,
      "service_categories": 0, "attributes": 3, "profile_score": 50, "posts": 0, "last_review_age": 30,
      "daily": { "reviews": { "2026-09-11": 10, "2026-09-12": 11 } }
    }
  ]
}
```

- **period** — the day columns of the table (one column per calendar day; the last day is highlighted).
- **profiles[].<metric>** — current value, shown in the «Total» column. `null` = no data.
- **profiles[].daily[metric]** — optional per-day values (`date → value`). Without it the current value is shown on
  every day inside `snapshots`.
- Cell colour = change against the previous filled day (green = better, red = worse; for `last_review_age` lower is better).
- Metric keys: `reviews`, `rating`, `services`, `service_details`, `service_media` (Products), `service_categories`,
  `attributes`, `profile_score`, `posts`, `last_review_age`.
