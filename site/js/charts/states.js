// Map 1: state choropleth, home price to income (default) or rent burden.
// Same approach as the housing map: unprojected TopoJSON drawn with
// d3.geoAlbersUsa (Alaska and Hawaii inset), a threshold scale with fixed
// benchmark breaks, the housing map's warm ramp, a pointer tooltip, and
// arrow-key navigation with one tab stop for the whole map.
import { load, asset, fmt, scaffold, fillTable, segmented, onWidth, showTip, moveTip, hideTip } from "./common.js";

// The housing map's warm sequential ramp (layers.js, 5 classes), checked
// there for even lightness steps and colorblind separation. Same colors in
// light and dark mode.
const WARM5 = ["#ffeccd", "#feaf4c", "#de7802", "#af4c0d", "#6b372a"];

// Breaks are fixed benchmarks, not quantiles, so a color means the same
// thing whatever the data year (LEARNING.md decision 2.4).
const METRICS = {
  price_to_income: {
    label: "Price to income",
    title: "Median home value ÷ median household income",
    breaks: [3, 4, 5, 6],
    format: (v) => `${fmt.ratio(v)}×`,
    tick: (v) => `${v}×`,
    describe: (us) => `years of household income (US ${fmt.ratio(us)}×)`,
  },
  rent_burden: {
    label: "Rent burden",
    title: "Median gross rent as % of household income (renters)",
    breaks: [28, 30, 32, 34],
    format: (v) => `${fmt.pct1(v)}`,
    tick: (v) => `${v}%`,
    describe: (us) => `of household income on rent (US ${fmt.pct1(us)})`,
  },
};

export async function render(figure) {
  const [data, topo] = await Promise.all([load("state_affordability"), d3.json(asset("geo/states-10m.json"))]);
  // Only the 50 states and DC (the data has those 51); territories drop out.
  const states = topojson.feature(topo, topo.objects.states).features
    .filter((f) => data.states[f.id])
    .sort((a, b) => d3.ascending(a.properties.name, b.properties.name));
  const borders = topojson.mesh(topo, topo.objects.states, (a, b) => a !== b);
  let metric = "price_to_income";

  const { controls, plot, table } = scaffold(figure, { controls: true });
  segmented(controls, "Map metric", Object.entries(METRICS).map(([key, m]) => ({ key, label: m.label })),
    metric, (key) => { metric = key; draw(); });
  const legend = document.createElement("div");
  legend.className = "map-legend";
  controls.append(legend);

  fillTable(table, [
    { label: "State", value: (f) => f.properties.name },
    { label: "Home price to income", num: true, value: (f) => fmt.ratio(data.states[f.id].price_to_income) },
    { label: "Rent as % of income", num: true, value: (f) => fmt.pct1(data.states[f.id].rent_burden) },
  ], states, `Housing affordability by state, ACS ${data.acs_vintage}`);

  let width = 0;
  let focused = states[0].id;
  function draw(w = width) {
    width = w;
    const meta = METRICS[metric];
    const value = (f) => data.states[f.id][metric];
    const us = data.us[metric];
    const color = d3.scaleThreshold().domain(meta.breaks).range(WARM5);

    drawLegend(legend, meta, color);

    const height = Math.round(width * 0.62);
    const projection = d3.geoAlbersUsa().fitSize([width, height], { type: "FeatureCollection", features: states });
    const path = d3.geoPath(projection);
    const ranked = [...states].sort((a, b) => value(b) - value(a));
    const rank = new Map(ranked.map((f, i) => [f.id, i + 1]));

    const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height)
      .attr("role", "group")
      .attr("aria-label", `Map of ${meta.title} by state. Highest: ${ranked[0].properties.name}, ${meta.format(value(ranked[0]))}. Lowest: ${ranked[ranked.length - 1].properties.name}, ${meta.format(value(ranked[ranked.length - 1]))}. US: ${meta.format(us)}. Tab to the map, then use arrow keys to move between states.`);

    const paths = svg.append("g").attr("class", "states")
      .selectAll("path").data(states).join("path")
      .attr("d", path).style("fill", (f) => color(value(f)))
      .attr("tabindex", (f) => (f.id === focused ? 0 : -1))
      .attr("role", "img")
      .attr("aria-label", (f) => `${f.properties.name}: ${meta.format(value(f))}, rank ${rank.get(f.id)} of ${states.length}`);
    svg.append("path").attr("class", "state-borders").attr("d", path(borders));
    const outline = svg.append("path").attr("class", "hover-outline");

    const tipFor = (f, x, y) => {
      outline.attr("d", path(f));
      showTip(f.properties.name, [{ value: meta.format(value(f)), label: meta.describe(us) }], x, y);
    };
    const tipAtPath = (f, el) => {
      const r = el.getBoundingClientRect();
      tipFor(f, r.left + r.width / 2, r.top + r.height / 2);
    };
    const clear = () => { outline.attr("d", null); hideTip(); };

    paths
      .on("pointerenter", (event, f) => tipFor(f, event.clientX, event.clientY))
      .on("pointermove", (event) => moveTip(event.clientX, event.clientY))
      .on("pointerleave", (event) => { if (document.activeElement !== event.currentTarget) clear(); })
      .on("focus", (event, f) => {
        paths.attr("tabindex", (g) => (g.id === f.id ? 0 : -1));
        focused = f.id;
        tipAtPath(f, event.currentTarget);
      })
      .on("blur", clear)
      .on("keydown", (event, f) => {
        // Arrow keys move alphabetically (the same order as the table).
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (step) {
          event.preventDefault();
          const i = (states.indexOf(f) + step + states.length) % states.length;
          paths.nodes()[i].focus();
        } else if (event.key === "Escape") clear();
      });

    plot.replaceChildren(svg.node());
  }
  onWidth(plot, draw);
}

// Legend: one swatch per class with the break values between them.
function drawLegend(el, meta, color) {
  const title = document.createElement("p");
  title.className = "legend-title";
  title.textContent = meta.title;
  const row = document.createElement("div");
  row.className = "legend-scale";
  color.range().forEach((c, i) => {
    const cell = document.createElement("span");
    cell.className = "legend-cell";
    const sw = document.createElement("span");
    sw.className = "legend-swatch";
    sw.style.background = c;
    const t = document.createElement("span");
    t.className = "legend-tick";
    const b = meta.breaks;
    t.textContent = i === 0 ? `< ${meta.tick(b[0])}` : i === b.length ? `${meta.tick(b[i - 1])}+` : `${meta.tick(b[i - 1])}–${meta.tick(b[i])}`;
    cell.append(sw, t);
    row.append(cell);
  });
  el.replaceChildren(title, row);
}
