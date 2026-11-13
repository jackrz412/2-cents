// A reusable line chart over time, for Section 3's charts: hairline grid,
// 2px lines, optional dashed (projected) series, optional shaded span,
// annotations, end labels, and the crosshair tooltip with arrow-key reading.
// Chart 1a has its own code (chips and two base years); this is the plain case.
//
// timeline(svgParent, opts).draw(width), where opts:
//   series: [{ key, label, short, color, points: [[Date, value]], dashed, join }]
//     join: a [Date, value] the path starts from (so a projection meets the
//     history line) without that point showing in the tooltip.
//   height: (width) => px
//   y: { domain: [lo, hi], ticks: [..], format: (v) => "50%" }
//   value: (v) => string for tooltips and end labels
//   xTip: (Date) => tooltip heading
//   xTicks: (width) => count
//   label: aria-label summary text
//   shade: { from: Date, label }   (e.g. the projection years)
//   notes: [{ at: Date, series: key, text, dx, dy, anchor }]   annotations
//   endLabels: true
//   domainX: [Date, Date]   shared x range, for small multiples
import { showTip, moveTip, hideTip, screenPoint } from "./common.js";

export function timeline(plot, opts) {
  const series = opts.series;
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => +p[0])))].sort((a, b) => a - b).map((t) => new Date(t));
  const lookup = new Map(series.map((s) => [s.key, new Map(s.points.map(([d, v]) => [+d, v]))]));
  const valueAt = (s, d) => lookup.get(s.key).get(+d);
  let focusIndex = xs.length - 1;

  function draw(width) {
    const height = opts.height(width);
    const labelled = opts.endLabels && width >= 500;
    const m = { top: 14, right: labelled ? 124 : 14, bottom: 28, left: 44 };
    const x = d3.scaleUtc().domain(opts.domainX ?? d3.extent(xs)).range([m.left, width - m.right]);
    const y = d3.scaleLinear().domain(opts.y.domain).range([height - m.bottom, m.top]);

    const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height)
      .attr("role", "img").attr("tabindex", 0)
      .attr("aria-label", `${opts.label} Use the left and right arrow keys to read values.`);

    if (opts.shade) {
      const x0 = x(opts.shade.from);
      const g = svg.append("g").attr("class", "shade");
      g.append("rect").attr("x", x0).attr("width", width - m.right - x0)
        .attr("y", m.top).attr("height", height - m.bottom - m.top);
      // Bottom-right inside the span: clear of the lines and their labels,
      // and never past the plot edge on phones.
      g.append("text").attr("x", width - m.right - 6).attr("y", height - m.bottom - 8)
        .attr("text-anchor", "end").text(opts.shade.label);
    }

    svg.append("g").attr("class", "grid")
      .selectAll("line").data(opts.y.ticks).join("line")
      .attr("x1", m.left).attr("x2", width - m.right).attr("y1", y).attr("y2", y)
      .classed("base", (d) => d === 0);
    svg.append("g").attr("class", "axis")
      .selectAll("text").data(opts.y.ticks).join("text")
      .attr("x", m.left - 6).attr("y", y).attr("dy", "0.32em").attr("text-anchor", "end")
      .text(opts.y.format);
    svg.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${height - m.bottom})`)
      .call(d3.axisBottom(x).ticks(opts.xTicks ? opts.xTicks(width) : width < 500 ? 4 : 8).tickSize(0).tickPadding(10))
      .call((g) => g.select(".domain").remove());

    const line = d3.line().x((p) => x(p[0])).y((p) => y(p[1]));
    svg.append("g").attr("class", "lines")
      .selectAll("path").data(series).join("path")
      .attr("fill", "none").style("stroke", (s) => s.color)
      .classed("dashed", (s) => s.dashed)
      .attr("d", (s) => line(s.join ? [s.join, ...s.points] : s.points));

    // Annotations: a dot on the line and a short label beside it.
    if (opts.notes) {
      const g = svg.append("g").attr("class", "notes");
      for (const n of opts.notes) {
        const s = series.find((t) => t.key === n.series);
        const v = valueAt(s, n.at);
        if (v == null) continue;
        const px = x(n.at), py = y(v);
        g.append("circle").attr("cx", px).attr("cy", py).attr("r", 4).style("fill", s.color);
        g.append("text").attr("x", px + (n.dx ?? 0)).attr("y", py + (n.dy ?? -12))
          .attr("text-anchor", n.anchor ?? "middle").text(n.text);
      }
    }

    // End labels, spread apart where lines end close together (as in Chart 1a).
    if (labelled) {
      const gap = 15;
      const ends = series.map((s) => {
        const [d, v] = s.points[s.points.length - 1];
        return { s, v, ex: x(d), y0: y(v), y: y(v) };
      }).sort((a, b) => a.y0 - b.y0);
      for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + gap);
      const lx = width - m.right + 22;
      const g = svg.append("g").attr("class", "end-labels");
      // Connector in muted gray (a colored one bending away reads as data),
      // then a short key in the series color beside the label.
      g.selectAll("path").data(ends).join("path").attr("class", "leader")
        .attr("fill", "none")
        .attr("d", (e) => `M${e.ex + 4},${e.y0}C${e.ex + 12},${e.y0} ${lx - 12},${e.y} ${lx - 2},${e.y}`);
      g.selectAll("line").data(ends).join("line").attr("class", "key")
        .attr("x1", lx).attr("x2", lx + 10).attr("y1", (e) => e.y).attr("y2", (e) => e.y)
        .style("stroke", (e) => e.s.color);
      g.selectAll("text").data(ends).join("text")
        .attr("x", lx + 14).attr("y", (e) => e.y).attr("dy", "0.32em")
        .text((e) => `${e.s.short} ${opts.value(e.v)}`);
    }

    // Crosshair tooltip, snapping to the nearest period with data.
    const cross = svg.append("g").attr("class", "crosshair").style("display", "none");
    cross.append("line").attr("y1", m.top).attr("y2", height - m.bottom);
    const dots = cross.selectAll("circle").data(series).join("circle").attr("r", 4).style("fill", (s) => s.color);

    function focusOn(i, cx, cy) {
      focusIndex = i;
      const d = xs[i];
      const px = x(d);
      cross.style("display", null).attr("transform", `translate(${px},0)`);
      dots.style("display", (s) => (valueAt(s, d) == null ? "none" : null))
        .attr("cy", (s) => (valueAt(s, d) == null ? 0 : y(valueAt(s, d))));
      const rows = series.filter((s) => valueAt(s, d) != null)
        .map((s) => ({ value: opts.value(valueAt(s, d)), label: s.label, key: s.color }));
      if (cx == null) [cx, cy] = screenPoint(svg.node(), px, m.top);
      showTip(opts.xTip(d), rows, cx, cy);
    }
    let hovered = -1;
    const hide = () => { hovered = -1; cross.style("display", "none"); hideTip(); };
    svg
      .on("pointerenter pointermove", (event) => {
        const i = d3.bisector((d) => d).center(xs, x.invert(d3.pointer(event)[0]));
        if (i !== hovered) { hovered = i; focusOn(i, event.clientX, event.clientY); }
        else moveTip(event.clientX, event.clientY);
      })
      .on("pointerleave blur", hide)
      .on("focus", () => focusOn(focusIndex))
      .on("keydown", (event) => {
        const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
        if (step) {
          event.preventDefault();
          focusOn(Math.max(0, Math.min(xs.length - 1, focusIndex + (event.shiftKey ? step * 10 : step))));
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          focusOn(event.key === "Home" ? 0 : xs.length - 1);
        } else if (event.key === "Escape") hide();
      });

    // Too narrow for end labels: a key above the plot instead, so the lines
    // are never told apart by color alone.
    if (opts.endLabels && !labelled) {
      const key = document.createElement("ul");
      key.className = "line-key";
      for (const s of series) {
        const li = document.createElement("li");
        const k = document.createElement("span");
        k.className = "chip-key chip-key--line";
        k.style.setProperty("--key", s.color);
        li.append(k, s.label);
        key.append(li);
      }
      plot.replaceChildren(key, svg.node());
    } else plot.replaceChildren(svg.node());
  }
  return { draw };
}
