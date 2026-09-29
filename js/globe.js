// A small interactive globe: drag to rotate, hover a country for its
// all-time medal/athlete totals, hover a host-city marker for the year(s)
// it hosted and that Games' top 3 countries by medal count.
//
// Built with D3 (geo projection, path generation, drag, timer) loaded from
// a CDN in index.html. Country fill uses the site's sequential blue ramp;
// data joins to map shapes via js/globe-countries.js (NOC -> map name).

(function () {
  const SEQUENTIAL_STEPS = [
    "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#2a78d6", "#1c5cab", "#0d366b",
  ];

  function colorForMedals(medals, maxMedals) {
    if (!medals) return null; // no medals -> neutral fill, handled by caller
    const t = Math.log1p(medals) / Math.log1p(maxMedals);
    const idx = Math.min(SEQUENTIAL_STEPS.length - 1, Math.floor(t * SEQUENTIAL_STEPS.length));
    return SEQUENTIAL_STEPS[idx];
  }

  function groupHostCities(hostCities) {
    const byLoc = new Map();
    hostCities.forEach((h) => {
      if (h.lat == null) return;
      const key = h.lat.toFixed(2) + "," + h.lon.toFixed(2);
      if (!byLoc.has(key)) byLoc.set(key, { lat: h.lat, lon: h.lon, city: h.City, editions: [] });
      byLoc.get(key).editions.push(h);
    });
    return Array.from(byLoc.values());
  }

  function init(container, { countryStats, hostCities }) {
    if (!window.d3 || !window.topojson) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Globe unavailable (failed to load map library).</p>';
      return;
    }
    const d3_ = window.d3;
    const size = 340;
    const statsByNoc = new Map(countryStats.map((c) => [c.NOC, c]));
    const nocByMapName = new Map();
    Object.entries(window.NOC_TO_MAP_NAME || {}).forEach(([noc, name]) => nocByMapName.set(name, noc));
    const maxMedals = Math.max(...countryStats.map((c) => c.medals));
    const markers = groupHostCities(hostCities);

    let rotate = [-15, -25];
    let zoomK = 1;
    const baseScale = size / 2 - 4;
    let dragging = false;
    let hoverPaused = false;

    const projection = d3_.geoOrthographic()
      .scale(baseScale)
      .translate([size / 2, size / 2])
      .rotate(rotate)
      .clipAngle(90);
    const path = d3_.geoPath(projection);

    container.innerHTML = "";
    container.classList.add("globe-wrap");
    const svg = d3_.select(container).append("svg")
      .attr("viewBox", `0 0 ${size} ${size}`)
      .attr("role", "img")
      .attr("aria-label", "Interactive globe of Olympic medal totals by country");

    const sphere = svg.append("circle")
      .attr("class", "globe-sphere")
      .attr("cx", size / 2).attr("cy", size / 2).attr("r", baseScale);

    const graticule = d3_.geoGraticule10();
    const graticulePath = svg.append("path").attr("class", "globe-graticule");

    const countryLayer = svg.append("g");
    const markerLayer = svg.append("g");

    const tip = document.createElement("div");
    tip.className = "chart-tooltip globe-tooltip";
    container.appendChild(tip);

    function showTip(html, evt) {
      tip.innerHTML = html;
      tip.classList.add("visible");
      moveTip(evt);
    }
    function moveTip(evt) {
      const rect = container.getBoundingClientRect();
      const x = evt.clientX - rect.left, y = evt.clientY - rect.top;
      let left = x + 14, top = y - 10;
      if (left + 190 > rect.width) left = x - 200;
      tip.style.left = left + "px";
      tip.style.top = Math.max(0, top) + "px";
    }
    function hideTip() {
      tip.classList.remove("visible");
    }

    let worldData = null;

    function render() {
      if (!worldData) return; // map data hasn't finished loading yet
      projection.rotate(rotate).scale(baseScale * zoomK);
      sphere.attr("r", baseScale * zoomK);
      graticulePath.attr("d", path(graticule));

      // Keyed by name, not d.id: geoStitch doesn't reliably preserve the
      // original topojson id, and a broken/undefined key here means the
      // data join can't match old elements to new data - every render call
      // (which happens on every drag tick) then ADDS a fresh duplicate path
      // instead of updating the existing one, and the stacked duplicates
      // visually read as stray lines/noise once enough of them pile up.
      const countries = countryLayer.selectAll("path").data(worldData, (d) => d.properties.name);
      countries.enter().append("path")
        .attr("class", "globe-country")
        .merge(countries)
        .attr("d", path)
        .attr("fill", (d) => {
          const noc = nocByMapName.get(d.properties.name);
          const stat = noc && statsByNoc.get(noc);
          const c = stat ? colorForMedals(stat.medals, maxMedals) : null;
          return c || "var(--gridline)";
        })
        .on("pointermove", (evt, d) => {
          const noc = nocByMapName.get(d.properties.name);
          const stat = noc && statsByNoc.get(noc);
          const name = d.properties.name;
          hoverPaused = true;
          showTip(
            `<div class="tt-title">${escapeHTML(name)}</div>` +
            (stat
              ? `<div class="tt-row"><span class="tt-name">Medals:</span> <span class="tt-value">${stat.medals.toLocaleString()}</span></div>
                 <div class="tt-row"><span class="tt-name">Athletes:</span> <span class="tt-value">${stat.athletes.toLocaleString()}</span></div>`
              : `<div class="tt-row" style="color:var(--text-muted)">No medals in this dataset</div>`),
            evt
          );
        })
        .on("pointerleave", hideTip);

      const pts = markerLayer.selectAll("g.globe-marker")
        .data(markers.filter(isFrontFacing), (d) => d.city);
      pts.exit().remove();
      const entered = pts.enter().append("g").attr("class", "globe-marker");
      entered.append("circle").attr("r", 3.5);
      const merged = entered.merge(pts);
      merged.attr("transform", (d) => {
        const p = projection([d.lon, d.lat]);
        return p ? `translate(${p[0]},${p[1]})` : "translate(-100,-100)";
      });
      merged.on("pointermove", (evt, d) => {
        hoverPaused = true;
        showTip(markerTooltipHTML(d), evt);
      });
      merged.on("pointerleave", hideTip);
    }

    function isFrontFacing(d) {
      const centerLon = -rotate[0], centerLat = -rotate[1];
      return d3_.geoDistance([d.lon, d.lat], [centerLon, centerLat]) < Math.PI / 2 - 0.05;
    }

    function markerTooltipHTML(d) {
      const editionsHTML = d.editions
        .slice().sort((a, b) => a.Year - b.Year)
        .map((ed) => {
          const top3HTML = ed.top3.map((t) => {
            const name = (window.nocName && window.nocName(t.NOC)) || t.NOC;
            const flag = window.Charts && window.Charts.flagChipDOM ? window.Charts.flagChipDOM(t.NOC).outerHTML : "";
            return `<div class="tt-row">${flag}<span class="tt-name">${escapeHTML(name)}</span> <span class="tt-value">${t.medals}</span></div>`;
          }).join("");
          return `<div class="globe-tip-edition"><strong>${ed.Year} ${ed.Season}</strong>${top3HTML || '<div class="tt-row" style="color:var(--text-muted)">No medal data</div>'}</div>`;
        }).join("");
      return `<div class="tt-title">${escapeHTML(d.city)}</div>${editionsHTML}`;
    }

    function escapeHTML(s) {
      const div = document.createElement("div");
      div.textContent = s;
      return div.innerHTML;
    }

    // Drag to rotate
    const drag = d3_.drag()
      .on("start", () => { dragging = true; hideTip(); })
      .on("drag", (evt) => {
        const k = 0.35 / zoomK; // slower rotation per pixel when zoomed in
        rotate = [rotate[0] + evt.dx * k, Math.max(-90, Math.min(90, rotate[1] - evt.dy * k))];
        render();
      })
      .on("end", () => { dragging = false; });
    svg.call(drag);
    svg.on("touchmove", (evt) => evt.preventDefault(), { passive: false });
    // Pause auto-rotate as soon as the pointer enters the globe at all, not
    // only when exactly over a shape - otherwise small host-city markers
    // are a moving target while the globe is still spinning.
    svg.on("pointerenter", () => { hoverPaused = true; });
    svg.on("pointerleave", () => { hoverPaused = false; hideTip(); });

    // Scroll to zoom. Filtered to wheel events only so it never fights with
    // the drag-to-rotate behavior above (touch drag keeps rotating as before).
    const zoom = d3_.zoom()
      .scaleExtent([0.6, 4])
      .filter((evt) => evt.type === "wheel")
      .on("zoom", (evt) => {
        zoomK = evt.transform.k;
        hoverPaused = true;
        render();
      });
    svg.call(zoom);

    // Gentle auto-rotate when idle
    const timer = d3_.timer((elapsed) => {
      if (!dragging && !hoverPaused) {
        rotate = [rotate[0] + 0.08, rotate[1]];
        render();
      }
    });

    fetch("data/countries-110m.json")
      .then((r) => r.json())
      .then((topology) => {
        let fc = window.topojson.feature(topology, topology.objects.countries);
        // Antarctica has no NOC of its own (irrelevant to medal data) and is
        // a frequent source of orthographic-projection rendering glitches at
        // the pole - simplest fix is to just not draw it.
        fc.features = fc.features.filter((f) => f.properties.name !== "Antarctica");
        // Countries that cross the antimeridian (Russia, Fiji, the US via the
        // Aleutians) otherwise draw a spurious straight line across the
        // globe once clipAngle(90) cuts through them mid-rotation. geoStitch
        // (from d3-geo-projection) removes the antimeridian cut and
        // replaces it with proper geodesic segments, which fixes it.
        if (d3_.geoStitch) fc = d3_.geoStitch(fc);
        worldData = fc.features;
        render();
      })
      .catch(() => {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Globe data failed to load.</p>';
        timer.stop();
      });
  }

  window.Globe = { init };
})();
