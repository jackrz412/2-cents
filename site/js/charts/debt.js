// Chart 3a: federal debt held by the public, % of GDP. OMB history (solid,
// FY1940 on) and CBO's baseline projection (dashed, shaded span), with the
// three big jumps annotated. The projection starts from the last actual year
// so the two lines meet.
import { load, fmt, scaffold, fillTable, onWidth } from "./common.js";
import { timeline } from "./timeline.js";

const fy = (y) => new Date(Date.UTC(y, 0, 1));

export async function render(figure) {
  const data = await load("debt_gdp");
  const history = data.history.map(([y, v]) => [fy(y), v]);
  const projection = data.projection.map(([y, v]) => [fy(y), v]);
  const last = history[history.length - 1];
  const peak = history.reduce((a, b) => (b[1] > a[1] ? b : a));
  const end = projection[projection.length - 1];

  const { plot, table } = scaffold(figure);
  fillTable(table, [
    { label: "Fiscal year", value: (r) => `FY${r.year}` },
    { label: "Debt held by the public, % of GDP", num: true, value: (r) => fmt.pct1(r.v) },
    { label: "Kind", value: (r) => r.kind },
  ], [
    ...data.history.map(([year, v]) => ({ year, v, kind: "Actual (OMB)" })),
    ...data.projection.map(([year, v]) => ({ year, v, kind: `Projected (${data.projection_vintage})` })),
  ], "Federal debt held by the public as a percentage of GDP");

  const chart = timeline(plot, {
    series: [
      { key: "history", label: "Actual", short: "Actual", color: "var(--series-1)", points: history },
      { key: "projection", label: "CBO projection", short: "CBO", color: "var(--series-1)", points: projection, dashed: true, join: last },
    ],
    height: (w) => Math.max(260, Math.min(400, w * 0.55)),
    y: { domain: [0, 130], ticks: [0, 25, 50, 75, 100, 125], format: (v) => `${v}%` },
    value: fmt.pct1,
    xTip: (d) => `FY${d.getUTCFullYear()}`,
    label: `Line chart of federal debt held by the public as a percentage of GDP, FY${history[0][0].getUTCFullYear()} to FY${end[0].getUTCFullYear()}. Peak ${fmt.pct1(peak[1])} in FY${peak[0].getUTCFullYear()}; ${fmt.pct1(last[1])} in FY${last[0].getUTCFullYear()}; CBO projects ${fmt.pct1(end[1])} in FY${end[0].getUTCFullYear()}.`,
    shade: { from: projection[0][0], label: "Projection" },
    notes: [
      { at: peak[0], series: "history", text: "World War II", dx: 8, dy: -10, anchor: "start" },
      { at: fy(2009), series: "history", text: "2008 financial crisis", dx: -8, dy: 4, anchor: "end" },
      { at: fy(2020), series: "history", text: "COVID-19", dx: -8, dy: -8, anchor: "end" },
      { at: end[0], series: "projection", text: `${fmt.pct1(end[1])} in FY${end[0].getUTCFullYear()}`, dx: -4, dy: -14, anchor: "end" },
    ],
    endLabels: false,
  });
  onWidth(plot, chart.draw);
}
