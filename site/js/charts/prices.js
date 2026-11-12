// Chart 1a: prices and wages, indexed so the base-year average = 100, with
// a switch between base years (2000 or 1985, shared with Chart 1b).
// Lines: overall CPI (gray, the reference), four core costs (categorical
// slots 1-4) and median weekly earnings (ink). Chips toggle lines; a
// crosshair tooltip lists every visible line at the pointer's month.
import { load, fmt, parseDate, scaffold, fillTable, chips, baseYearSwitch, onWidth, showTip, moveTip, hideTip, screenPoint } from "./common.js";

// Display order and colors (CSS custom properties in styles.css).
const STYLE = {
  tuition: { short: "Tuition", color: "var(--series-1)", label: "College tuition" },
  rent: { short: "Rent", color: "var(--series-2)", label: "Rent" },
  medical: { short: "Medical", color: "var(--series-3)", label: "Medical care" },
  shelter: { short: "Shelter", color: "var(--series-4)", label: "Shelter" },
  wages: { short: "Wages", color: "var(--series-ink)", label: "Median weekly earnings" },
  cpi: { short: "All items", color: "var(--series-ref)", label: "All items (overall CPI)" },
};

export async function render(figure) {
  const data = await load("prices_index");
  const bisect = d3.bisector((p) => p[0]).right;
  // The value of a line at a date: the latest observation on or before it
  // (wages are quarterly, so they hold for the quarter's three months).
  const valueAt = (line, date) => {
    const i = bisect(line.points, date) - 1;
    return i >= 0 ? line.points[i][1] : null;
  };

  const { controls, plot, table } = scaffold(figure, { controls: true });

  // Everything that depends on the base year; setView() swaps it.
  let base, lines, months, last, summary;
  function setView(year) {
    const view = data.views.find((v) => v.base_year === year);
    base = year;
    lines = Object.keys(STYLE).map((key) => {
      const l = view.lines.find((x) => x.key === key);
      return { ...l, ...STYLE[key], points: l.points.map(([d, v]) => [parseDate(d), v]) };
    });
    months = lines.find((l) => l.key === "cpi").points.map((p) => p[0]);
    last = months[months.length - 1];
    summary = lines.map((l) => `${l.label} ${fmt.index(valueAt(l, last))}`).join(", ");
    focusIndex = months.length - 1;
    // Table view: one row per year (that year's last observation), every line.
    const years = d3.groups(months, (d) => d.getUTCFullYear()).map(([, ds]) => ds[ds.length - 1]);
    fillTable(table, [
      { label: "Month", value: (d) => fmt.month(d) },
      ...lines.map((l) => ({ label: l.label, num: true, value: (d) => fmt.index(valueAt(l, d)) })),
    ], years, `Prices and wages, index ${year} = 100`);
  }

  let visible = new Set(Object.keys(STYLE));
  let focusIndex = 0;
  setView(data.views[0].base_year);
  baseYearSwitch(controls, data.views.map((v) => v.base_year), (year) => { setView(year); if (width) draw(); });
  chips(controls, Object.keys(STYLE).map((key) => ({ key, ...STYLE[key] })), (on) => { visible = on; draw(); });

  let width = 0;
  function draw(w = width) {
    width = w;
    const height = Math.max(260, Math.min(400, width * 0.6));
    // End labels need room on the right; on phones the chips and tooltip carry identity instead.
    const labelled = width >= 500;
    const m = { top: 12, right: labelled ? 132 : 12, bottom: 28, left: 40 };
    const shown = lines.filter((l) => visible.has(l.key));

    const x = d3.scaleUtc().domain(d3.extent(months)).range([m.left, width - m.right]);
    const max = d3.max(shown, (l) => d3.max(l.points, (p) => p[1]));
    // Ticks from 100 (the base year) in round steps, with a little room below it.
    // The smallest step that gives at most six gridlines above 100.
    const step = [50, 100, 200, 500].find((st) => (Math.ceil(max / st) * st - 100) / st <= 6) ?? 500;
    const top = Math.ceil(max / step) * step;
    const y = d3.scaleLinear().domain([100 - step / 5, top]).range([height - m.bottom, m.top]);
    const yTicks = d3.range(100, top + 1, step);

    const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height)
      .attr("role", "img").attr("tabindex", 0)
      .attr("aria-label", `Line chart, index ${base} = 100, ${fmt.month(months[0])} to ${fmt.month(last)}. Latest values: ${summary}. Use the left and right arrow keys to read values by month.`);

    svg.append("g").attr("class", "grid")
      .selectAll("line").data(yTicks).join("line")
      .attr("x1", m.left).attr("x2", width - m.right).attr("y1", y).attr("y2", y)
      .classed("base", (d) => d === 100);
    svg.append("g").attr("class", "axis")
      .selectAll("text").data(yTicks).join("text")
      .attr("x", m.left - 6).attr("y", y).attr("dy", "0.32em").attr("text-anchor", "end")
      .text(fmt.index);
    svg.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${height - m.bottom})`)
      .call(d3.axisBottom(x).ticks(width < 500 ? 4 : 8).tickSize(0).tickPadding(10))
      .call((g) => g.select(".domain").remove());

    const line = d3.line().x((p) => x(p[0])).y((p) => y(p[1]));
    svg.append("g").attr("class", "lines")
      .selectAll("path").data(shown).join("path")
      // fill="none" as an attribute too: without it (say, if styles.css fails
      // to load) the browser fills the area under each line with black.
      .attr("fill", "none").attr("d", (l) => line(l.points)).style("stroke", (l) => l.color);

    // End labels: name and latest value beside each line's last point. Where
    // lines end close together the labels are spread apart to stay readable,
    // and a short leader line in the series color ties each back to its line.
    if (labelled) {
      const gap = 15;
      const ends = shown
        .map((l) => ({ l, v: l.points[l.points.length - 1][1], ex: x(l.points[l.points.length - 1][0]) }))
        .map((e) => ({ ...e, y0: y(e.v), y: y(e.v) }))
        .sort((a, b) => a.y0 - b.y0);
      for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + gap);
      // If the stack ran off the bottom, push it back up.
      const over = ends.length ? ends[ends.length - 1].y - (height - m.bottom) : 0;
      if (over > 0) ends.forEach((e) => { e.y -= over; });
      for (let i = ends.length - 2; i >= 0; i--) ends[i].y = Math.min(ends[i].y, ends[i + 1].y - gap);
      const lx = width - m.right + 22;
      const g = svg.append("g").attr("class", "end-labels");
      // Connector in muted gray (a colored one bending away reads as data),
      // then a short key in the series color beside the label.
      g.selectAll("path").data(ends).join("path").attr("class", "leader")
        .attr("fill", "none")
        .attr("d", (e) => `M${e.ex + 4},${e.y0}C${e.ex + 12},${e.y0} ${lx - 12},${e.y} ${lx - 2},${e.y}`);
      g.selectAll("line").data(ends).join("line").attr("class", "key")
        .attr("x1", lx).attr("x2", lx + 10).attr("y1", (e) => e.y).attr("y2", (e) => e.y)
        .style("stroke", (e) => e.l.color);
      g.selectAll("text").data(ends).join("text")
        .attr("x", lx + 14).attr("y", (e) => e.y).attr("dy", "0.32em")
        .text((e) => `${e.l.short} ${fmt.index(e.v)}`);
    }

    // Hover layer: a crosshair that snaps to the nearest month.
    const cross = svg.append("g").attr("class", "crosshair").style("display", "none");
    cross.append("line").attr("y1", m.top).attr("y2", height - m.bottom);
    const dots = cross.selectAll("circle").data(shown).join("circle").attr("r", 4).style("fill", (l) => l.color);

    function focusOn(i, clientX, clientY) {
      focusIndex = i;
      const d = months[i];
      const cx = x(d);
      cross.style("display", null).attr("transform", `translate(${cx},0)`);
      cross.select("line").attr("x1", 0).attr("x2", 0);
      dots.attr("cy", (l) => y(valueAt(l, d)));
      const rows = shown
        .map((l) => ({ l, v: valueAt(l, d) }))
        .sort((a, b) => b.v - a.v)
        .map(({ l, v }) => ({ value: `${fmt.index(v)} (${fmt.pct(v - 100)})`, label: l.label, key: l.color }));
      if (clientX == null) [clientX, clientY] = screenPoint(svg.node(), cx, m.top);
      showTip(`${fmt.month(d)} · change since ${base}`, rows, clientX, clientY);
    }
    const nearest = (event) => {
      const [px] = d3.pointer(event);
      const i = d3.bisector((d) => d).center(months, x.invert(px));
      return Math.max(0, Math.min(months.length - 1, i));
    };
    // Rebuild the tooltip only when the month changes; otherwise just move it.
    let hovered = -1;
    svg
      .on("pointerenter pointermove", (event) => {
        const i = nearest(event);
        if (i !== hovered) { hovered = i; focusOn(i, event.clientX, event.clientY); }
        else moveTip(event.clientX, event.clientY);
      })
      .on("pointerleave", () => { hovered = -1; cross.style("display", "none"); hideTip(); })
      .on("focus", () => focusOn(focusIndex))
      .on("blur", () => { cross.style("display", "none"); hideTip(); })
      .on("keydown", (event) => {
        const step = { ArrowLeft: -1, ArrowRight: 1, PageUp: -12, PageDown: 12 }[event.key];
        if (step) {
          event.preventDefault();
          focusOn(Math.max(0, Math.min(months.length - 1, focusIndex + (event.shiftKey ? step * 12 : step))));
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          focusOn(event.key === "Home" ? 0 : months.length - 1);
        } else if (event.key === "Escape") { cross.style("display", "none"); hideTip(); }
      });

    plot.replaceChildren(svg.node());
  }
  onWidth(plot, draw);
}
