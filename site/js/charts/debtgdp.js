// Chart 3d: gross federal debt next to nominal GDP, both in trillions of
// dollars, quarterly. One axis: the two are the same unit, so the gap between
// the lines is the story (the debt line crossing the GDP line is the year the
// debt passed one year of the economy's output).
import { load, fmt, parseDate, scaffold, fillTable, onWidth } from "./common.js";
import { timeline } from "./timeline.js";

const tn = (v) => `$${d3.format(".1f")(v)}T`;

export async function render(figure) {
  const data = await load("debt_vs_gdp");
  const debt = data.debt.map(([d, v]) => [parseDate(d), v]);
  const gdp = data.gdp.map(([d, v]) => [parseDate(d), v]);
  const last = debt.length - 1;
  // First quarter the debt line sits above the GDP line.
  const cross = debt.findIndex(([, v], i) => v > gdp[i][1]);

  const { plot, table } = scaffold(figure);
  fillTable(table, [
    { label: "Quarter", value: (i) => fmt.quarter(debt[i][0]) },
    { label: "Gross federal debt, $ trillions", num: true, value: (i) => d3.format(".2f")(debt[i][1]) },
    { label: "GDP (annual rate), $ trillions", num: true, value: (i) => d3.format(".2f")(gdp[i][1]) },
    { label: "Debt, % of GDP", num: true, value: (i) => fmt.pct1((debt[i][1] / gdp[i][1]) * 100) },
  ], d3.range(debt.length), "Gross federal debt and nominal GDP by quarter, trillions of dollars");

  const top = Math.ceil(d3.max([...debt, ...gdp], (p) => p[1]) / 10) * 10;
  const chart = timeline(plot, {
    series: [
      { key: "debt", label: "Gross federal debt", short: "Debt", color: "var(--series-1)", points: debt },
      { key: "gdp", label: "GDP (one year of output)", short: "GDP", color: "var(--series-ink)", points: gdp },
    ],
    height: (w) => Math.max(260, Math.min(380, w * 0.52)),
    y: { domain: [0, top], ticks: d3.range(0, top + 1, 10), format: (v) => (v === 0 ? "0" : `$${v}T`) },
    value: tn,
    xTip: fmt.quarter,
    notes: cross > 0 ? [{ at: debt[cross][0], series: "debt", text: `Debt passes GDP, ${debt[cross][0].getUTCFullYear()}`, dx: -8, dy: -12, anchor: "end" }] : [],
    label: `Line chart of gross federal debt and nominal GDP in trillions of dollars, ${fmt.quarter(debt[0][0])} to ${fmt.quarter(debt[last][0])}. ${fmt.quarter(debt[last][0])}: debt ${tn(debt[last][1])}, GDP ${tn(gdp[last][1])}.`,
    endLabels: true,
  });
  onWidth(plot, chart.draw);
}
