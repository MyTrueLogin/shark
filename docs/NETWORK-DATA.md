# All Locations — network timeline data contract

All Locations builds Status changes, the map timeline, map colours and the leaderboard change chips from one JSON object. Pass it either way:
- render it into `<script type="application/json" id="network-data">` in `all-locations.html`, or
- call `SharkNetwork.setData(data)` at runtime — everything redraws.

```json
{
  "client": "BBJ La Tavola",
  "today": "2026-10-10",
  "stops": [{ "daysAgo": 364, "label": "1 year ago" }, { "daysAgo": 357 }, … { "daysAgo": 7, "label": "1 week ago" }, { "daysAgo": 0, "label": "Today" }],
  "thresholds": { "strong": 80, "average": 50, "weak": 25 },
  "locations": [
    { "name": "Seattle", "state": "WA", "lat": 47.61, "lon": -122.33, "performance": [12, 13, …, 70, 71], "status": [3, 3, …, 1, 1] }
  ]
}
```

- **stops** — standard step is **one week** (e.g. 53 stops: `daysAgo` 364, 357 … 7, 0). Any number of points (2+), any order; sorted oldest → today. Stops that carry a `label` (or `"key": true`) are the named periods: they appear in the "Compare with" selector, Status changes, the card indicators and as captions under the timeline; the rest are weekly ticks you can scrub to. `daysAgo: 0` = today. `label` optional (auto: "1 year ago", "3 months ago", "2 weeks ago", "5 days ago"). Bare numbers work too: `[365, 91, 30, 0]`.
- **performance** — one number 0–100 per stop, same order as `stops`.
- **status** — optional, one per stop: 0 strong, 1 average, 2 weak, 3 sleeping (or the strings). If omitted it is derived from performance via `thresholds`.
- **state** — two-letter US code, colours the map.
- **client** — prefix used to match leaderboard rows ("BBJ La Tavola - Seattle").

## Map timeline period

The timeline is the page's only date widget («Compare with» was removed): the status cards (count at the
end point, change vs the start point), the leaderboard Performance value and change chip, and the trend
modal's default period all follow the selected range.

The timeline has two draggable points — the start and the end of the compared period (any stop to any stop;
with weekly stops the step is one week). Drag a point, click the track (the nearer point jumps there), click a caption,
or focus a point and use the arrow keys. The chips show how many locations improved / declined from start to end;
the map shows the market on the point moved last. Clicking a date in the header opens a date picker for that point
(the date snaps to the nearest stop). Default — the whole range.

## Local market in the location modal

The trend modal has a «Performance | Local market» switch left of the period. «Local market» charts the
position in the local market over the period (with competitors behind and top N%). Clicking the
«#11 of 21 in local market» note in Internal Leaderboard opens the modal straight on «Local market».
Pass the data per location:

```json
{ "name": "Seattle", "market": { "size": 21, "rank": [14, 14, 13, ..., 11] } }
```

`rank` has the same length as `performance` (one value per stop, oldest → today). Without `market`
the current place is read from the leaderboard note («#11 of 21 in local market») and the history is
estimated from Performance (demo only).
