(function () {
  const BREAKDOWNS = [
    { value: "season", label: "Season" },
    { value: "sex", label: "Sex" },
    { value: "sport", label: "Sport" },
    { value: "noc", label: "Country" },
    { value: "decade", label: "Decade" },
  ];
  const MEASURES = [
    { value: "count", label: "Count of athlete-events" },
    { value: "medals", label: "Total medals" },
    { value: "median_age", label: "Median age" },
    { value: "female_rate", label: "Female share (rate)" },
    { value: "avg_height", label: "Average height (cm)" },
  ];
  const CHART_DEFAULTS = [
    { measure: "count", breakdown: "sport" },
    { measure: "medals", breakdown: "noc" },
    { measure: "median_age", breakdown: "decade" },
    { measure: "female_rate", breakdown: "sport" },
  ];

  let allRows = [];
  let nocLabelMap = {};

  function nocLabel(code) {
    return nocLabelMap[code] || code;
  }

  function median(nums) {
    if (!nums.length) return null;
    const s = nums.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
  function mean(nums) {
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  }

  function dedupMedalRows(rows) {
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      if (!r.Medal) continue;
      const key = `${r.Games}|${r.Event}|${r.NOC}|${r.Medal}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }
  function dedupAthleteGames(rows) {
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      const key = r.ID + "|" + r.Games;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }

  function breakdownKey(row, breakdown) {
    switch (breakdown) {
      case "season": return row.Season;
      case "sex": return row.Sex === "M" ? "Male" : "Female";
      case "sport": return row.Sport;
      case "noc": return nocLabel(row.NOC);
      case "decade": return Math.floor(row.Year / 10) * 10 + "s";
      default: return "-";
    }
  }

  function measureValue(rows, measure) {
    if (!rows.length) return 0;
    switch (measure) {
      case "count":
      case "medals":
        return rows.length;
      case "median_age":
        return median(rows.map((r) => r.Age).filter((v) => v != null)) || 0;
      case "female_rate": {
        const f = rows.filter((r) => r.Sex === "F").length;
        return (f / rows.length) * 100;
      }
      case "avg_height":
        return mean(rows.map((r) => r.Height).filter((v) => v != null)) || 0;
      default:
        return 0;
    }
  }

  function baseArrayForMeasure(measure, ctx) {
    if (measure === "medals") return ctx.dedupedMedals;
    if (measure === "count") return ctx.filtered;
    return ctx.dedupedAthletes; // median_age, female_rate, avg_height
  }

  function aggregate(ctx, measure, breakdown) {
    const base = baseArrayForMeasure(measure, ctx);
    const groups = new Map();
    for (const row of base) {
      const key = breakdownKey(row, breakdown);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    let entries = Array.from(groups.entries()).map(([label, rows]) => ({
      label, value: measureValue(rows, measure), rows,
    }));
    entries.sort((a, b) => b.value - a.value);

    const capBreakdowns = ["sport", "noc"];
    if (capBreakdowns.includes(breakdown) && entries.length > 10) {
      const top = entries.slice(0, 10);
      const restRows = entries.slice(10).flatMap((e) => e.rows);
      if (restRows.length) {
        top.push({ label: "Other", value: measureValue(restRows, measure), rows: restRows });
      }
      entries = top;
    }
    return entries;
  }

  function valueFormatter(measure) {
    switch (measure) {
      case "female_rate": return (v) => v.toFixed(0) + "%";
      case "median_age": return (v) => v.toFixed(1);
      case "avg_height": return (v) => v.toFixed(0) + "cm";
      default: return (v) => Math.round(v).toLocaleString();
    }
  }

  // ---------------- Filtering ----------------
  function currentFilters() {
    return {
      season: document.getElementById("f-season").value,
      sex: document.getElementById("f-sex").value,
      sport: document.getElementById("f-sport").value,
      noc: document.getElementById("f-noc").value,
      yearFrom: Number(document.getElementById("f-year-from").value),
      yearTo: Number(document.getElementById("f-year-to").value),
    };
  }

  function applyFilters(rows, f) {
    return rows.filter((r) => (
      (f.season === "all" || r.Season === f.season) &&
      (f.sex === "all" || r.Sex === f.sex) &&
      (f.sport === "all" || r.Sport === f.sport) &&
      (f.noc === "all" || r.NOC === f.noc) &&
      r.Year >= f.yearFrom && r.Year <= f.yearTo
    ));
  }

  // ---------------- Rendering ----------------
  function renderStats(ctx) {
    document.getElementById("stat-events").textContent = ctx.filtered.length.toLocaleString();
    const uniqueAthletes = new Set(ctx.filtered.map((r) => r.ID)).size;
    document.getElementById("stat-athletes").textContent = uniqueAthletes.toLocaleString();
    document.getElementById("stat-medals").textContent = ctx.dedupedMedals.length.toLocaleString();
    const ages = ctx.dedupedAthletes.map((r) => r.Age).filter((v) => v != null);
    document.getElementById("stat-age").textContent = ages.length ? mean(ages).toFixed(1) : "-";
  }

  function renderChart(i, ctx) {
    const measure = document.getElementById(`measure-${i}`).value;
    const breakdown = document.getElementById(`breakdown-${i}`).value;
    const container = document.getElementById(`chart-${i}`);
    const entries = aggregate(ctx, measure, breakdown);
    if (!entries.length) {
      container.innerHTML = '<p style="color:var(--text-muted);padding:12px 0;">No data for this filter combination.</p>';
      return;
    }
    Charts.barChart({
      container,
      data: entries.map((e) => ({ label: e.label, value: e.value })),
      valueFormat: valueFormatter(measure),
      colorIndex: i * 2,
      height: Math.max(140, entries.length * 32 + 16),
    });
  }

  function renderTable(ctx) {
    const tbody = document.getElementById("table-body");
    tbody.innerHTML = "";
    const groups = new Map();
    for (const row of ctx.filtered) {
      const key = row.NOC;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const medalByNoc = new Map();
    for (const m of ctx.dedupedMedals) {
      medalByNoc.set(m.NOC, (medalByNoc.get(m.NOC) || 0) + 1);
    }
    const athletesByNoc = new Map();
    for (const a of ctx.dedupedAthletes) {
      if (!athletesByNoc.has(a.NOC)) athletesByNoc.set(a.NOC, []);
      athletesByNoc.get(a.NOC).push(a);
    }

    let rows = Array.from(groups.entries()).map(([noc, evRows]) => {
      const athletes = athletesByNoc.get(noc) || []; // per-Games dedup, for age/female-rate
      const ages = athletes.map((a) => a.Age).filter((v) => v != null);
      const females = athletes.filter((a) => a.Sex === "F").length;
      const uniqueCount = new Set(evRows.map((r) => r.ID)).size;
      return {
        noc, name: nocLabel(noc),
        events: evRows.length,
        athletes: uniqueCount,
        medals: medalByNoc.get(noc) || 0,
        avgAge: ages.length ? mean(ages) : null,
        femalePct: athletes.length ? (females / athletes.length) * 100 : null,
      };
    });
    rows.sort((a, b) => b.events - a.events);
    const total = rows.length;
    rows = rows.slice(0, 50);

    rows.forEach((r) => {
      const tr = document.createElement("tr");
      const cells = [
        r.name,
        r.events.toLocaleString(),
        r.athletes.toLocaleString(),
        r.medals.toLocaleString(),
        r.avgAge != null ? r.avgAge.toFixed(1) : "-",
        r.femalePct != null ? r.femalePct.toFixed(0) + "%" : "-",
      ];
      cells.forEach((val) => {
        const td = document.createElement("td");
        td.textContent = val;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    document.getElementById("table-note").textContent = total > 50
      ? `Showing top 50 of ${total} countries in this view, by athlete-event count.`
      : `${total} countries in this view.`;
  }

  function renderAll() {
    const f = currentFilters();
    const filtered = applyFilters(allRows, f);
    const ctx = {
      filtered,
      dedupedMedals: dedupMedalRows(filtered),
      dedupedAthletes: dedupAthleteGames(filtered),
    };
    renderStats(ctx);
    CHART_DEFAULTS.forEach((_, i) => renderChart(i, ctx));
    renderTable(ctx);
  }

  function populateSelect(el, values, { withAll = true, allLabel = "All" } = {}) {
    el.innerHTML = "";
    if (withAll) {
      const opt = document.createElement("option");
      opt.value = "all";
      opt.textContent = allLabel;
      el.appendChild(opt);
    }
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.value;
      opt.textContent = v.label;
      el.appendChild(opt);
    });
  }

  function buildNocLabels(rows) {
    const freq = {}; // noc -> { team -> count }
    for (const r of rows) {
      if (!freq[r.NOC]) freq[r.NOC] = {};
      freq[r.NOC][r.Team] = (freq[r.NOC][r.Team] || 0) + 1;
    }
    const map = {};
    for (const noc in freq) {
      let best = null, bestCount = -1;
      for (const team in freq[noc]) {
        if (freq[noc][team] > bestCount) { best = team; bestCount = freq[noc][team]; }
      }
      map[noc] = best;
    }
    return map;
  }

  async function init() {
    const status = document.getElementById("load-status");
    const res = await fetch("data/athlete_events.csv");
    const text = await res.text();
    status.textContent = "Parsing...";
    await new Promise((r) => setTimeout(r, 0));
    allRows = parseAthleteCSV(text);
    nocLabelMap = buildNocLabels(allRows);
    status.remove();
    document.getElementById("dashboard-content").hidden = false;

    // Filters
    const seasons = Array.from(new Set(allRows.map((r) => r.Season))).sort()
      .map((s) => ({ value: s, label: s }));
    populateSelect(document.getElementById("f-season"), seasons, { allLabel: "All seasons" });

    populateSelect(document.getElementById("f-sex"), [
      { value: "M", label: "Male" }, { value: "F", label: "Female" },
    ], { allLabel: "All athletes" });

    const sports = Array.from(new Set(allRows.map((r) => r.Sport))).sort()
      .map((s) => ({ value: s, label: s }));
    populateSelect(document.getElementById("f-sport"), sports, { allLabel: "All sports" });

    const nocs = Array.from(new Set(allRows.map((r) => r.NOC))).sort((a, b) =>
      nocLabel(a).localeCompare(nocLabel(b))
    ).map((n) => ({ value: n, label: nocLabel(n) }));
    populateSelect(document.getElementById("f-noc"), nocs, { allLabel: "All countries" });

    const years = Array.from(new Set(allRows.map((r) => r.Year))).sort((a, b) => a - b);
    const yearOpts = years.map((y) => ({ value: y, label: String(y) }));
    populateSelect(document.getElementById("f-year-from"), yearOpts, { withAll: false });
    populateSelect(document.getElementById("f-year-to"), yearOpts, { withAll: false });
    document.getElementById("f-year-from").value = years[0];
    document.getElementById("f-year-to").value = years[years.length - 1];

    // Chart controls
    const grid = document.getElementById("dashboard-grid");
    CHART_DEFAULTS.forEach((def, i) => {
      const card = document.createElement("div");
      card.className = "chart-card";
      card.innerHTML = `
        <h3>Chart ${i + 1}</h3>
        <div class="chart-controls">
          <div class="filter-field">
            <label for="measure-${i}">Measure</label>
            <select id="measure-${i}"></select>
          </div>
          <div class="filter-field">
            <label for="breakdown-${i}">Broken down by</label>
            <select id="breakdown-${i}"></select>
          </div>
        </div>
        <div id="chart-${i}"></div>
      `;
      grid.appendChild(card);
      populateSelect(card.querySelector(`#measure-${i}`), MEASURES, { withAll: false });
      populateSelect(card.querySelector(`#breakdown-${i}`), BREAKDOWNS, { withAll: false });
      card.querySelector(`#measure-${i}`).value = def.measure;
      card.querySelector(`#breakdown-${i}`).value = def.breakdown;
      card.querySelector(`#measure-${i}`).addEventListener("change", () => {
        const f = currentFilters();
        const filtered = applyFilters(allRows, f);
        renderChart(i, { filtered, dedupedMedals: dedupMedalRows(filtered), dedupedAthletes: dedupAthleteGames(filtered) });
      });
      card.querySelector(`#breakdown-${i}`).addEventListener("change", () => {
        const f = currentFilters();
        const filtered = applyFilters(allRows, f);
        renderChart(i, { filtered, dedupedMedals: dedupMedalRows(filtered), dedupedAthletes: dedupAthleteGames(filtered) });
      });
    });

    ["f-season", "f-sex", "f-sport", "f-noc", "f-year-from", "f-year-to"].forEach((id) => {
      document.getElementById(id).addEventListener("change", renderAll);
    });

    document.getElementById("btn-reset").addEventListener("click", () => {
      document.getElementById("f-season").value = "all";
      document.getElementById("f-sex").value = "all";
      document.getElementById("f-sport").value = "all";
      document.getElementById("f-noc").value = "all";
      document.getElementById("f-year-from").value = years[0];
      document.getElementById("f-year-to").value = years[years.length - 1];
      CHART_DEFAULTS.forEach((def, i) => {
        document.getElementById(`measure-${i}`).value = def.measure;
        document.getElementById(`breakdown-${i}`).value = def.breakdown;
      });
      renderAll();
    });

    renderAll();
  }

  init();
})();
