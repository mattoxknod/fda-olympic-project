// Computes every number used in the report from data/athlete_events.csv.
// Run with: node scripts/analyze.js
// Prints a JSON blob of results to stdout and writes scripts/findings.json.

const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "..", "data", "athlete_events.csv");

function parseCSV(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

console.error("Reading CSV...");
const text = fs.readFileSync(CSV_PATH, "utf8");
const rows = parseCSV(text);
const header = rows[0];
const idx = Object.fromEntries(header.map((h, i) => [h, i]));
const data = rows.slice(1).map((r) => ({
  ID: r[idx.ID],
  Name: r[idx.Name],
  Sex: r[idx.Sex],
  Age: r[idx.Age] === "NA" ? null : Number(r[idx.Age]),
  Height: r[idx.Height] === "NA" ? null : Number(r[idx.Height]),
  Weight: r[idx.Weight] === "NA" ? null : Number(r[idx.Weight]),
  Team: r[idx.Team],
  NOC: r[idx.NOC],
  Games: r[idx.Games],
  Year: Number(r[idx.Year]),
  Season: r[idx.Season],
  City: r[idx.City],
  Sport: r[idx.Sport],
  Event: r[idx.Event],
  Medal: r[idx.Medal] === "NA" ? null : r[idx.Medal],
}));
console.error(`Parsed ${data.length} rows`);

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// --- Headline numbers ---
const uniqueAthleteGames = new Set(data.map((d) => d.ID + "|" + d.Games));
const uniqueAthletes = new Set(data.map((d) => d.ID));
const countries = new Set(data.map((d) => d.NOC));
const games = new Set(data.map((d) => d.Games));

// Deduplicated medal table: one medal per (Games, Event, NOC, Medal) so a
// team event (e.g. basketball, 12 athletes) counts as ONE medal for the
// country, not twelve. This is the standard correction for this dataset.
const medalRowsSeen = new Set();
const medalRecords = [];
for (const d of data) {
  if (!d.Medal) continue;
  const key = `${d.Games}|${d.Event}|${d.NOC}|${d.Medal}`;
  if (medalRowsSeen.has(key)) continue;
  medalRowsSeen.add(key);
  medalRecords.push({
    Games: d.Games,
    Year: d.Year,
    Season: d.Season,
    Event: d.Event,
    NOC: d.NOC,
    Medal: d.Medal,
  });
}

const headline = {
  totalAthleteEvents: data.length,
  uniqueAthletes: uniqueAthletes.size,
  countries: countries.size,
  gamesCount: games.size,
  totalMedalsAwarded: medalRecords.length,
};

// --- Finding 1: all-time medal leaderboard ---
function topCountriesByMedals(records, topN) {
  const counts = {};
  for (const m of records) counts[m.NOC] = (counts[m.NOC] || 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([NOC, total]) => ({ NOC, total }));
}
const finding1_leaderboard = topCountriesByMedals(medalRecords, 15);

// --- Finding 2: medal trend over time for the top 6 countries ---
const top6 = finding1_leaderboard.slice(0, 6).map((d) => d.NOC);
const byYearCountry = {};
for (const m of medalRecords) {
  if (!top6.includes(m.NOC)) continue;
  const key = `${m.NOC}|${m.Year}`;
  byYearCountry[key] = (byYearCountry[key] || 0) + 1;
}
const finding2_trend = Object.entries(byYearCountry)
  .map(([key, count]) => {
    const [NOC, Year] = key.split("|");
    return { NOC, Year: Number(Year), medals: count };
  })
  .sort((a, b) => a.Year - b.Year || a.NOC.localeCompare(b.NOC));

// --- Finding 3: Summer vs Winter concentration ---
function seasonConcentration(season) {
  const recs = medalRecords.filter((m) => m.Season === season);
  const counts = {};
  for (const m of recs) counts[m.NOC] = (counts[m.NOC] || 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = recs.length;
  const top10Total = sorted.slice(0, 10).reduce((a, [, c]) => a + c, 0);
  return {
    season,
    totalMedals: total,
    countriesWithMedals: sorted.length,
    top10ShareOfMedals: total ? top10Total / total : 0,
    top10: sorted.slice(0, 10).map(([NOC, count]) => ({ NOC, count })),
  };
}
const finding3_concentration = {
  summer: seasonConcentration("Summer"),
  winter: seasonConcentration("Winter"),
};

// --- Finding 4: host-country bump ---
// Curated list of unambiguous single-country Summer host years within this
// dataset's range (1896-2016), chosen to avoid split/defunct nations
// (e.g. USSR, West/East Germany, Yugoslavia).
const hostCases = [
  { NOC: "KOR", hostYear: 1988, city: "Seoul" },
  { NOC: "ESP", hostYear: 1992, city: "Barcelona" },
  { NOC: "USA", hostYear: 1996, city: "Atlanta" },
  { NOC: "AUS", hostYear: 2000, city: "Sydney" },
  { NOC: "GRE", hostYear: 2004, city: "Athens" },
  { NOC: "CHN", hostYear: 2008, city: "Beijing" },
  { NOC: "GBR", hostYear: 2012, city: "London" },
  { NOC: "BRA", hostYear: 2016, city: "Rio de Janeiro" },
];
function medalsForCountrySummer(noc) {
  const byYear = {};
  for (const m of medalRecords) {
    if (m.NOC !== noc || m.Season !== "Summer") continue;
    byYear[m.Year] = (byYear[m.Year] || 0) + 1;
  }
  return byYear;
}
const finding4_hostBump = hostCases.map(({ NOC, hostYear, city }) => {
  const byYear = medalsForCountrySummer(NOC);
  const hostMedals = byYear[hostYear] || 0;
  const otherYears = Object.entries(byYear)
    .filter(([y]) => Number(y) !== hostYear)
    .map(([, c]) => c);
  const avgOtherYears = otherYears.length ? mean(otherYears) : 0;
  return {
    NOC,
    city,
    hostYear,
    hostMedals,
    avgOtherYears: Math.round(avgOtherYears * 10) / 10,
    pctChange: avgOtherYears
      ? Math.round(((hostMedals - avgOtherYears) / avgOtherYears) * 1000) / 10
      : null,
    yearsOfData: otherYears.length,
  };
});

// --- Finding 5: average age over time ---
const ageByAthleteGame = new Map();
for (const d of data) {
  if (d.Age == null) continue;
  const key = d.ID + "|" + d.Games;
  if (!ageByAthleteGame.has(key)) ageByAthleteGame.set(key, { Year: d.Year, Season: d.Season, Age: d.Age });
}
const ageByYear = {};
for (const { Year, Age } of ageByAthleteGame.values()) {
  if (!ageByYear[Year]) ageByYear[Year] = [];
  ageByYear[Year].push(Age);
}
const finding5_ageTrend = Object.entries(ageByYear)
  .map(([Year, ages]) => ({
    Year: Number(Year),
    avgAge: Math.round(mean(ages) * 100) / 100,
    n: ages.length,
  }))
  .sort((a, b) => a.Year - b.Year);

// --- Finding 6: height & weight by sport, Summer Games 2000-2016 ---
const hwSeen = new Set();
const hwBySport = {};
for (const d of data) {
  if (d.Season !== "Summer" || d.Year < 2000) continue;
  if (d.Height == null || d.Weight == null) continue;
  const dedupeKey = `${d.ID}|${d.Sport}|${d.Games}`;
  if (hwSeen.has(dedupeKey)) continue;
  hwSeen.add(dedupeKey);
  if (!hwBySport[d.Sport]) hwBySport[d.Sport] = { heights: [], weights: [] };
  hwBySport[d.Sport].heights.push(d.Height);
  hwBySport[d.Sport].weights.push(d.Weight);
}
const finding6_heightWeightBySport = Object.entries(hwBySport)
  .filter(([, v]) => v.heights.length >= 30)
  .map(([Sport, v]) => ({
    Sport,
    avgHeight: Math.round(mean(v.heights) * 10) / 10,
    avgWeight: Math.round(mean(v.weights) * 10) / 10,
    n: v.heights.length,
  }))
  .sort((a, b) => b.avgHeight - a.avgHeight);

// --- Finding 7: female share of athletes over time ---
const athleteGameSex = new Map();
for (const d of data) {
  const key = d.ID + "|" + d.Games;
  if (!athleteGameSex.has(key)) athleteGameSex.set(key, { Year: d.Year, Season: d.Season, Sex: d.Sex });
}
const sexByYear = {};
for (const { Year, Sex } of athleteGameSex.values()) {
  if (!sexByYear[Year]) sexByYear[Year] = { M: 0, F: 0 };
  sexByYear[Year][Sex]++;
}
const finding7_femaleShare = Object.entries(sexByYear)
  .map(([Year, counts]) => {
    const total = counts.M + counts.F;
    return {
      Year: Number(Year),
      female: counts.F,
      male: counts.M,
      total,
      femaleShare: Math.round((counts.F / total) * 1000) / 10,
    };
  })
  .sort((a, b) => a.Year - b.Year);

// --- Finding 8: sports with latest female entry + 2016 gender gap ---
const firstFemaleYearBySport = {};
const firstYearBySport = {};
for (const d of data) {
  if (!firstYearBySport[d.Sport] || d.Year < firstYearBySport[d.Sport]) {
    firstYearBySport[d.Sport] = d.Year;
  }
  if (d.Sex === "F") {
    if (!firstFemaleYearBySport[d.Sport] || d.Year < firstFemaleYearBySport[d.Sport]) {
      firstFemaleYearBySport[d.Sport] = d.Year;
    }
  }
}
const finding8_latestFemaleEntry = Object.keys(firstYearBySport)
  .filter((sport) => firstFemaleYearBySport[sport])
  .map((sport) => ({
    Sport: sport,
    sportFirstYear: firstYearBySport[sport],
    femaleFirstYear: firstFemaleYearBySport[sport],
  }))
  .sort((a, b) => b.femaleFirstYear - a.femaleFirstYear)
  .slice(0, 10);

const menOnlySports2016 = new Set();
const sexCounts2016 = {};
const seen2016 = new Set();
for (const d of data) {
  if (d.Games !== "2016 Summer") continue;
  const key = `${d.ID}|${d.Sport}`;
  if (seen2016.has(key)) continue;
  seen2016.add(key);
  if (!sexCounts2016[d.Sport]) sexCounts2016[d.Sport] = { M: 0, F: 0 };
  sexCounts2016[d.Sport][d.Sex]++;
}
const finding8_2016gap = Object.entries(sexCounts2016)
  .map(([Sport, c]) => ({
    Sport,
    male: c.M,
    female: c.F,
    total: c.M + c.F,
    femaleShare: Math.round((c.F / (c.M + c.F)) * 1000) / 10,
  }))
  .sort((a, b) => a.femaleShare - b.femaleShare);

// --- Globe: all-time stats per country (every NOC, not just the top 15) ---
const athletesByNocSet = new Map(); // NOC -> Set of athlete IDs
for (const d of data) {
  if (!athletesByNocSet.has(d.NOC)) athletesByNocSet.set(d.NOC, new Set());
  athletesByNocSet.get(d.NOC).add(d.ID);
}
const medalsByNocCount = new Map();
for (const m of medalRecords) {
  medalsByNocCount.set(m.NOC, (medalsByNocCount.get(m.NOC) || 0) + 1);
}
const allNocs = new Set([...athletesByNocSet.keys(), ...medalsByNocCount.keys()]);
const countryStats = Array.from(allNocs).map((NOC) => ({
  NOC,
  athletes: athletesByNocSet.get(NOC) ? athletesByNocSet.get(NOC).size : 0,
  medals: medalsByNocCount.get(NOC) || 0,
})).sort((a, b) => b.medals - a.medals);

// --- Globe: host city + top 3 countries for every Games ---
const CITY_COORDS = {
  Athina: [37.9838, 23.7275],
  Paris: [48.8566, 2.3522],
  "St. Louis": [38.627, -90.1994],
  London: [51.5074, -0.1278],
  Stockholm: [59.3293, 18.0686],
  Antwerpen: [51.2194, 4.4025],
  Chamonix: [45.9237, 6.8694],
  Amsterdam: [52.3676, 4.9041],
  "Sankt Moritz": [46.4908, 9.8355],
  "Los Angeles": [34.0522, -118.2437],
  "Lake Placid": [44.2795, -73.9799],
  Berlin: [52.52, 13.405],
  "Garmisch-Partenkirchen": [47.4924, 11.0956],
  Helsinki: [60.1699, 24.9384],
  Oslo: [59.9139, 10.7522],
  Melbourne: [-37.8136, 144.9631],
  "Cortina d'Ampezzo": [46.5405, 12.1357],
  Roma: [41.9028, 12.4964],
  "Squaw Valley": [39.1969, -120.2358],
  Tokyo: [35.6762, 139.6503],
  Innsbruck: [47.2692, 11.4041],
  "Mexico City": [19.4326, -99.1332],
  Grenoble: [45.1885, 5.7245],
  Munich: [48.1351, 11.582],
  Sapporo: [43.0618, 141.3545],
  Montreal: [45.5019, -73.5674],
  Moskva: [55.7558, 37.6173],
  Sarajevo: [43.8563, 18.4131],
  Seoul: [37.5665, 126.978],
  Calgary: [51.0447, -114.0719],
  Barcelona: [41.3874, 2.1686],
  Albertville: [45.6764, 6.3921],
  Lillehammer: [61.1153, 10.4662],
  Atlanta: [33.749, -84.388],
  Nagano: [36.6513, 138.181],
  Sydney: [-33.8688, 151.2093],
  "Salt Lake City": [40.7608, -111.891],
  Torino: [45.0703, 7.6869],
  Beijing: [39.9042, 116.4074],
  Vancouver: [49.2827, -123.1207],
  Sochi: [43.6028, 39.7342],
  "Rio de Janeiro": [-22.9068, -43.1729],
};
const gamesInfo = new Map(); // Games -> { Year, Season, City }
for (const d of data) {
  if (!gamesInfo.has(d.Games)) {
    gamesInfo.set(d.Games, { Year: d.Year, Season: d.Season, City: d.City });
  }
}
const medalsByGamesNoc = new Map(); // Games -> Map(NOC -> count)
for (const m of medalRecords) {
  if (!medalsByGamesNoc.has(m.Games)) medalsByGamesNoc.set(m.Games, new Map());
  const inner = medalsByGamesNoc.get(m.Games);
  inner.set(m.NOC, (inner.get(m.NOC) || 0) + 1);
}
const hostCities = Array.from(gamesInfo.entries()).map(([Games, info]) => {
  const coords = CITY_COORDS[info.City];
  const nocCounts = medalsByGamesNoc.get(Games) || new Map();
  const top3 = Array.from(nocCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([NOC, medals]) => ({ NOC, medals }));
  return {
    Games, Year: info.Year, Season: info.Season, City: info.City,
    lat: coords ? coords[0] : null, lon: coords ? coords[1] : null,
    top3,
  };
}).sort((a, b) => a.Year - b.Year || a.Season.localeCompare(b.Season));

const results = {
  headline,
  finding1_leaderboard,
  finding2_trend,
  finding3_concentration,
  finding4_hostBump,
  finding5_ageTrend,
  finding6_heightWeightBySport,
  finding7_femaleShare,
  finding8_latestFemaleEntry,
  finding8_2016gap,
  countryStats,
  hostCities,
};

fs.writeFileSync(
  path.join(__dirname, "findings.json"),
  JSON.stringify(results, null, 2)
);
console.log(JSON.stringify(results, null, 2));
