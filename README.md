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

_(rows dropped, any recoding, and how rates/ratios/averages are computed will be documented here
as the report is built.)_
