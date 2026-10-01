(async function () {
  const res = await fetch("scripts/findings.json");
  const data = await res.json();

  // ---------- Globe ----------
  const globeContainer = document.getElementById("globe-container");
  if (globeContainer && window.Globe) {
    Globe.init(globeContainer, { countryStats: data.countryStats, hostCities: data.hostCities });
  }

  // ---------- Headline numbers ----------
  const fmt = (n) => n.toLocaleString();
  document.getElementById("stat-events").textContent = fmt(data.headline.totalAthleteEvents);
  document.getElementById("stat-countries").textContent = fmt(data.headline.countries);
  document.getElementById("stat-games").textContent = fmt(data.headline.gamesCount);
  document.getElementById("stat-medals").textContent = fmt(data.headline.totalMedalsAwarded);

  // ---------- Finding 1: all-time medal leaderboard ----------
  Charts.barChart({
    container: document.getElementById("chart-leaderboard"),
    data: data.finding1_leaderboard.map((d) => ({ label: nocName(d.NOC), value: d.total, noc: d.NOC })),
    colorIndex: 0,
    onClick: (d) => { if (d.noc) window.location.href = `dashboard.html?noc=${d.noc}`; },
  });

  // ---------- Finding 2: medal trend for top 6 countries ----------
  const top6 = data.finding1_leaderboard.slice(0, 6).map((d) => d.NOC);
  Charts.lineChart({
    container: document.getElementById("chart-trend"),
    series: top6.map((noc) => ({
      name: nocName(noc),
      noc,
      points: data.finding2_trend
        .filter((d) => d.NOC === noc)
        .map((d) => ({ x: d.Year, y: d.medals })),
    })),
    xFormat: (x) => String(x),
    height: 320,
    yMax: 300, // the real max (230) never gets close to the generic niceMax of 500
  });

  // ---------- Finding 3: Summer vs Winter concentration ----------
  Charts.barChart({
    container: document.getElementById("chart-concentration"),
    data: [
      { label: "☀️ Summer Games", value: data.finding3_concentration.summer.top10ShareOfMedals * 100 },
      { label: "❄️ Winter Games", value: data.finding3_concentration.winter.top10ShareOfMedals * 100 },
    ],
    valueFormat: (v) => v.toFixed(0) + "%",
    colorIndex: 2,
    height: 100,
  });

  // ---------- Finding 4: host-country bump ----------
  Charts.dumbbellChart({
    container: document.getElementById("chart-host-bump"),
    data: data.finding4_hostBump.map((d) => ({
      label: `${nocName(d.NOC)} ${d.hostYear}`,
      before: d.avgOtherYears,
      after: d.hostMedals,
      noc: d.NOC,
    })),
    beforeLabel: "Average, other Games",
    afterLabel: "Host-year medals",
  });

  // ---------- Finding 5: average age over time ----------
  Charts.lineChart({
    container: document.getElementById("chart-age-trend"),
    series: [{
      name: "Average age",
      directLabel: false,
      points: data.finding5_ageTrend.map((d) => ({ x: d.Year, y: d.avgAge })),
    }],
    yFormat: (v) => v.toFixed(0),
    yMinZero: false,
    yMax: 36,
    height: 280,
  });

  // ---------- Finding 6: height & weight by sport ----------
  const hw = data.finding6_heightWeightBySport;
  // Matches exactly the sports named in the prose above, rather than a
  // blanket "top 3 / bottom 3 by height" - Diving and Trampolining sit
  // within half a centimeter of Weightlifting, so labeling all of them
  // guarantees overlapping text; naming only the sports actually discussed
  // keeps the callouts legible and tied to the narrative.
  const labelSet = new Set(["Basketball", "Volleyball", "Gymnastics", "Weightlifting"]);
  Charts.scatterChart({
    container: document.getElementById("chart-height-weight"),
    data: hw.map((d) => ({ x: d.avgHeight, y: d.avgWeight, label: d.Sport })),
    xLabel: "Average height (cm)",
    yLabel: "Average weight (kg)",
    labelPredicate: (d) => labelSet.has(d.label),
    emojiFor: (d) => window.sportEmoji && sportEmoji(d.label),
  });

  // ---------- Finding 7: female share of athletes over time ----------
  Charts.lineChart({
    container: document.getElementById("chart-female-share"),
    series: [{
      name: "Female share",
      directLabel: false,
      points: data.finding7_femaleShare.map((d) => ({ x: d.Year, y: d.femaleShare })),
    }],
    yFormat: (v) => v.toFixed(0) + "%",
    height: 280,
  });

  // ---------- Finding 8: 2016 gender gap by sport ----------
  const gap = data.finding8_2016gap;
  const subset = [...gap.slice(0, 8), ...gap.slice(-8)];
  Charts.divergingBarChart({
    container: document.getElementById("chart-gender-gap"),
    data: subset.map((d) => ({ label: `${sportEmoji(d.Sport)} ${d.Sport}`, value: d.femaleShare })),
    baseline: 50,
    valueFormat: (v) => v.toFixed(0) + "%",
  });

  const latestList = document.getElementById("latest-female-list");
  if (latestList) {
    data.finding8_latestFemaleEntry
      .filter((d) => d.femaleFirstYear !== d.sportFirstYear)
      .slice(0, 6)
      .forEach((d) => {
        const li = document.createElement("li");
        li.textContent = `${d.Sport} - first women's competitors in ${d.femaleFirstYear} (sport began ${d.sportFirstYear})`;
        latestList.appendChild(li);
      });
  }
})();
