// Number line: $10K, $100K, $1M, $1B and $100B on one ordinary (linear)
// line from $0. A slider zooms out from "$10K nearly fills the line" to
// "$100B nearly fills the line"; each tenfold step squeezes the smaller
// amounts into a pile at $0. The amounts are round numbers for scale, not
// data, so nothing here comes from facts.json.
import { scaffold, fillTable, onWidth } from "./common.js";

const MARKS = [1e4, 1e5, 1e6, 1e9, 1e11];
// The line's right end runs from just past $10K to just past $100B. The
// slider moves it on a log scale, so each tenfold zoom takes the same
// distance on the slider.
const END_LO = 1.25e4, END_HI = 1.25e11;
const STEPS = 1000;
const endAt = (t) => 10 ** (Math.log10(END_LO) + t * (Math.log10(END_HI) - Math.log10(END_LO)));
// Pixels closer to $0 than this count as "squeezed into $0".
const SQUEEZE = 2;
const PLAY_MS = 10000;

// "$10K", "$1.3M", "$100B".
const money = (v) => `$${d3.format(".2~s")(v).replace("k", "K").replace("G", "B")}`;
const words = (v) => (v >= 1e9 ? `${v / 1e9} billion` : v >= 1e6 ? `${v / 1e6} million` : `${d3.format(",")(v)}`);
// If $10K sat 1 inch from $0, how far away is v?
const inches = (v) => v / MARKS[0];
const distance = (v) => {
  const i = inches(v);
  if (i < 12) return `${i} ${i === 1 ? "inch" : "inches"}`;
  if (i < 5280) return `${d3.format(",.1~f")(i / 12)} feet`;
  const mi = i / 63360;
  return `${d3.format(mi < 10 ? ".1~f" : ",.0f")(mi)} miles`;
};

export async function render(figure) {
  const { controls, plot, table } = scaffold(figure, { controls: true });
  plot.classList.add("scale-plot");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  fillTable(table, [
    { label: "Amount", value: (v) => `$${words(v)}` },
    { label: "Times $10,000", num: true, value: (v) => d3.format(",")(v / MARKS[0]) },
    { label: "If $10K were 1 inch from $0", num: true, value: distance },
  ], MARKS, "Five amounts and how far apart they are");

  // Controls: play/pause, then the zoom slider.
  controls.classList.add("scale-controls");
  const play = document.createElement("button");
  play.type = "button";
  play.className = "scale-play";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = 0;
  slider.max = STEPS;
  slider.value = 0;
  slider.setAttribute("aria-label", "Zoom out the number line");
  const lo = document.createElement("span");
  const hi = document.createElement("span");
  lo.className = hi.className = "scale-end";
  lo.textContent = "Zoomed in";
  hi.textContent = "Zoomed out";
  controls.append(play, lo, slider, hi);
  // Under reduced motion there's no animation, just the slider.
  if (reduceMotion) play.hidden = true;

  const readout = document.createElement("p");
  readout.className = "scale-readout";
  plot.after(readout);
  // The physical comparison, set as a pull quote with the last distance bold.
  const quote = document.createElement("blockquote");
  quote.className = "scale-quote";
  const far = document.createElement("strong");
  far.textContent = distance(1e11);
  quote.append(`If $10,000 sat 1 inch from $0, $1 million would be ${distance(1e6)} away, $1 billion ${distance(1e9)}, and $100 billion about `, far, ".");
  readout.after(quote);

  let t = 0;
  let width = 0;
  const draw = () => {
    if (!width) return;
    const end = endAt(t);
    const m = { left: 16, right: 16 };
    const height = 140, base = 84;
    const x = d3.scaleLinear().domain([0, end]).range([m.left, width - m.right]);
    const x0 = x(0);
    const shown = MARKS.filter((v) => v <= end);
    const squeezed = shown.filter((v) => x(v) - x0 < SQUEEZE);
    const placed = shown.filter((v) => x(v) - x0 >= SQUEEZE);
    const next = MARKS.find((v) => v > end);

    const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height)
      .attr("role", "img");

    svg.append("line").attr("class", "scale-axis")
      .attr("x1", x0).attr("x2", width - m.right).attr("y1", base).attr("y2", base);
    // Ends: $0 on the left, the current zoom on the right.
    const ends = svg.append("g").attr("class", "axis scale-ends");
    ends.append("line").attr("x1", x0).attr("x2", x0).attr("y1", base - 6).attr("y2", base + 6);
    ends.append("line").attr("x1", width - m.right).attr("x2", width - m.right).attr("y1", base - 6).attr("y2", base + 6);
    ends.append("text").attr("x", x0).attr("y", base + 26).text("$0");
    ends.append("text").attr("x", width - m.right).attr("y", base + 26).attr("text-anchor", "end").text(money(end));
    // An arrow past the right end when the next amount is off the line.
    if (next) {
      ends.append("path").attr("class", "scale-arrow")
        .attr("d", `M${width - m.right - 10},${base + 40}l8,0m-4,-4l4,4l-4,4`);
    }

    // Amounts on the line: a dot, a stem and a label badge above. A badge
    // that would touch the one before it steps up a row. Badge width is
    // estimated from the label's length (the SVG isn't in the page yet, so
    // text can't be measured).
    const PILL_H = 26, ROW = 34;
    const pillW = (v) => money(v).length * 9 + 18;
    let lastRight = -Infinity, row = 0;
    const rows = placed.map((v) => {
      const px = x(v), w = pillW(v);
      // Keep badges near either end inside the box.
      const left = Math.max(m.left - 6, Math.min(width - m.right + 6 - w, px - w / 2));
      row = left < lastRight + 6 ? (row + 1) % 2 : 0;
      lastRight = left + w;
      return { v, px, w, left, row, cy: base - 30 - row * ROW };
    });
    // Stems and dots in one layer, badges above it, so a stem never runs
    // through a neighbor's badge.
    const marks = svg.append("g").attr("class", "scale-mark");
    marks.selectAll("line").data(rows).join("line").attr("class", "stem")
      .attr("x1", (d) => d.px).attr("x2", (d) => d.px)
      .attr("y1", (d) => d.cy + PILL_H / 2).attr("y2", base);
    marks.selectAll("circle").data(rows).join("circle").attr("cx", (d) => d.px).attr("cy", base).attr("r", 5);
    const g = svg.append("g").selectAll("g").data(rows).join("g").attr("class", "scale-mark");
    g.append("rect").attr("class", "pill")
      .attr("x", (d) => d.left).attr("y", (d) => d.cy - PILL_H / 2)
      .attr("width", (d) => d.w).attr("height", PILL_H).attr("rx", PILL_H / 2);
    g.append("text")
      .attr("x", (d) => d.left + d.w / 2).attr("y", (d) => d.cy).attr("dy", "0.34em")
      .attr("text-anchor", "middle")
      .text((d) => money(d.v));

    // Amounts squeezed into $0: dots drawn on top of each other, named below.
    if (squeezed.length) {
      svg.append("circle").attr("class", "scale-pile").attr("cx", x0).attr("cy", base).attr("r", 5);
      svg.append("text").attr("class", "scale-pile-label")
        .attr("x", x0).attr("y", base + 48)
        .text(`${list(squeezed.map(money))} ${squeezed.length > 1 ? "are all" : "is"} squeezed into $0`);
    }

    const perPixel = end / (width - m.left - m.right);
    let text = `The line runs from $0 to ${money(end)}; each pixel is about ${money(perPixel)}.`;
    if (next) {
      const away = next / end;
      text += ` Next up: ${money(next)}, ${away < 2 ? "just past the end" : `about ${d3.format(",.2~r")(away)} line-lengths to the right`}.`;
    }
    readout.textContent = text;
    svg.attr("aria-label", `Number line. ${text}${squeezed.length ? ` ${list(squeezed.map(money))} can't be told apart from $0.` : ""}`);
    slider.setAttribute("aria-valuetext", `Line ends at ${money(end)}`);
    plot.replaceChildren(svg.node());
  };

  // Play: sweep the slider from where it is to the end (or from the start,
  // if it's already there). Dragging the slider stops it.
  let timer = null;
  const setPlaying = (on) => {
    play.textContent = on ? "Pause" : "Play";
    play.setAttribute("aria-pressed", on);
  };
  const stop = () => { timer?.stop(); timer = null; setPlaying(false); };
  play.addEventListener("click", () => {
    if (timer) return stop();
    const from = t >= 1 ? 0 : t;
    const ms = PLAY_MS * (1 - from);
    setPlaying(true);
    timer = d3.timer((elapsed) => {
      t = Math.min(1, from + (1 - from) * d3.easeSinInOut(elapsed / ms));
      slider.value = Math.round(t * STEPS);
      draw();
      if (elapsed >= ms) stop();
    });
  });
  slider.addEventListener("input", () => {
    stop();
    t = slider.value / STEPS;
    draw();
  });
  setPlaying(false);

  onWidth(plot, (w) => { width = w; draw(); });
}

// "$10K", "$10K and $100K", "$10K, $100K and $1M".
function list(items) {
  return items.length < 2 ? items[0] : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
