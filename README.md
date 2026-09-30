# Olympic History Data Project

A two-page site exploring 120 years of Olympic athlete and results data: a scrollable report of
findings (with an interactive globe), and an interactive dashboard for filtering the data
directly. The two pages are cross-linked — click a country on the globe or a bar in the report's
medal leaderboard to jump to the dashboard pre-filtered to that country. Both pages share a manual
dark/light toggle in the nav bar (saved to `localStorage`), on top of following the system theme
by default.

## Live site

_(link added once published with GitHub Pages)_

## Files

| File | What it does |
|---|---|
| `index.html` | The report page: headline numbers, findings, and charts. |
| `dashboard.html` | The interactive dashboard: filters, summary numbers, charts, and a data table. |
| `css/styles.css` | Shared styles for both pages. |
| `js/report.js` | Loads the data and builds the charts on the report page. |
| `js/dashboard.js` | Loads the data, applies filters, and updates the dashboard in the browser. |
| `data/athlete_events.csv` | The dataset (see below). |
| `scripts/analyze.js` | Node script that computes every number used in the report directly from `athlete_events.csv`. Run with `node scripts/analyze.js`. |
| `scripts/findings.json` | Output of `analyze.js` — the numbers behind each report section, in one place for reference. |
| `scripts/dev-server.js` | Tiny local static file server used only for testing (`node scripts/dev-server.js`). Not part of the published site. |
| `js/charts.js` | Small dependency-free SVG chart library (bar, line, dumbbell, scatter, diverging bar) shared by both pages. |
| `js/noc-names.js` | Maps Olympic country codes (NOC) to readable names for the charts. |
| `js/csv.js` | Quoted-CSV parser used by the dashboard to load `athlete_events.csv` directly in the browser. |
| `js/flags.js` | Hand-drawn flag data (colored bands + a simple accent shape) for country/historical-entity chips used throughout both pages. |
| `js/globe.js` | Renders the interactive globe on the report page (D3 orthographic projection): drag to rotate, hover a country for its all-time medal/athlete totals, hover a host-city marker for that Games' top 3 countries. |
| `js/globe-countries.js` | Maps NOC codes to the country name strings used in `data/countries-110m.json`, so the globe can join medal/athlete stats to map shapes. |
| `data/countries-110m.json` | World country boundaries (Natural Earth, 110m resolution, via the `world-atlas` npm package) used to draw the globe. |
| `js/theme.js` | Wires up the manual dark/light toggle in the nav bar (shared by both pages; preference saved to `localStorage`). |

## External libraries

Both `index.html` and `dashboard.html` are otherwise plain HTML/CSS/JS. The one exception is the
report page's globe, which loads [D3](https://d3js.org/),
[d3-geo-projection](https://github.com/d3/d3-geo-projection) (for `geoStitch`, which fixes a
rendering artifact — see below), and
[topojson-client](https://github.com/topojson/topojson-client) from a CDN (jsDelivr) to handle the
map projection and TopoJSON parsing.

## Data source

**120 years of Olympic history: athletes and results**, originally compiled and published by
Randi H. Griffin on Kaggle (scraped from sports-reference.com in May 2018):
https://www.kaggle.com/datasets/heesoo37/120-years-of-olympic-history-athletes-and-results

Downloaded via the public Zenodo mirror:
https://zenodo.org/records/11449966

One row is one athlete's participation in one event at one Olympic Games (Summer or Winter,
1896-2016). Columns: `ID`, `Name`, `Sex`, `Age`, `Height`, `Weight`, `Team`, `NOC`, `Games`,
`Year`, `Season`, `City`, `Sport`, `Event`, `Medal`.

271,116 rows, 15 columns.

## Notes on the data

- **Rows dropped:** none outright. Rows with missing `Age`, `Height`, `Weight`, or `Medal` (coded
  `NA` in the source file) are excluded only from the specific calculation that needs that field,
  not from the dataset as a whole.
- **Medal counts are de-duplicated.** In the raw data, every athlete on a team gets their own row,
  so a single team gold (e.g. a 12-player basketball roster) would count as 12 medals if rows were
  summed directly. All medal counts in this report are de-duplicated to one medal per
  (Games, Event, NOC, Medal) combination, so a team medal counts once for that country.
- **Athlete counts are de-duplicated per Games.** An athlete who competes in multiple events at the
  same Games (e.g. a swimmer in several strokes) has one row per event. Counts of "how many
  athletes competed" and the average-age and gender-share figures count each athlete once per
  Games (by ID), not once per event entry.
- **Host-country bump (finding 4)** uses a curated list of eight Summer Games with a single,
  unambiguous host nation still using the same NOC code today (Seoul 1988, Barcelona 1992, Atlanta
  1996, Sydney 2000, Athens 2004, Beijing 2008, London 2012, Rio 2016). Games hosted by since-split
  or since-renamed nations (e.g. the USSR, West Germany) are excluded to keep the country
  comparison unambiguous. "Host year medals" is compared against that country's average medals
  (de-duplicated, as above) across all its other Summer Games appearances in the dataset.
- **Height and weight by sport (finding 6)** uses Summer Games from 2000-2016 only, so the
  comparison reflects recent athletes rather than averaging across a century of changing body
  types. Sports with fewer than 30 athlete-Games in that window are excluded as too small to be
  representative.
- **Country groupings use the `NOC` column**, not `Team`, since `Team` includes individual club/crew
  names (e.g. "France-1", "France-2" for multi-boat events) while `NOC` is the standardized
  country code used throughout the dataset.
- All numbers are reproducible by running `node scripts/analyze.js`, which reads
  `data/athlete_events.csv` and regenerates `scripts/findings.json` from scratch.
- **Flags** (`js/flags.js`) are drawn directly as colored SVG/CSS bands + a simple accent shape
  (star, cross, canton, crescent, ...) rather than using Unicode flag emoji, since emoji flags
  depend on the viewer's OS having a color-emoji font and don't render reliably inside SVG text
  across browsers. Every entry was checked by hand against its real flag; colors and the general
  layout (stripe direction, canton, cross, etc.) are accurate, though flags with genuinely complex
  geometry (a diagonal saltire, a quartered field, a coat of arms) are necessarily simplified to
  what bands-plus-one-accent-shape can represent - a documented simplification, not a wrong flag.
  Coverage is curated, not exhaustive; a country without a defined flag shows a neutral placeholder
  rather than an incorrect one. A few defunct entities that appear in the data as their own NOC
  code get their own historical flag distinct from their modern successor's - the Soviet Union
  (URS) and East Germany (GDR) in particular. Chinese Taipei (TPE) is deliberately not mapped to a
  national flag, since it competes at the Olympics under a neutral banner rather than any
  country's flag. No flag for any Nazi-era German NOC entry is drawn or was considered; the "GER"
  code here spans every German era in one bucket (pre-war through today) and always shows modern
  Germany's flag.
- **The globe's country fill can develop visual noise while dragging/auto-rotating** if the SVG
  data join's key function doesn't survive `d3.geoStitch` (used to fix antimeridian rendering,
  below) - a broken key means every render adds a fresh duplicate element instead of updating the
  existing one, and the pile-up reads as stray lines once enough duplicates stack up. Fixed by
  keying the join on the country name (stable across geoStitch) instead of the topojson id (not
  reliably preserved by it). Antarctica is also excluded from the globe entirely - no NOC of its
  own, and a common source of polar rendering glitches in an orthographic projection.
- **The dashboard's "Compare two countries" and "Top athletes by country" sections ignore the main
  Country filter** (so you can compare or look up any country regardless of what the main dropdown
  is set to) but respect every other active filter - season, sex, sport, and year range. The main
  country search box and the country dropdown drive the same underlying filter and stay in sync in
  both directions; "Top athletes" has its own independent country search + dropdown pair, wired the
  same way.
- **Top athletes by country** ranks by medal count first (one medal per (Games, Event, Medal) for
  that athlete, so a relay or team event doesn't inflate their total beyond what they actually
  won), takes the top 10, and only then applies whichever column sort is active - so clicking
  "Athlete" to sort alphabetically re-orders the same 10 people rather than changing who's in the
  list. Athletes with zero medals in the current filtered view are excluded rather than padding
  the list out to 10.
- **Every file declares `<meta charset="UTF-8">`** and the dev server sends an explicit
  `charset=utf-8` on every text response. Without it, a literal Unicode character in source (like
  the sort-column ▲/▼ indicators) can render as mojibake if a browser falls back to a legacy
  encoding - this bit us once during development and is worth keeping in place.
