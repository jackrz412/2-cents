// Shared pieces for every chart: data loading, the hover tooltip, the "Show
// the data" table, number formats, and redraw-on-resize. Each chart module
// imports what it needs. d3 is a global from the <script> tag in index.html.

// The build adds ?v=<version> to this file's URL (build_site.py). Data
// requests carry the same version, so a refresh never pairs new charts
// with old cached data.
const VERSION = new URL(import.meta.url).searchParams.get("v");
export const asset = (path) => (VERSION ? `${path}?v=${VERSION}` : path);

const cache = new Map();
// Fetch a data/*.json file once, however many charts ask for it.
export function load(name) {
  if (!cache.has(name)) cache.set(name, d3.json(asset(`data/${name}.json`)));
  return cache.get(name);
}

// --- Formats -------------------------------------------------------------------
export const fmt = {
  index: d3.format(".0f"),
  // Signed percent change: "+92%", "−98%" (true minus sign).
  pct: (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${d3.format(".0f")(Math.abs(v))}%`,
  pct1: (v) => `${d3.format(".1f")(v)}%`,
  ratio: d3.format(".1f"),
  month: d3.utcFormat("%b %Y"),
  quarter: (d) => `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`,
};
export const parseDate = d3.utcParse("%Y-%m-%d");

// --- Tooltip -------------------------------------------------------------------
// One tooltip element for the whole page, as on the housing map: it follows
// the pointer, sits below-right of it, and flips to stay inside the window.
// Size is measured once per content change; moves are batched to one per frame.
const tip = document.createElement("div");
tip.className = "tooltip";
tip.setAttribute("aria-hidden", "true"); // the same values are in each chart's table
document.body.append(tip);
let tipSize = [0, 0];
let tipAt = [0, 0];
let tipFrame = 0;

// rows: [{ value, label, key? }] -> value first (strong), label second.
// key is a CSS color for a short line key, or omitted. Text goes in with
// textContent, never as HTML.
export function showTip(heading, rows, x, y) {
  const parts = [];
  if (heading) {
    const h = document.createElement("div");
    h.className = "tip-heading";
    h.textContent = heading;
    parts.push(h);
  }
  for (const r of rows) {
    const row = document.createElement("div");
    row.className = "tip-row";
    if (r.key) {
      const key = document.createElement("span");
      key.className = "tip-key";
      key.style.background = r.key;
      row.append(key);
    }
    const value = document.createElement("strong");
    value.textContent = r.value;
    const label = document.createElement("span");
    label.textContent = r.label;
    row.append(value, label);
    parts.push(row);
  }
  tip.replaceChildren(...parts);
  tip.classList.add("on");
  const { width, height } = tip.getBoundingClientRect();
  tipSize = [width, height];
  moveTip(x, y);
}

export function moveTip(x, y) {
  tipAt = [x, y];
  if (tipFrame) return;
  tipFrame = requestAnimationFrame(() => {
    tipFrame = 0;
    const [px, py] = tipAt;
    const [w, h] = tipSize;
    const pad = 14;
    let left = px + pad;
    let top = py + pad;
    if (left + w > window.innerWidth - 8) left = px - w - pad;
    if (top + h > window.innerHeight - 8) top = py - h - pad;
    tip.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
  });
}

export function hideTip() {
  tip.classList.remove("on");
}

// Keyboard focus has no pointer: anchor the tooltip to a point inside an SVG.
export function screenPoint(svg, x, y) {
  const r = svg.getBoundingClientRect();
  return [r.left + x, r.top + y];
}

// --- Chart scaffold --------------------------------------------------------------
// Fills a <figure class="chart"> (title and source already in the HTML):
// an optional controls row, the plot box, and a closed "Show the data" table.
// Returns { controls, plot, table }.
export function scaffold(figure, { controls = false } = {}) {
  const parts = {};
  const caption = figure.querySelector("figcaption");
  if (controls) {
    parts.controls = document.createElement("div");
    parts.controls.className = "chart-controls";
    caption.after(parts.controls);
  }
  parts.plot = document.createElement("div");
  parts.plot.className = "chart-plot";
  (parts.controls ?? caption).after(parts.plot);

  const details = document.createElement("details");
  details.className = "chart-table";
  const summary = document.createElement("summary");
  summary.textContent = "Show the data";
  parts.table = document.createElement("div");
  parts.table.className = "table-scroll";
  details.append(summary, parts.table);
  figure.append(details);
  return parts;
}

// columns: [{ label, value: (row) => string, num?: true }]
export function fillTable(container, columns, rows, caption) {
  const table = document.createElement("table");
  if (caption) {
    const c = table.createCaption();
    c.textContent = caption;
    c.className = "visually-hidden";
  }
  const head = table.createTHead().insertRow();
  for (const col of columns) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = col.label;
    if (col.num) th.className = "num";
    head.append(th);
  }
  const body = table.createTBody();
  for (const row of rows) {
    const tr = body.insertRow();
    columns.forEach((col, i) => {
      const cell = i === 0 ? document.createElement("th") : document.createElement("td");
      if (i === 0) cell.scope = "row";
      cell.textContent = col.value(row);
      if (col.num) cell.className = "num";
      tr.append(cell);
    });
  }
  container.replaceChildren(table);
}

// Toggle chips: buttons with aria-pressed. items: [{ key, label, color, on }].
// onChange(set of keys that are on). The chip doubles as the legend, so each
// carries a line key in the series color.
export function chips(container, items, onChange, { keyShape = "line" } = {}) {
  const on = new Set(items.filter((i) => i.on !== false).map((i) => i.key));
  const group = document.createElement("div");
  group.className = "chips";
  group.setAttribute("role", "group");
  for (const item of items) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.setAttribute("aria-pressed", on.has(item.key));
    const key = document.createElement("span");
    key.className = `chip-key chip-key--${keyShape}`;
    key.style.setProperty("--key", item.color);
    const label = document.createElement("span");
    label.textContent = item.label;
    b.append(key, label);
    b.addEventListener("click", () => {
      if (on.has(item.key)) {
        if (on.size === 1) return; // keep at least one line on the chart
        on.delete(item.key);
      } else on.add(item.key);
      b.setAttribute("aria-pressed", on.has(item.key));
      onChange(new Set(on));
    });
    group.append(b);
  }
  container.append(group);
  return group;
}

// A segmented switch (one of n), for metric toggles. options: [{ key, label }].
export function segmented(container, label, options, current, onChange) {
  const group = document.createElement("div");
  group.className = "segmented";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", label);
  // Marks an option as selected without calling onChange (for syncing).
  const select = (key) => buttons.forEach((x, i) => x.setAttribute("aria-pressed", options[i].key === key));
  const buttons = options.map((o) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = o.label;
    b.setAttribute("aria-pressed", o.key === current);
    b.addEventListener("click", () => {
      select(o.key);
      onChange(o.key);
    });
    return b;
  });
  group.append(...buttons);
  container.append(group);
  return select;
}

// "Since 2000 | Since 1985", on both Chart 1a and 1b. The two switches stay
// in sync: flipping one redraws both charts, so they always agree.
const baseYearCharts = [];
export function baseYearSwitch(container, years, onChange) {
  if (years.length < 2) return; // nothing to switch between
  const select = segmented(container, "Base year",
    years.map((y) => ({ key: y, label: `Since ${y}` })), years[0],
    (year) => baseYearCharts.forEach((chart) => chart(year)));
  baseYearCharts.push((year) => { select(year); onChange(year); });
}

// Redraw when the plot box changes width (phone rotation, window resize).
// draw(width) builds the SVG from scratch; charts are small, so that's cheap.
export function onWidth(el, draw) {
  let last = 0;
  new ResizeObserver(([entry]) => {
    const w = Math.round(entry.contentRect.width);
    if (w && w !== last) {
      last = w;
      draw(w);
    }
  }).observe(el);
}

// Read a CSS custom property, so charts use the same tokens as the stylesheet
// (and pick up dark mode). Only for values D3 needs as strings, e.g. tooltip keys.
export function token(el, name) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}
