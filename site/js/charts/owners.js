// Chart 3e: who owns the federal debt, as a 10x10 waffle (each square 1% of
// the gross debt) with a key that gives each holder's dollars and share. A
// waffle instead of a pie: squares are easier to count and compare than
// angles, and it echoes the people-and-coins grids in Section 2. Hovering a
// square or a key row highlights that holder.
import { load, fmt, scaffold, fillTable, onWidth, showTip, moveTip, hideTip } from "./common.js";

const COLORS = { domestic: "var(--series-1)", foreign: "var(--series-2)", trust: "var(--series-3)", fed: "var(--series-4)" };
const tn = (v) => `$${d3.format(".1f")(v)}T`;

// Whole squares that add up to 100: floor each share, then hand the leftover
// squares to the largest remainders.
function squares(owners) {
  const out = owners.map((o) => ({ ...o, n: Math.floor(o.pct), r: o.pct % 1 }));
  let left = 100 - d3.sum(out, (o) => o.n);
  for (const o of [...out].sort((a, b) => b.r - a.r)) if (left-- > 0) o.n += 1;
  return out;
}

export async function render(figure) {
  const data = await load("debt_owners");
  const owners = squares(data.owners);
  const perSquare = (data.total_tn / 100) * 1000; // $ billions

  const { plot, table } = scaffold(figure);
  plot.classList.add("owners-plot");
  fillTable(table, [
    { label: "Holder", value: (o) => o.label },
    { label: "$ trillions", num: true, value: (o) => d3.format(".2f")(o.tn) },
    { label: "Share of gross debt, %", num: true, value: (o) => fmt.pct1(o.pct) },
    { label: "Who that is", value: (o) => o.detail },
  ], owners, `Who owns the federal debt, ${data.period}`);

  const grid = document.createElement("div");
  grid.className = "owners-grid";
  const key = document.createElement("ul");
  key.className = "owners-key";
  plot.append(grid, key);

  let cells = null;
  const highlight = (k) => {
    cells?.classed("dim", (d) => k != null && d.key !== k);
    key.querySelectorAll("li").forEach((li) => li.classList.toggle("dim", k != null && li.dataset.key !== k));
  };

  for (const o of owners) {
    const li = document.createElement("li");
    li.dataset.key = o.key;
    li.tabIndex = 0;
    const sw = document.createElement("span");
    sw.className = "legend-swatch";
    sw.style.background = COLORS[o.key];
    const text = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = `${o.label} `;
    const nums = document.createElement("span");
    nums.className = "owners-nums";
    nums.textContent = `${fmt.pct1(o.pct)} · ${tn(o.tn)}`;
    const detail = document.createElement("span");
    detail.className = "owners-detail";
    detail.textContent = o.detail;
    text.append(name, nums, detail);
    li.append(sw, text);
    li.addEventListener("pointerenter", () => highlight(o.key));
    li.addEventListener("pointerleave", () => highlight(null));
    li.addEventListener("focus", () => highlight(o.key));
    li.addEventListener("blur", () => highlight(null));
    key.append(li);
  }

  const units = owners.flatMap((o) => d3.range(o.n).map(() => o));
  onWidth(grid, (width) => {
    const gap = 3;
    const cell = Math.max(14, Math.min(30, Math.floor((width - gap * 9) / 10)));
    const side = cell * 10 + gap * 9;
    const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${side} ${side}`).attr("width", side).attr("height", side)
      .attr("role", "img")
      .attr("aria-label", `Grid of 100 squares, each 1% of the ${tn(data.total_tn)} federal debt in ${data.period}: ${owners.map((o) => `${o.label} ${o.n}`).join(", ")}.`);
    cells = svg.append("g").attr("class", "owners-cells")
      .selectAll("rect").data(units).join("rect")
      .attr("class", "owners-cell")
      .attr("x", (d, i) => (i % 10) * (cell + gap)).attr("y", (d, i) => Math.floor(i / 10) * (cell + gap))
      .attr("width", cell).attr("height", cell).attr("rx", 3)
      .style("fill", (d) => COLORS[d.key])
      .style("--order", (d, i) => i)
      .on("pointerenter", (event, d) => {
        highlight(d.key);
        showTip(d.label, [
          { value: fmt.pct1(d.pct), label: `of the debt, ${tn(d.tn)}`, key: COLORS[d.key] },
          { value: `≈ $${d3.format(",.0f")(perSquare)}B`, label: "per square" },
        ], event.clientX, event.clientY);
      })
      .on("pointermove", (event) => moveTip(event.clientX, event.clientY))
      .on("pointerleave", () => { highlight(null); hideTip(); });
    grid.replaceChildren(svg.node());
  });
}
