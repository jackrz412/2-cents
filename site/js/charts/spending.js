// Chart 3b: federal net interest vs. national defense, OMB Table 3.1, fiscal
// years, both in the same units. Switch between nominal dollars (the size of
// the bill) and % of GDP (the size relative to the economy).
import { load, fmt, scaffold, fillTable, segmented, onWidth } from "./common.js";
import { timeline } from "./timeline.js";

const fy = (y) => new Date(Date.UTC(y, 0, 1));
const UNITS = {
  bn: {
    label: "Dollars",
    field: (k) => `${k}_bn`,
    value: (v) => `$${d3.format(",.0f")(v)}B`,
    tick: (v) => (v === 0 ? "0" : v >= 1000 ? `$${d3.format(".1~f")(v / 1000)}T` : `$${v}B`),
    step: 200,
  },
  pct: {
    label: "% of GDP",
    field: (k) => `${k}_pct_gdp`,
    value: (v) => `${d3.format(".1f")(v)}%`,
    tick: (v) => `${v}%`,
    step: 10,
  },
};

export async function render(figure) {
  const rows = await load("interest_defense");
  const first = rows[0], last = rows[rows.length - 1];
  const { controls, plot, table } = scaffold(figure, { controls: true });
  let unit = "bn";
  let width = 0;
  segmented(controls, "Units", Object.entries(UNITS).map(([key, u]) => ({ key, label: u.label })), unit,
    (key) => { unit = key; if (width) draw(width); });

  fillTable(table, [
    { label: "Fiscal year", value: (r) => `FY${r.year}` },
    { label: "Net interest, $ billions", num: true, value: (r) => d3.format(",.1f")(r.interest_bn) },
    { label: "Defense, $ billions", num: true, value: (r) => d3.format(",.1f")(r.defense_bn) },
    { label: "Net interest, % of GDP", num: true, value: (r) => d3.format(".1f")(r.interest_pct_gdp) },
    { label: "Defense, % of GDP", num: true, value: (r) => d3.format(".1f")(r.defense_pct_gdp) },
  ], rows, "Federal net interest and national defense outlays");

  function draw(w) {
    width = w;
    const u = UNITS[unit];
    const pts = (k) => rows.map((r) => [fy(r.year), r[u.field(k)]]);
    const max = d3.max(rows, (r) => Math.max(r[u.field("interest")], r[u.field("defense")]));
    const top = Math.ceil(max / u.step) * u.step;
    timeline(plot, {
      series: [
        { key: "interest", label: "Net interest", short: "Interest", color: "var(--series-2)", points: pts("interest") },
        { key: "defense", label: "National defense", short: "Defense", color: "var(--series-1)", points: pts("defense") },
      ],
      height: (wd) => Math.max(240, Math.min(360, wd * 0.5)),
      y: { domain: [0, top], ticks: d3.range(0, top + 1, top / u.step > 6 ? u.step * 2 : u.step), format: u.tick },
      value: u.value,
      xTip: (d) => `FY${d.getUTCFullYear()}`,
      label: `Line chart of federal net interest and national defense outlays, ${u.label === "Dollars" ? "in billions of dollars" : "as a percentage of GDP"}, FY${first.year} to FY${last.year}. In FY${last.year}: net interest ${u.value(last[u.field("interest")])}, defense ${u.value(last[u.field("defense")])}.`,
      endLabels: true,
    }).draw(w);
  }
  onWidth(plot, draw);
}
