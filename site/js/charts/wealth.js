// Chart 2a: share of total household net worth by wealth group, stacked to
// 100%. Stacked like the distribution itself: bottom 50% on the baseline,
// top 1% on top, so the legend and tooltip (top 1% first) read in the same
// order as the bands; groups are ordered, so they take one blue ramp (darkest = top 1%)
// rather than four unrelated hues. A crosshair tooltip lists all four.
import { load, fmt, parseDate, scaffold, fillTable, segmented, onWidth, showTip, moveTip, hideTip, screenPoint } from "./common.js";

const GROUPS = [
  { key: "top1", label: "Top 1%", fill: "var(--wealth-1)", ink: "var(--wealth-1-ink)" },
  { key: "next9", label: "Next 9% (90th–99th)", fill: "var(--wealth-2)", ink: "var(--wealth-2-ink)" },
  { key: "next40", label: "Next 40% (50th–90th)", fill: "var(--wealth-3)", ink: "var(--wealth-3-ink)" },
  { key: "bottom50", label: "Bottom 50%", fill: "var(--wealth-4)", ink: "var(--wealth-4-ink)" },
];

export async function render(figure) {
  const rows = (await load("wealth_shares")).map((r) => ({ ...r, date: parseDate(r.date) }));
  const first = rows[0], last = rows[rows.length - 1];

  const { controls, plot, table } = scaffold(figure, { controls: true });
  // Legend (swatches mirror the area marks).
  const legend = document.createElement("ul");
  legend.className = "legend";
  for (const g of GROUPS) {
    const li = document.createElement("li");
    const sw = document.createElement("span");
    sw.className = "legend-swatch";
    sw.style.background = g.fill;
    li.append(sw, document.createTextNode(g.label));
    legend.append(li);
  }
  controls.append(legend);

  // Companion graphic below the chart: 100 people and 100 coins, for the
  // first or the latest quarter. It redraws with the chart's width.
  const picto = document.createElement("div");
  picto.className = "pictogram";
  plot.after(picto);

  // Table: the last quarter of each year (Q4, or the latest quarter).
  const yearly = d3.groups(rows, (r) => r.date.getUTCFullYear()).map(([, rs]) => rs[rs.length - 1]);
  fillTable(table, [
    { label: "Quarter", value: (r) => fmt.quarter(r.date) },
    ...GROUPS.map((g) => ({ label: g.label, num: true, value: (r) => fmt.pct1(r[g.key]) })),
  ], yearly, "Share of household net worth by wealth group, percent");

  // The four shares sum to 100 within rounding. Stack from the bottom 50% up.
  const series = d3.stack().keys(GROUPS.map((g) => g.key).reverse())(rows);
  const groupOf = (key) => GROUPS.find((g) => g.key === key);

  let focusIndex = rows.length - 1;
  onWidth(picto, (width) => drawPictogram(picto, width, first, last));

  onWidth(plot, (width) => {
    const height = Math.max(260, Math.min(380, width * 0.55));
    const m = { top: 8, right: 12, bottom: 28, left: 40 };
    const x = d3.scaleUtc().domain([first.date, last.date]).range([m.left, width - m.right]);
    const y = d3.scaleLinear().domain([0, 100]).range([height - m.bottom, m.top]);

    const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height)
      .attr("role", "img").attr("tabindex", 0)
      .attr("aria-label", `Stacked area chart of the share of household net worth, ${fmt.quarter(first.date)} to ${fmt.quarter(last.date)}. ` +
        GROUPS.map((g) => `${g.label}: ${fmt.pct1(first[g.key])} to ${fmt.pct1(last[g.key])}`).join("; ") +
        ". Use the left and right arrow keys to read values by quarter.");

    const area = d3.area().x((d) => x(d.data.date)).y0((d) => y(d[0])).y1((d) => y(d[1]));
    bands = svg.append("g").attr("class", "areas")
      .selectAll("path").data(series).join("path")
      .attr("d", area).style("fill", (s) => groupOf(s.key).fill);
    highlightBands(pinned); // keep a group picked in the graphic below highlighted

    svg.append("g").attr("class", "axis")
      .selectAll("text").data([0, 25, 50, 75, 100]).join("text")
      .attr("x", m.left - 6).attr("y", y).attr("dy", "0.32em").attr("text-anchor", "end")
      .text((d) => `${d}%`);
    svg.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${height - m.bottom})`)
      .call(d3.axisBottom(x).ticks(width < 500 ? 4 : 8).tickSize(0).tickPadding(10))
      .call((g) => g.select(".domain").remove());

    // Direct labels inside the three wide bands, near the right edge where
    // the latest values are; the bottom 50% band (2-4%) is too thin to hold
    // text, so it relies on the legend and tooltip.
    const lx = x(last.date) - 8;
    svg.append("g").attr("class", "band-labels")
      .selectAll("text").data(series.filter((s) => last[s.key] >= 10)).join("text")
      .attr("x", lx).attr("y", (s) => y((s[s.length - 1][0] + s[s.length - 1][1]) / 2))
      .attr("dy", "0.32em").attr("text-anchor", "end")
      .style("fill", (s) => groupOf(s.key).ink)
      .text((s) => `${groupOf(s.key).label.split(" (")[0]} ${fmt.pct1(last[s.key])}`);

    const cross = svg.append("g").attr("class", "crosshair").style("display", "none");
    cross.append("line").attr("y1", m.top).attr("y2", height - m.bottom);

    function focusOn(i, cx, cy) {
      focusIndex = i;
      const r = rows[i];
      const px = x(r.date);
      cross.style("display", null).attr("transform", `translate(${px},0)`);
      if (cx == null) [cx, cy] = screenPoint(svg.node(), px, m.top);
      showTip(fmt.quarter(r.date), GROUPS.map((g) => ({ value: fmt.pct1(r[g.key]), label: g.label, key: g.fill })), cx, cy);
    }
    const hide = () => { hovered = -1; cross.style("display", "none"); hideTip(); };
    let hovered = -1;
    svg
      .on("pointerenter pointermove", (event) => {
        const i = d3.bisector((r) => r.date).center(rows, x.invert(d3.pointer(event)[0]));
        if (i !== hovered) { hovered = i; focusOn(i, event.clientX, event.clientY); }
        else moveTip(event.clientX, event.clientY);
      })
      .on("pointerleave blur", hide)
      .on("focus", () => focusOn(focusIndex))
      .on("keydown", (event) => {
        const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
        if (step) {
          event.preventDefault();
          focusOn(Math.max(0, Math.min(rows.length - 1, focusIndex + (event.shiftKey ? step * 4 : step))));
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          focusOn(event.key === "Home" ? 0 : rows.length - 1);
        } else if (event.key === "Escape") hide();
      });

    plot.replaceChildren(svg.node());
  });
}

// --- "100 people, 100 coins" ---------------------------------------------------
// Two 10x10 grids. People are split by the size of each group (1 / 9 / 40 /
// 50: fixed by definition); coins by each group's share of total net worth,
// rounded to whole coins so they add to exactly 100 (largest remainder:
// round down, then give the leftover coins to the groups with the biggest
// fractions). A switch shows the first quarter (1989) or the latest, and the
// coins that change hands animate over. Picking a group highlights it in both
// grids and in the area chart above, and states its coins per person.
const PEOPLE = { top1: 1, next9: 9, next40: 40, bottom50: 50 };
// State shared across redraws (window resizes) and with the area chart.
let pinned = null;      // the group a key button has pinned, or null
let view = "last";      // "first" (1989) or "last" (latest quarter)
let introDone = false;  // the fill-in animation runs once per page view
let bands = null;       // the area chart's band paths
const highlightBands = (key) => bands?.classed("dim", (s) => key != null && s.key !== key);
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function wholeCoins(row) {
  const raw = GROUPS.map((g) => ({ key: g.key, v: row[g.key] * 100 / d3.sum(GROUPS, (h) => row[h.key]) }));
  raw.forEach((r) => { r.n = Math.floor(r.v); });
  let left = 100 - d3.sum(raw, (r) => r.n);
  [...raw].sort((a, b) => (b.v - b.n) - (a.v - a.n)).forEach((r) => { if (left > 0) { r.n += 1; left -= 1; } });
  return Object.fromEntries(raw.map((r) => [r.key, r.n]));
}

// Icons in a 10x10 unit box: a person (head and shoulders) and a coin
// (the page's penny motif: a disc with an inner ring).
const PERSON = "M5,1.2a2,2 0 1 1 0,4a2,2 0 1 1 0,-4ZM1.6,9.4C1.6,7.2 3.1,5.9 5,5.9S8.4,7.2 8.4,9.4Z";
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const shortName = (g) => g.label.split(" (")[0];

function drawPictogram(el, width, firstRow, lastRow) {
  const rowOf = () => (view === "first" ? firstRow : lastRow);
  const groupsFor = (row) => {
    const coins = wholeCoins(row);
    return GROUPS.map((g) => ({ ...g, people: PEOPLE[g.key], coins: coins[g.key], share: row[g.key] }));
  };
  let groups = groupsFor(rowOf());
  const byKey = () => new Map(groups.map((g) => [g.key, g]));

  // The two grids fill most of the chart's width: cells grow with the
  // width, up to 38px (about 820px for both grids on desktop).
  const gap = width < 420 ? 16 : width < 700 ? 40 : 64;
  const cell = Math.max(12, Math.min(38, Math.floor((width - gap) / 20)));
  const side = cell * 10;
  const titleH = 22;
  const total = side * 2 + gap;
  const at = (i) => `translate(${(i % 10) * cell},${Math.floor(i / 10) * cell}) scale(${cell / 10})`;

  // One unit per cell, in reading order, group by group (top 1% first).
  // Each unit carries only its group key; counts are looked up from `groups`.
  const units = (field) => groups.flatMap((g) => d3.range(g[field]).map(() => g.key));

  const svg = d3.create("svg")
    .attr("viewBox", `0 0 ${total} ${side + titleH}`).attr("width", total).attr("height", side + titleH)
    .attr("role", "img");
  const label = () => `If the US were 100 people and its household wealth were 100 coins (${fmt.quarter(rowOf().date)}): ` +
    groups.map((g) => `${shortName(g)}, ${plural(g.people, "person", "people")}, ${plural(g.coins, "coin", "coins")}`).join("; ") + ".";

  const grid = (x0, title) => {
    const g = svg.append("g").attr("transform", `translate(${x0},0)`);
    g.append("text").attr("class", "picto-title").attr("y", 14).text(title);
    return g.append("g").attr("transform", `translate(0,${titleH})`);
  };
  const fillOf = (key) => GROUPS.find((g) => g.key === key).fill;
  const people = grid(0, "100 people").selectAll("g").data(units("people")).join("g")
    .attr("class", "unit person-unit").attr("transform", (d, i) => at(i)).style("--order", (d, i) => i);
  people.append("path").attr("d", PERSON).style("fill", fillOf);
  const coins = grid(side + gap, "100 coins of wealth").selectAll("g").data(units("coins")).join("g")
    .attr("class", "unit coin-unit").attr("transform", (d, i) => at(i)).style("--order", (d, i) => i);
  coins.append("circle").attr("class", "coin-face").attr("cx", 5).attr("cy", 5).attr("r", 4.2).style("fill", fillOf);
  coins.append("circle").attr("class", "coin-ring").attr("cx", 5).attr("cy", 5).attr("r", 2.8).attr("fill", "none");

  // Highlighting: hovering a unit or key button previews a group; clicking
  // pins it until clicked again. The area chart above follows along.
  const all = svg.selectAll(".unit");
  const show = (key) => {
    all.classed("dim", (k) => key != null && k !== key);
    highlightBands(key);
    stat(key);
  };
  const tipRows = (g) => [
    { value: `${g.people} of 100`, label: "people" },
    { value: fmt.pct1(g.share), label: `of household wealth (${plural(g.coins, "coin", "coins")})` },
  ];
  all.on("pointerenter", (event, k) => { show(k); const g = byKey().get(k); showTip(g.label, tipRows(g), event.clientX, event.clientY); })
    .on("pointermove", (event) => moveTip(event.clientX, event.clientY))
    .on("pointerleave", () => { show(pinned); hideTip(); })
    .on("click", (event, k) => pin(pinned === k ? null : k));

  // Coins per person: the one line that turns the grids into a ratio. Uses
  // the exact shares, not the rounded coins.
  const perPerson = (g) => g.share / g.people; // coins (percent of wealth) per percent of people
  const statEl = document.createElement("p");
  statEl.className = "picto-stat";
  statEl.setAttribute("aria-live", "polite");
  const num = (v) => (v >= 10 ? d3.format(".0f")(v) : v >= 1 ? d3.format(".1f")(v) : d3.format(".2f")(v));
  function stat(key) {
    const m = byKey();
    const top = m.get("top1"), bottom = m.get("bottom50");
    const strong = (t) => { const b = document.createElement("strong"); b.textContent = t; return b; };
    if (key == null) {
      statEl.replaceChildren("Per person, the top 1% hold ", strong(`about ${d3.format(",")(+d3.format(".2r")(perPerson(top) / perPerson(bottom)))}×`),
        " as much wealth as the bottom 50%.");
      return;
    }
    const g = m.get(key);
    const each = g.people === 1 ? "" : `: ${num(perPerson(g))} each`;
    statEl.replaceChildren(strong(shortName(g)), `: ${plural(g.coins, "coin", "coins")} ${g.people === 1 ? "for 1 person" : `shared by ${g.people} people`}${each}.`);
  }

  // Then / now switch: re-split the coins and let the ones that change
  // group animate over, one after another in reading order.
  const when = document.createElement("p");
  when.className = "picto-when";
  const setWhen = () => { when.textContent = `Shares of total household net worth, ${fmt.quarter(rowOf().date)}`; };
  const switchBox = document.createElement("div");
  switchBox.className = "picto-switch";
  segmented(switchBox, "Quarter", [
    { key: "first", label: fmt.quarter(firstRow.date) },
    { key: "last", label: fmt.quarter(lastRow.date) },
  ], view, (key) => {
    view = key;
    groups = groupsFor(rowOf());
    const next = units("coins");
    const t = reduceMotion() ? 0 : 450;
    coins.data(next).select(".coin-face")
      .transition().duration(t).delay((d, i) => (t ? i * 6 : 0))
      .style("fill", fillOf);
    buttons.forEach(([k, b]) => { b.querySelector(".counts").textContent = countsText(byKey().get(k)); });
    svg.attr("aria-label", label());
    setWhen();
    show(pinned);
  });

  // The key, as toggle buttons that state their counts.
  const countsText = (g) => `${plural(g.people, "person", "people")} · ${plural(g.coins, "coin", "coins")}`;
  const list = document.createElement("div");
  list.className = "picto-key";
  list.setAttribute("role", "group");
  list.setAttribute("aria-label", "Highlight a group");
  const buttons = groups.map((g) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "picto-button";
    const sw = document.createElement("span");
    sw.className = "legend-swatch";
    sw.style.background = g.fill;
    const counts = document.createElement("span");
    counts.className = "counts";
    counts.textContent = countsText(g);
    b.append(sw, Object.assign(document.createElement("strong"), { textContent: shortName(g) }), counts);
    b.addEventListener("click", () => pin(pinned === g.key ? null : g.key));
    b.addEventListener("pointerenter", () => show(g.key));
    b.addEventListener("pointerleave", () => show(pinned));
    b.addEventListener("focus", () => show(g.key));
    b.addEventListener("blur", () => show(pinned));
    list.append(b);
    return [g.key, b];
  });
  function pin(key) {
    pinned = key;
    buttons.forEach(([k, b]) => b.setAttribute("aria-pressed", k === key));
    show(key);
  }

  const heading = document.createElement("p");
  heading.className = "picto-heading";
  heading.textContent = "If the US were 100 people, and its household wealth were 100 coins";
  setWhen();
  svg.attr("aria-label", label());
  // The stat line goes below the buttons: its text changes on hover, and
  // anything above the buttons that changes height would move them out from
  // under the pointer.
  el.replaceChildren(heading, when, switchBox, svg.node(), list, statEl);
  pin(pinned);

  // First time the graphic scrolls into view: people appear, then the coins
  // drop in group by group, top 1% first. Skipped with reduced motion.
  if (!introDone && !reduceMotion()) {
    all.style("opacity", 0);
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      introDone = true;
      people.transition().duration(250).delay((d, i) => i * 5).style("opacity", null);
      coins.attr("transform", (d, i) => `${at(i)} translate(0,-6)`)
        .transition().duration(300).delay((d, i) => 600 + i * 9).ease(d3.easeBackOut)
        .style("opacity", null).attr("transform", (d, i) => at(i));
    }, { threshold: 0.4 });
    io.observe(el);
  } else {
    introDone = true;
  }
}
