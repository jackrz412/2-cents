// Chart 2a: share of total household net worth by wealth group, stacked to
// 100%. The top 1% sits on the baseline, so its growth reads against a flat
// edge; groups are ordered, so they take one blue ramp (darkest = top 1%)
// rather than four unrelated hues. A crosshair tooltip lists all four.
import { load, fmt, parseDate, scaffold, fillTable, onWidth, showTip, moveTip, hideTip, screenPoint } from "./common.js";

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

  // Table: the last quarter of each year (Q4, or the latest quarter).
  const yearly = d3.groups(rows, (r) => r.date.getUTCFullYear()).map(([, rs]) => rs[rs.length - 1]);
  fillTable(table, [
    { label: "Quarter", value: (r) => fmt.quarter(r.date) },
    ...GROUPS.map((g) => ({ label: g.label, num: true, value: (r) => fmt.pct1(r[g.key]) })),
  ], yearly, "Share of household net worth by wealth group, percent");

  // The four shares sum to 100 within rounding; stack them as given.
  const series = d3.stack().keys(GROUPS.map((g) => g.key))(rows);

  let focusIndex = rows.length - 1;
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
    svg.append("g").attr("class", "areas")
      .selectAll("path").data(series).join("path")
      .attr("d", area).style("fill", (s, i) => GROUPS[i].fill);

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
      .style("fill", (s) => GROUPS.find((g) => g.key === s.key).ink)
      .text((s) => `${GROUPS.find((g) => g.key === s.key).label.split(" (")[0]} ${fmt.pct1(last[s.key])}`);

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
