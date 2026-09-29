# Olympic History Data Project

A two-page site exploring 120 years of Olympic athlete and results data: a scrollable report of
findings, and an interactive dashboard for filtering the data directly.

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

## External libraries

Both `index.html` and `dashboard.html` are otherwise plain HTML/CSS/JS. The one exception is the
report page's globe, which loads [D3](https://d3js.org/) and
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
- **Flags** (`js/flags.js`) are drawn directly as colored SVG/CSS bands rather than using Unicode
  flag emoji, since emoji flags depend on the viewer's OS having a color-emoji font and don't
  render reliably inside SVG text across browsers. Coverage is curated, not exhaustive; a country
  without a defined flag shows a neutral placeholder rather than an incorrect one. A few defunct
  entities that appear in the data as their own NOC code get their own historical flag distinct
  from their modern successor's - the Soviet Union (URS) and East Germany (GDR) in particular.
  Chinese Taipei (TPE) is deliberately not mapped to a national flag, since it competes at the
  Olympics under a neutral banner rather than any country's flag. No flag for any Nazi-era German
  NOC entry is drawn or was considered; the "GER" code here spans every German era in one bucket
  (pre-war through today) and always shows modern Germany's flag.
