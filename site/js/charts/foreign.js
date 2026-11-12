// Chart 3c (small): two small panels on one time axis, never one chart with
// two y-scales. Left: share of federal debt held by the public that foreign
// and international investors hold. Right: the 10-year Treasury yield, as
// context for what it costs the government to borrow.
import { load, fmt, parseDate, scaffold, fillTable, onWidth } from "./common.js";
import { timeline } from "./timeline.js";

export async function render(figure) {
  const data = await load("foreign_holdings");
  const share = data.foreign_share.map(([d, v]) => [parseDate(d), v]);
  const yld = data.yield_10y.map(([d, v]) => [parseDate(d), v]);
  const peak = share.reduce((a, b) => (b[1] > a[1] ? b : a));
  const lastS = share[share.length - 1], lastY = yld[yld.length - 1];

  const { plot, table } = scaffold(figure);
  plot.classList.add("small-multiples");
  const panels = [
    { title: "Held by foreign investors, % of debt held by the public", cls: "panel-share" },
    { title: "10-year Treasury yield, %", cls: "panel-yield" },
  ].map((p) => {
    const box = document.createElement("div");
    box.className = `panel ${p.cls}`;
    const h = document.createElement("p");
    h.className = "panel-title";
    h.textContent = p.title;
    const area = document.createElement("div");
    area.className = "panel-plot";
    box.append(h, area);
    plot.append(box);
    return area;
  });

  // Table: one row per year (the last observation of each year).
  const byYear = d3.rollup(share, (v) => v[v.length - 1][1], (p) => p[0].getUTCFullYear());
  const yByYear = d3.rollup(yld, (v) => v[v.length - 1][1], (p) => p[0].getUTCFullYear());
  fillTable(table, [
    { label: "Year", value: (y) => String(y) },
    { label: "Foreign share of debt, %", num: true, value: (y) => (byYear.has(y) ? fmt.pct1(byYear.get(y)) : "—") },
    { label: "10-year yield, %", num: true, value: (y) => (yByYear.has(y) ? d3.format(".2f")(yByYear.get(y)) : "—") },
  ], [...new Set([...byYear.keys(), ...yByYear.keys()])].sort(), "Foreign holdings of federal debt and the 10-year Treasury yield, end of each year");

  const domainX = [share[0][0], d3.max([lastS[0], lastY[0]])];
  const common = { height: (w) => Math.max(200, Math.min(260, w * 0.62)), xTicks: (w) => (w < 400 ? 3 : 5), endLabels: false };
  const left = timeline(panels[0], {
    ...common,
    series: [{ key: "share", label: "Foreign share", color: "var(--series-1)", points: share }],
    y: { domain: [0, 60], ticks: [0, 20, 40, 60], format: (v) => `${v}%` },
    value: fmt.pct1,
    xTip: fmt.quarter,
    notes: [{ at: peak[0], series: "share", text: `Peak ${fmt.pct1(peak[1])}`, dx: 0, dy: -10 }],
    label: `Line chart of the foreign share of federal debt held by the public, ${fmt.quarter(share[0][0])} to ${fmt.quarter(lastS[0])}. Peak ${fmt.pct1(peak[1])} in ${fmt.quarter(peak[0])}; ${fmt.pct1(lastS[1])} now.`,
    domainX,
  });
  const right = timeline(panels[1], {
    ...common,
    series: [{ key: "yield", label: "10-year yield", color: "var(--series-ref)", points: yld }],
    y: { domain: [0, 16], ticks: [0, 4, 8, 12, 16], format: (v) => `${v}%` },
    value: (v) => `${d3.format(".2f")(v)}%`,
    xTip: fmt.month,
    label: `Line chart of the 10-year Treasury yield, monthly, ${fmt.month(yld[0][0])} to ${fmt.month(lastY[0])}; ${d3.format(".2f")(lastY[1])}% now.`,
    domainX,
  });
  onWidth(panels[0], left.draw);
  onWidth(panels[1], right.draw);
}
