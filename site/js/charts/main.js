// Entry point: draw each chart whose <figure> is on the page. A chart that
// fails (say, a data file missing) shows a note in its own figure and
// leaves the others running.
import * as prices from "./prices.js";
import * as changes from "./changes.js";
import * as states from "./states.js";
import * as scale from "./scale.js";
import * as wealth from "./wealth.js";
import * as debt from "./debt.js";
import * as spending from "./spending.js";
import * as foreign from "./foreign.js";
import * as globe from "./globe.js";
import * as poverty from "./poverty.js";

const CHARTS = { "chart-1a": prices, "chart-1b": changes, "map-1": states, "scale-2": scale, "chart-2a": wealth,
  "chart-3a": debt, "chart-3b": spending, "chart-3c": foreign,
  globe, "chart-4a": poverty };

for (const [id, chart] of Object.entries(CHARTS)) {
  const figure = document.getElementById(id);
  if (!figure) continue;
  chart.render(figure).catch((err) => {
    console.error(`${id}:`, err);
    const note = document.createElement("p");
    note.className = "chart-error";
    note.textContent = "This chart couldn't load. Try reloading the page.";
    figure.append(note);
  });
}
