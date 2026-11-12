// Chart 1b: % change in price since 2000, by CPI category, sorted. Rises in
// orange, falls in blue (a diverging pair: opposite meanings, opposite
// hues), overall CPI in gray as the reference bar, and a vertical rule
// for wage growth over the same span.
import { load, fmt, scaffold, fillTable, onWidth, showTip, moveTip, hideTip } from "./common.js";

export async function render(figure) {
  const data = await load("price_changes");
  const items = data.items; // already sorted, largest rise first
  const wage = data.wages.pct;

  const { plot, table } = scaffold(figure);
  fillTable(table, [
    { label: "Category", value: (d) => d.label },
    { label: "Change since 2000", num: true, value: (d) => fmt.pct(d.pct) },
  ], [...items, { label: "Median weekly earnings (wages)", pct: wage }],
  `Percent change in price since 2000, ${data.period}`);

  const colorOf = (d) => (d.key === "cpi" ? "var(--series-ref)" : d.pct >= 0 ? "var(--rise)" : "var(--fall)");

  onWidth(plot, (width) => {
    // On phones each category name sits above its bar instead of beside it,
    // so long names don't crowd the bars or get cut off.
    const narrow = width < 560;
    const band = narrow ? 36 : 26;
    const m = { top: 24, right: 52, bottom: 8, left: narrow ? 4 : 190 };
    const height = m.top + band * items.length + m.bottom;

    const x = d3.scaleLinear()
      .domain([d3.min(items, (d) => d.pct), d3.max(items, (d) => d.pct)]).nice()
      .range([m.left, width - m.right]);
    const y = d3.scaleBand().domain(items.map((d) => d.key))
      .range([m.top, height - m.bottom]).paddingInner(narrow ? 0.1 : 0.3);
    const h = narrow ? 14 : Math.min(18, y.bandwidth());
    // Vertical center of the bar within its band (below the name on phones).
    const mid = (d) => y(d.key) + (narrow ? y.bandwidth() - h / 2 - 2 : y.bandwidth() / 2);
    const ticks = narrow ? d3.range(x.domain()[0], x.domain()[1] + 1, 100) : x.ticks(6);

    const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height)
      .attr("role", "img")
      .attr("aria-label", `Bar chart of price change since 2000 by category. Largest rise: ${items[0].label}, ${fmt.pct(items[0].pct)}. Largest fall: ${items[items.length - 1].label}, ${fmt.pct(items[items.length - 1].pct)}. Wages: ${fmt.pct(wage)}.`);

    svg.append("g").attr("class", "grid")
      .selectAll("line").data(ticks).join("line")
      .attr("x1", x).attr("x2", x).attr("y1", m.top).attr("y2", height - m.bottom)
      .classed("base", (d) => d === 0);
    svg.append("g").attr("class", "axis")
      .selectAll("text").data(ticks).join("text")
      .attr("x", x).attr("y", m.top - 8)
      // The leftmost tick sits at the plot edge on phones; anchor it there so it isn't cut off.
      .attr("text-anchor", (d, i) => (narrow && i === 0 ? "start" : "middle"))
      .text((d) => (d === 0 ? "0" : fmt.pct(d)));

    // Bars: 4px round on the data end, square at zero. Drawn as a path so
    // only the far end is rounded.
    const r = 4;
    const bar = (d) => {
      const x0 = x(0), x1 = x(d.pct), top = mid(d) - h / 2;
      const dir = x1 >= x0 ? 1 : -1;
      const len = Math.abs(x1 - x0);
      const rr = Math.min(r, len / 2);
      const tip = x1 - dir * rr;
      return `M${x0},${top}H${tip}a${rr},${rr} 0 0 ${dir > 0 ? 1 : 0} ${dir * rr},${rr}V${top + h - rr}a${rr},${rr} 0 0 ${dir > 0 ? 1 : 0} ${-dir * rr},${rr}H${x0}Z`;
    };
    const rows = svg.append("g").selectAll("g").data(items).join("g").attr("class", "bar-row");
    // Hit target: the whole row, wider than the bar.
    rows.append("rect").attr("class", "hit").attr("fill", "transparent")
      .attr("x", 0).attr("width", width).attr("y", (d) => y(d.key) - 2).attr("height", y.step());
    rows.append("path").attr("class", "bar").attr("d", bar).style("fill", colorOf);
    rows.append("text").attr("class", "label")
      .attr("x", narrow ? m.left : m.left - 10)
      .attr("y", (d) => (narrow ? y(d.key) + 6 : mid(d))).attr("dy", "0.32em")
      .attr("text-anchor", narrow ? "start" : "end").text((d) => d.label);
    // Value at the tip, outside the bar.
    rows.append("text").attr("class", "value")
      .attr("x", (d) => x(d.pct) + (d.pct >= 0 ? 6 : -6))
      .attr("y", mid).attr("dy", "0.32em")
      .attr("text-anchor", (d) => (d.pct >= 0 ? "start" : "end"))
      .text((d) => fmt.pct(d.pct));
    // Negative bars run left into the label column, so their value goes
    // just right of zero instead of off the bar's end.
    rows.filter((d) => d.pct < 0).select(".value")
      .attr("x", x(0) + 6).attr("text-anchor", "start");

    // Wage reference line, labeled at the top.
    const wx = x(wage);
    const ref = svg.append("g").attr("class", "ref-line");
    ref.append("line").attr("x1", wx).attr("x2", wx).attr("y1", m.top - 2).attr("y2", height - m.bottom);
    ref.append("text").attr("x", wx + 4).attr("y", height - m.bottom - 4)
      .text(`Wages ${fmt.pct(wage)}`);

    rows
      .on("pointerenter", (event, d) => showTip(null, [
        { value: fmt.pct(d.pct), label: d.label, key: colorOf(d) },
        { value: fmt.pct(wage), label: "Median weekly earnings", key: "var(--series-ink)" },
      ], event.clientX, event.clientY))
      .on("pointermove", (event) => moveTip(event.clientX, event.clientY))
      .on("pointerleave", hideTip);

    plot.replaceChildren(svg.node());
  });
}
