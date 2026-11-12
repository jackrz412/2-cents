// Chart 4a: relative poverty across OECD countries (share of people with
// disposable income below half their country's median), each country's
// latest year. The US in the accent color, every other country gray, so the
// one bar the story is about stands out; a rule marks the OECD median.
import { load, fmt, scaffold, fillTable, onWidth, showTip, moveTip, hideTip } from "./common.js";

export async function render(figure) {
  const rows = await load("relative_poverty"); // sorted, highest rate first
  const median = d3.median(rows, (d) => d.rate);
  const us = rows.find((d) => d.iso3 === "USA");
  const rank = rows.indexOf(us) + 1;

  const { plot, table } = scaffold(figure);
  fillTable(table, [
    { label: "Country", value: (d) => d.name },
    { label: "Relative poverty rate, %", num: true, value: (d) => fmt.pct1(d.rate) },
    { label: "Year", num: true, value: (d) => String(d.year) },
  ], rows, "Relative poverty rate by OECD country, latest year");

  const isUS = (d) => d.iso3 === "USA";
  onWidth(plot, (width) => {
    const narrow = width < 560;
    const band = 20;
    const m = { top: 22, right: 48, bottom: 6, left: narrow ? 104 : 150 };
    const height = m.top + band * rows.length + m.bottom;
    const x = d3.scaleLinear().domain([0, Math.ceil(d3.max(rows, (d) => d.rate) / 5) * 5])
      .range([m.left, width - m.right]);
    const y = d3.scaleBand().domain(rows.map((d) => d.iso3)).range([m.top, height - m.bottom]).paddingInner(0.25);
    const h = Math.min(14, y.bandwidth());

    const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height)
      .attr("role", "img")
      .attr("aria-label", `Bar chart of relative poverty in ${rows.length} OECD countries. United States: ${fmt.pct1(us.rate)} (${us.year}), ${rank === 1 ? "highest" : `number ${rank} of ${rows.length}`}. OECD median: ${fmt.pct1(median)}.`);

    const ticks = x.ticks(narrow ? 4 : 5);
    svg.append("g").attr("class", "grid")
      .selectAll("line").data(ticks).join("line")
      .attr("x1", x).attr("x2", x).attr("y1", m.top).attr("y2", height - m.bottom)
      .classed("base", (d) => d === 0);
    svg.append("g").attr("class", "axis")
      .selectAll("text").data(ticks).join("text")
      .attr("x", x).attr("y", m.top - 8).attr("text-anchor", "middle").text((d) => `${d}%`);

    // Bars, 4px rounded at the data end only.
    const bar = (d) => {
      const x0 = x(0), x1 = x(d.rate), top = y(d.iso3) + (y.bandwidth() - h) / 2, r = Math.min(4, (x1 - x0) / 2);
      return `M${x0},${top}H${x1 - r}a${r},${r} 0 0 1 ${r},${r}V${top + h - r}a${r},${r} 0 0 1 ${-r},${r}H${x0}Z`;
    };
    const rowsG = svg.append("g").selectAll("g").data(rows).join("g")
      .attr("class", "bar-row").classed("focus", isUS);
    rowsG.append("rect").attr("class", "hit").attr("fill", "transparent")
      .attr("x", 0).attr("width", width).attr("y", (d) => y(d.iso3)).attr("height", y.step());
    rowsG.append("path").attr("class", "bar").attr("d", bar)
      .style("fill", (d) => (isUS(d) ? "var(--series-1)" : "var(--series-ref)"));
    rowsG.append("text").attr("class", "label")
      .attr("x", m.left - 8).attr("y", (d) => y(d.iso3) + y.bandwidth() / 2).attr("dy", "0.32em")
      .attr("text-anchor", "end").text((d) => d.name);
    // Value at the tip for the US only; the rest are in the tooltip and table.
    rowsG.filter(isUS).append("text").attr("class", "value")
      .attr("x", (d) => x(d.rate) + 6).attr("y", (d) => y(d.iso3) + y.bandwidth() / 2).attr("dy", "0.32em")
      .text((d) => fmt.pct1(d.rate));

    const mx = x(median);
    const ref = svg.append("g").attr("class", "ref-line");
    ref.append("line").attr("x1", mx).attr("x2", mx).attr("y1", m.top - 2).attr("y2", height - m.bottom);
    ref.append("text").attr("x", mx + 4).attr("y", height - m.bottom - 4).text(`OECD median ${fmt.pct1(median)}`);

    rowsG
      .on("pointerenter", (event, d) => showTip(d.name, [
        { value: fmt.pct1(d.rate), label: `below half the median income, ${d.year}`, key: isUS(d) ? "var(--series-1)" : "var(--series-ref)" },
      ], event.clientX, event.clientY))
      .on("pointermove", (event) => moveTip(event.clientX, event.clientY))
      .on("pointerleave", hideTip);

    plot.replaceChildren(svg.node());
  });
}
