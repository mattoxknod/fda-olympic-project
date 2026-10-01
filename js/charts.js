// Small dependency-free SVG chart library following the site's dataviz spec:
// thin marks, rounded bar ends, a legend for 2+ series, crosshair/hover
// tooltips, and colors read from CSS custom properties so charts follow
// light/dark mode automatically.
(function (global) {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SERIES_VARS = [
    "--series-1", "--series-2", "--series-3", "--series-4",
    "--series-5", "--series-6", "--series-7", "--series-8",
  ];

  function el(tag, attrs, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const k in attrs) node.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function seriesColor(i) {
    return `var(${SERIES_VARS[i % SERIES_VARS.length]})`;
  }

  function formatNumber(n) {
    if (n == null || Number.isNaN(n)) return "-";
    if (Math.abs(n) >= 1000) return n.toLocaleString();
    return String(n);
  }

  function niceMax(max) {
    if (max <= 0) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const residual = max / magnitude;
    let niceResidual;
    if (residual > 5) niceResidual = 10;
    else if (residual > 2) niceResidual = 5;
    else if (residual > 1) niceResidual = 2;
    else niceResidual = 1;
    return niceResidual * magnitude;
  }

  function ensureTooltip(container) {
    let tip = container.querySelector(".chart-tooltip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "chart-tooltip";
      container.style.position = "relative";
      container.appendChild(tip);
    }
    return tip;
  }

  function positionTooltip(tip, container, x, y) {
    const bounds = container.getBoundingClientRect();
    let left = x + 14;
    let top = y - 10;
    if (left + 180 > bounds.width) left = x - 190;
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(0, top)}px`;
  }

  function buildLegend(container, items) {
    if (items.length < 2) return;
    const legend = document.createElement("div");
    legend.className = "chart-legend";
    items.forEach((item) => {
      const row = document.createElement("span");
      row.className = "legend-item";
      const swatch = document.createElement("span");
      swatch.className = item.shape === "rect" ? "swatch-rect" : "swatch-line";
      swatch.style.background = item.color;
      row.appendChild(swatch);
      if (item.noc && window.Flags) {
        row.appendChild(flagChipDOM(item.noc));
      }
      const label = document.createElement("span");
      label.textContent = item.label;
      row.appendChild(label);
      legend.appendChild(row);
    });
    container.appendChild(legend);
  }

  // ---------------- Flags ----------------
  // Shared drawing logic (bands + optional accent shape), used both inside
  // the big charts' own <svg> and inside each small standalone DOM chip, so
  // every accent type (cross, star, canton, ...) renders identically in
  // both places rather than the DOM version being a lesser approximation.
  function drawFlagShape(g, x, yCenter, spec, size) {
    const h = size * 0.68;
    const bands = spec.bands;
    const vertical = spec.orientation === "v";
    const y0 = yCenter - h / 2;
    bands.forEach((color, i) => {
      const bandSize = (vertical ? size : h) / bands.length;
      const attrs = vertical
        ? { x: x + i * bandSize, y: y0, width: bandSize + 0.5, height: h }
        : { x, y: y0 + i * bandSize, width: size, height: bandSize + 0.5 };
      el("rect", { ...attrs, fill: color }, g);
    });
    el("rect", {
      x, y: y0, width: size, height: h, fill: "none",
      stroke: "var(--border)", "stroke-width": 1,
    }, g);
    if (spec.accent) {
      const cx = x + size / 2, cy = yCenter;
      const a = spec.accent;
      switch (a.type) {
        case "star":
        case "circle":
          el("circle", { cx, cy, r: a.r || 2.2, fill: a.color }, g);
          break;
        case "diamond":
          el("polygon", {
            points: `${cx},${cy - h * 0.28} ${cx + size * 0.22},${cy} ${cx},${cy + h * 0.28} ${cx - size * 0.22},${cy}`,
            fill: a.color,
          }, g);
          break;
        case "canton":
          el("rect", {
            x, y: y0, width: size * (a.w || 0.42), height: h * (a.h || 0.55), fill: a.color,
          }, g);
          break;
        case "cross":
          el("rect", { x: cx - size * 0.09, y: y0, width: size * 0.18, height: h, fill: a.color }, g);
          el("rect", { x, y: cy - h * 0.14, width: size, height: h * 0.28, fill: a.color }, g);
          break;
        case "triangle":
          el("polygon", { points: `${x},${y0} ${x},${y0 + h} ${x + size * 0.38},${cy}`, fill: a.color }, g);
          break;
        case "crescent":
          el("circle", { cx, cy, r: h * 0.28, fill: a.color }, g);
          el("circle", { cx: cx + h * 0.12, cy, r: h * 0.22, fill: bands[0] }, g);
          break;
      }
    }
  }

  // A small flag chip for plain-DOM contexts (legend, table, dropdown):
  // its own tiny standalone <svg>, using the same drawFlagShape as the
  // charts so every accent type renders identically everywhere.
  function flagChipDOM(noc) {
    const span = document.createElement("span");
    span.className = "flag-chip flag-chip-drawn";
    if (!window.Flags) return span;
    const f = window.Flags.flagFor(noc);
    const size = 16, h = size * 0.68;
    const svg = el("svg", { viewBox: `0 0 ${size} ${h}`, width: size, height: h });
    if (f.type === "flag") {
      drawFlagShape(svg, 0, h / 2, f.spec, size);
    } else {
      el("rect", {
        x: 0, y: 0, width: size, height: h, rx: 1.5,
        fill: "var(--gridline)", stroke: "var(--border)", "stroke-width": 1,
      }, svg);
      span.classList.add("flag-chip-placeholder");
    }
    span.appendChild(svg);
    return span;
  }

  // Draws a small flag swatch inside one of the big charts' own <svg> -
  // no emoji, no external image, renders identically on every browser/OS.
  // Returns the width it occupied.
  function drawFlagChipSVG(parent, x, yCenter, noc, size = 16) {
    const h = size * 0.68;
    const g = el("g", {}, parent);
    if (!window.Flags) return 0;
    const f = window.Flags.flagFor(noc);
    if (f.type !== "flag") {
      el("rect", {
        x, y: yCenter - h / 2, width: size, height: h, rx: 1.5,
        fill: "var(--gridline)", stroke: "var(--border)", "stroke-width": 1,
      }, g);
      return size + 6;
    }
    drawFlagShape(g, x, yCenter, f.spec, size);
    return size + 6;
  }

  // ---------------- Bar chart (horizontal, sorted, single hue) ----------------
  function barChart({ container, data, valueFormat, colorIndex = 0, height, highlightLabel, onClick }) {
    container.innerHTML = "";
    const width = 640;
    const barHeight = 22;
    const gap = 10;
    const hasFlags = data.some((d) => d.noc);
    const flagAreaWidth = hasFlags ? 22 : 0;
    const leftLabelWidth = 150;
    const h = height || data.length * (barHeight + gap) + 20;
    const plotWidth = width - leftLabelWidth - 60;
    const max = niceMax(Math.max(...data.map((d) => d.value)));
    const svg = el("svg", { viewBox: `0 0 ${width} ${h}`, role: "img", "aria-label": "Bar chart" }, container);
    const tip = ensureTooltip(container);
    const color = seriesColor(colorIndex);

    data.forEach((d, i) => {
      const y = i * (barHeight + gap) + 8;
      const barW = (d.value / max) * plotWidth;
      if (d.noc) {
        drawFlagChipSVG(svg, leftLabelWidth - 10 - flagAreaWidth + 4, y + barHeight / 2, d.noc, 15);
      }
      el("text", {
        x: leftLabelWidth - 10 - flagAreaWidth, y: y + barHeight / 2 + 4, "text-anchor": "end",
        class: "chart-axis",
      }, svg).textContent = d.label;

      const track = el("rect", {
        x: leftLabelWidth, y, width: plotWidth, height: barHeight,
        fill: "var(--gridline)", opacity: 0.35, rx: 4,
      }, svg);

      const bar = el("rect", {
        x: leftLabelWidth, y, width: Math.max(barW, 2), height: barHeight,
        rx: 4, fill: d.highlight ? color : color, class: "chart-mark",
        opacity: d.highlight === false ? 0.45 : 1,
      }, svg);

      el("text", {
        x: leftLabelWidth + barW + 8, y: y + barHeight / 2 + 4,
        class: "chart-value-label",
      }, svg).textContent = valueFormat ? valueFormat(d.value) : formatNumber(d.value);

      const hit = el("rect", {
        x: leftLabelWidth, y, width: plotWidth, height: barHeight, class: "chart-hit",
      }, svg);
      hit.addEventListener("pointerenter", () => showTip(d, y));
      hit.addEventListener("pointermove", (e) => moveTip(e));
      hit.addEventListener("pointerleave", hideTip);
      hit.addEventListener("focus", () => showTip(d, y));
      hit.setAttribute("tabindex", "0");
      hit.setAttribute("focusable", "true");
      if (onClick) {
        hit.style.cursor = "pointer";
        hit.addEventListener("click", () => onClick(d));
        hit.addEventListener("keydown", (e) => { if (e.key === "Enter") onClick(d); });
      }
    });

    function showTip(d, y) {
      tip.innerHTML = "";
      const title = document.createElement("div");
      title.className = "tt-title";
      title.textContent = d.label;
      const row = document.createElement("div");
      row.className = "tt-row";
      const val = document.createElement("span");
      val.className = "tt-value";
      val.textContent = valueFormat ? valueFormat(d.value) : formatNumber(d.value);
      row.appendChild(val);
      tip.appendChild(title);
      tip.appendChild(row);
      tip.classList.add("visible");
      positionTooltip(tip, container, leftLabelWidth + plotWidth * 0.4, y);
    }
    function moveTip(e) {
      const rect = container.getBoundingClientRect();
      positionTooltip(tip, container, e.clientX - rect.left, e.clientY - rect.top);
    }
    function hideTip() {
      tip.classList.remove("visible");
    }
  }

  // ---------------- Diverging bar (baseline in the middle) ----------------
  function divergingBarChart({ container, data, baseline, valueFormat, height }) {
    container.innerHTML = "";
    const width = 640;
    const barHeight = 16;
    const gap = 6;
    const leftLabelWidth = 150;
    const h = height || data.length * (barHeight + gap) + 20;
    const plotWidth = width - leftLabelWidth - 60;
    const maxDelta = Math.max(...data.map((d) => Math.abs(d.value - baseline)), 1);
    const scale = (plotWidth / 2 - 10) / niceMax(maxDelta);
    const midX = leftLabelWidth + plotWidth / 2;
    const svg = el("svg", { viewBox: `0 0 ${width} ${h}`, role: "img", "aria-label": "Diverging bar chart" }, container);
    const tip = ensureTooltip(container);

    el("line", { x1: midX, x2: midX, y1: 0, y2: h, class: "chart-baseline" }, svg);
    el("text", { x: midX, y: h - 2, "text-anchor": "middle", class: "chart-axis" }, svg).textContent = `${baseline}%`;

    data.forEach((d, i) => {
      const y = i * (barHeight + gap) + 8;
      const delta = d.value - baseline;
      const barW = Math.abs(delta) * scale;
      const isHigh = delta >= 0;
      const x = isHigh ? midX : midX - barW;
      el("text", {
        x: leftLabelWidth - 10, y: y + barHeight / 2 + 4, "text-anchor": "end", class: "chart-axis",
      }, svg).textContent = d.label;

      el("rect", {
        x, y, width: Math.max(barW, 1.5), height: barHeight, rx: 3,
        fill: isHigh ? "var(--diverging-high)" : "var(--diverging-low)", class: "chart-mark",
      }, svg);

      const labelX = isHigh ? x + barW + 6 : x - 6;
      el("text", {
        x: labelX, y: y + barHeight / 2 + 4,
        "text-anchor": isHigh ? "start" : "end", class: "chart-value-label",
      }, svg).textContent = valueFormat ? valueFormat(d.value) : formatNumber(d.value);

      const hit = el("rect", { x: leftLabelWidth, y, width: plotWidth, height: barHeight, class: "chart-hit" }, svg);
      hit.addEventListener("pointerenter", () => showTip(d, y));
      hit.addEventListener("pointermove", (e) => moveTip(e));
      hit.addEventListener("pointerleave", hideTip);
    });

    function showTip(d, y) {
      tip.innerHTML = "";
      const title = document.createElement("div");
      title.className = "tt-title";
      title.textContent = d.label;
      const row = document.createElement("div");
      row.className = "tt-row";
      const val = document.createElement("span");
      val.className = "tt-value";
      val.textContent = (valueFormat ? valueFormat(d.value) : formatNumber(d.value));
      row.appendChild(val);
      tip.appendChild(title);
      tip.appendChild(row);
      tip.classList.add("visible");
      positionTooltip(tip, container, midX, y);
    }
    function moveTip(e) {
      const rect = container.getBoundingClientRect();
      positionTooltip(tip, container, e.clientX - rect.left, e.clientY - rect.top);
    }
    function hideTip() {
      tip.classList.remove("visible");
    }
  }

  // ---------------- Line chart (multi-series, crosshair + tooltip) ----------------
  function lineChart({ container, series, xFormat, yFormat, height = 300, yMinZero = true, yMax: yMaxOverride }) {
    container.innerHTML = "";
    buildLegend(container, series.map((s, i) => ({
      label: s.name, color: seriesColor(i), shape: "line", noc: s.noc,
    })));
    const width = 640;
    const margin = { top: 14, right: 16, bottom: 28, left: 46 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    const allX = series.flatMap((s) => s.points.map((p) => p.x));
    const allY = series.flatMap((s) => s.points.map((p) => p.y));
    const xMin = Math.min(...allX), xMax = Math.max(...allX);
    const yMax = yMaxOverride || niceMax(Math.max(...allY));
    const yMin = yMinZero ? 0 : Math.min(...allY);

    const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin || 1)) * plotW;
    const yScale = (y) => margin.top + plotH - ((y - yMin) / (yMax - yMin || 1)) * plotH;

    const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "Line chart" }, container);
    const tip = ensureTooltip(container);

    // gridlines (4 horizontal steps)
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const gy = margin.top + (plotH / steps) * i;
      el("line", { x1: margin.left, x2: width - margin.right, y1: gy, y2: gy, class: "chart-gridline" }, svg);
      const val = yMax - ((yMax - yMin) / steps) * i;
      el("text", { x: margin.left - 8, y: gy + 3, "text-anchor": "end", class: "chart-axis" }, svg)
        .textContent = yFormat ? yFormat(val) : formatNumber(Math.round(val));
    }
    // x axis ticks: first, middle, last
    const xTickVals = Array.from(new Set([xMin, Math.round((xMin + xMax) / 2), xMax]));
    xTickVals.forEach((xv) => {
      el("text", { x: xScale(xv), y: height - 6, "text-anchor": "middle", class: "chart-axis" }, svg)
        .textContent = xFormat ? xFormat(xv) : xv;
    });

    series.forEach((s, i) => {
      const color = seriesColor(i);
      const pts = s.points.slice().sort((a, b) => a.x - b.x);
      const d = pts.map((p, idx) => `${idx === 0 ? "M" : "L"}${xScale(p.x)},${yScale(p.y)}`).join(" ");
      // A single series reads well with a soft area wash under the line (per
      // the dataviz spec: the series hue at ~10% opacity, never a solid fill).
      if (series.length === 1) {
        const areaD = `${d} L${xScale(pts[pts.length - 1].x)},${yScale(yMin)} L${xScale(pts[0].x)},${yScale(yMin)} Z`;
        el("path", { d: areaD, fill: color, opacity: 0.1, stroke: "none" }, svg);
      }
      el("path", { d, fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", class: "chart-mark", "data-series": i }, svg);

      const last = pts[pts.length - 1];
      el("circle", { cx: xScale(last.x), cy: yScale(last.y), r: 4, fill: color, stroke: "var(--surface)", "stroke-width": 2 }, svg);

      // Past 3 series, converging end-labels collide (see dataviz anti-patterns) -
      // the legend + hover tooltip already carry identity, so skip direct labels.
      if (s.directLabel !== false && series.length <= 3) {
        el("text", {
          x: xScale(last.x) + 6, y: yScale(last.y) + 3, class: "chart-direct-label",
        }, svg).textContent = s.name;
      }
    });

    // crosshair
    const crosshair = el("line", {
      x1: margin.left, x2: margin.left, y1: margin.top, y2: margin.top + plotH,
      stroke: "var(--baseline)", "stroke-width": 1, opacity: 0,
    }, svg);
    const overlay = el("rect", {
      x: margin.left, y: margin.top, width: plotW, height: plotH, class: "chart-hit",
    }, svg);

    overlay.addEventListener("pointermove", (e) => {
      const rect = svg.getBoundingClientRect();
      const scaleX = width / rect.width;
      const px = (e.clientX - rect.left) * scaleX;
      const xVal = xMin + ((px - margin.left) / plotW) * (xMax - xMin);
      let nearestX = xMin;
      let bestDist = Infinity;
      series.forEach((s) => s.points.forEach((p) => {
        const dist = Math.abs(p.x - xVal);
        if (dist < bestDist) { bestDist = dist; nearestX = p.x; }
      }));
      crosshair.setAttribute("x1", xScale(nearestX));
      crosshair.setAttribute("x2", xScale(nearestX));
      crosshair.setAttribute("opacity", 1);

      tip.innerHTML = "";
      const title = document.createElement("div");
      title.className = "tt-title";
      title.textContent = xFormat ? xFormat(nearestX) : nearestX;
      tip.appendChild(title);
      series.forEach((s, i) => {
        const p = s.points.find((pt) => pt.x === nearestX);
        if (!p) return;
        const row = document.createElement("div");
        row.className = "tt-row";
        const key = document.createElement("span");
        key.className = "tt-key";
        key.style.background = seriesColor(i);
        const name = document.createElement("span");
        name.className = "tt-name";
        name.textContent = s.name + ":";
        const val = document.createElement("span");
        val.className = "tt-value";
        val.textContent = yFormat ? yFormat(p.y) : formatNumber(p.y);
        row.appendChild(key);
        row.appendChild(name);
        row.appendChild(val);
        tip.appendChild(row);
      });
      tip.classList.add("visible");
      const cbounds = container.getBoundingClientRect();
      positionTooltip(tip, container, (e.clientX - cbounds.left), (e.clientY - cbounds.top));
    });
    overlay.addEventListener("pointerleave", () => {
      crosshair.setAttribute("opacity", 0);
      tip.classList.remove("visible");
    });
  }

  // ---------------- Dumbbell chart (before -> after per item) ----------------
  function dumbbellChart({ container, data, beforeLabel, afterLabel, valueFormat, height }) {
    container.innerHTML = "";
    buildLegend(container, [
      { label: beforeLabel, color: seriesColor(0), shape: "rect" },
      { label: afterLabel, color: seriesColor(7), shape: "rect" },
    ]);
    const width = 640;
    const rowH = 30;
    const hasFlags = data.some((d) => d.noc);
    const flagAreaWidth = hasFlags ? 22 : 0;
    const leftLabelWidth = 150;
    const h = height || data.length * rowH + 20;
    const plotWidth = width - leftLabelWidth - 60;
    const max = niceMax(Math.max(...data.map((d) => Math.max(d.before, d.after))));
    const svg = el("svg", { viewBox: `0 0 ${width} ${h}`, role: "img", "aria-label": "Dumbbell chart" }, container);
    const tip = ensureTooltip(container);
    const scaleX = (v) => leftLabelWidth + (v / max) * plotWidth;

    data.forEach((d, i) => {
      const y = i * rowH + 12;
      if (d.noc) {
        drawFlagChipSVG(svg, leftLabelWidth - 10 - flagAreaWidth + 4, y, d.noc, 15);
      }
      el("text", {
        x: leftLabelWidth - 10 - flagAreaWidth, y: y + 4, "text-anchor": "end", class: "chart-axis",
      }, svg).textContent = d.label;

      el("line", {
        x1: scaleX(d.before), x2: scaleX(d.after), y1: y, y2: y,
        stroke: "var(--baseline)", "stroke-width": 2,
      }, svg);
      el("circle", { cx: scaleX(d.before), cy: y, r: 5, fill: seriesColor(0), stroke: "var(--surface)", "stroke-width": 2 }, svg);
      el("circle", { cx: scaleX(d.after), cy: y, r: 5, fill: seriesColor(7), stroke: "var(--surface)", "stroke-width": 2 }, svg);

      const hit = el("rect", { x: leftLabelWidth, y: y - rowH / 2, width: plotWidth, height: rowH, class: "chart-hit" }, svg);
      hit.addEventListener("pointerenter", () => showTip(d, y));
      hit.addEventListener("pointermove", (e) => moveTip(e));
      hit.addEventListener("pointerleave", hideTip);
    });

    function showTip(d, y) {
      tip.innerHTML = "";
      const title = document.createElement("div");
      title.className = "tt-title";
      title.textContent = d.label;
      [[beforeLabel, d.before, 0], [afterLabel, d.after, 7]].forEach(([name, val, ci]) => {
        const row = document.createElement("div");
        row.className = "tt-row";
        const key = document.createElement("span");
        key.className = "tt-key";
        key.style.background = seriesColor(ci);
        const nm = document.createElement("span");
        nm.className = "tt-name";
        nm.textContent = name + ":";
        const v = document.createElement("span");
        v.className = "tt-value";
        v.textContent = valueFormat ? valueFormat(val) : formatNumber(val);
        row.appendChild(key); row.appendChild(nm); row.appendChild(v);
        tip.appendChild(row);
      });
      tip.appendChild(title);
      tip.insertBefore(title, tip.firstChild);
      tip.classList.add("visible");
      positionTooltip(tip, container, scaleX(d.after), y);
    }
    function moveTip(e) {
      const rect = container.getBoundingClientRect();
      positionTooltip(tip, container, e.clientX - rect.left, e.clientY - rect.top);
    }
    function hideTip() { tip.classList.remove("visible"); }
  }

  // ---------------- Scatter chart ----------------
  function scatterChart({ container, data, xLabel, yLabel, labelPredicate, emojiFor, height = 380 }) {
    container.innerHTML = "";
    const width = 640;
    const margin = { top: 14, right: 20, bottom: 36, left: 50 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const xMax = niceMax(Math.max(...data.map((d) => d.x)) * 1.05);
    const xMin = Math.floor(Math.min(...data.map((d) => d.x)) * 0.97);
    const yMax = niceMax(Math.max(...data.map((d) => d.y)) * 1.05);
    const yMin = Math.floor(Math.min(...data.map((d) => d.y)) * 0.9);
    const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotW;
    const yScale = (y) => margin.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

    const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "Scatter chart" }, container);
    const tip = ensureTooltip(container);

    for (let i = 0; i <= 4; i++) {
      const gy = margin.top + (plotH / 4) * i;
      el("line", { x1: margin.left, x2: width - margin.right, y1: gy, y2: gy, class: "chart-gridline" }, svg);
      const val = yMax - ((yMax - yMin) / 4) * i;
      el("text", { x: margin.left - 8, y: gy + 3, "text-anchor": "end", class: "chart-axis" }, svg).textContent = Math.round(val);
    }
    el("text", { x: margin.left + plotW / 2, y: height - 4, "text-anchor": "middle", class: "chart-axis" }, svg).textContent = xLabel;
    el("text", {
      x: -(margin.top + plotH / 2), y: 12, "text-anchor": "middle", class: "chart-axis",
      transform: "rotate(-90)",
    }, svg).textContent = yLabel;

    data.forEach((d) => {
      const cx = xScale(d.x), cy = yScale(d.y);
      const isCalledOut = labelPredicate && labelPredicate(d);
      // Showing an emoji on all ~36 points gets cluttered fast in a tight
      // cluster - reserve it for the handful of called-out standouts, so it
      // adds a visual highlight instead of noise; everything else stays a
      // quiet dot.
      const emoji = isCalledOut && emojiFor && emojiFor(d);
      if (emoji) {
        el("text", {
          x: cx, y: cy, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 17,
        }, svg).textContent = emoji;
      } else {
        el("circle", {
          cx, cy, r: isCalledOut ? 5 : 4, fill: "var(--series-1)",
          opacity: isCalledOut ? 0.9 : 0.45, class: "chart-mark", stroke: "var(--surface)", "stroke-width": 1.5,
        }, svg);
      }
      if (isCalledOut) {
        el("text", { x: cx + (emoji ? 11 : 7), y: cy + 3, class: "chart-direct-label" }, svg).textContent = d.label;
      }
      const hit = el("circle", { cx, cy, r: 12, class: "chart-hit" }, svg);
      hit.addEventListener("pointerenter", () => showTip(d, cx, cy));
      hit.addEventListener("pointermove", () => showTip(d, cx, cy));
      hit.addEventListener("pointerleave", hideTip);
    });

    function showTip(d, x, y) {
      tip.innerHTML = "";
      const title = document.createElement("div");
      title.className = "tt-title";
      title.textContent = d.label;
      const r1 = document.createElement("div");
      r1.className = "tt-row";
      r1.innerHTML = "";
      const xRow = document.createElement("div");
      xRow.className = "tt-row";
      xRow.textContent = `${xLabel}: `;
      const xv = document.createElement("span");
      xv.className = "tt-value";
      xv.textContent = ` ${d.x}`;
      xRow.appendChild(xv);
      const yRow = document.createElement("div");
      yRow.className = "tt-row";
      yRow.textContent = `${yLabel}: `;
      const yv = document.createElement("span");
      yv.className = "tt-value";
      yv.textContent = ` ${d.y}`;
      yRow.appendChild(yv);
      tip.appendChild(title);
      tip.appendChild(xRow);
      tip.appendChild(yRow);
      tip.classList.add("visible");
      positionTooltip(tip, container, x, y);
    }
    function hideTip() { tip.classList.remove("visible"); }
  }

  global.Charts = { barChart, divergingBarChart, lineChart, dumbbellChart, scatterChart, seriesColor, formatNumber, flagChipDOM };
})(window);
