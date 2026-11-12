// Globe: countries colored by GDP per capita (PPP) or by the share of people
// below the World Bank's international poverty line, with a switch between
// the two. globe.gl (Three.js/WebGL) draws the 3D globe: drag to spin, scroll
// or pinch to zoom, a slow auto-rotate until the reader touches it. Where
// WebGL isn't available, or the library fails to load, a flat D3 world map
// with the same colors, tooltip and legend takes its place.
import { load, asset, fmt, scaffold, fillTable, segmented, thresholdLegend, onWidth, showTip, moveTip, hideTip, token } from "./common.js";

// Pinned, like D3. About 1.8 MB, so it loads only when the reader nears
// the globe (see whenNear), not with the page.
const GLOBE_SRC = "https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js";

// Sequential ramps, the same in light and dark mode (as on the state map).
// GDP: the reference palette's blue steps 150-650. Poverty: the housing
// map's 6-class warm ramp. WebGL can't read CSS variables, so these are hex.
const BLUE6 = ["#b7d3f6", "#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];
const WARM6 = ["#ffeccd", "#febc68", "#f08c0b", "#cc6605", "#a24717", "#6b372a"];

// Fixed breaks (LEARNING.md decision 4.3). GDP roughly doubles per class.
const METRICS = {
  gdp: {
    label: "GDP per person",
    title: "GDP per person, PPP (constant 2021 international $)",
    breaks: [5000, 10000, 20000, 40000, 60000],
    colors: BLUE6,
    tick: (v) => `$${v / 1000}K`,
    value: (c) => c.gdp_pc,
    format: (v) => `$${d3.format(",")(v)}`,
  },
  poverty: {
    label: "Extreme poverty",
    breaks: [1, 5, 15, 30, 50],
    colors: WARM6,
    tick: (v) => `${v}%`,
    value: (c) => c.poverty,
    format: (v) => `${d3.format(".1f")(v)}%`,
  },
};

export async function render(figure) {
  const [world, geo] = await Promise.all([load("world"), d3.json(asset("geo/countries-110m.json"))]);
  const countries = world.countries;
  METRICS.poverty.title = `Share of people living on less than ${world.poverty_line}`;
  // Antarctica has no data and would be a large gray cap; leave it off.
  const features = geo.features.filter((f) => f.id !== "ATA");

  const { controls, plot, table } = scaffold(figure, { controls: true });
  plot.classList.add("globe-plot");
  let metric = "gdp";
  let repaint = () => {};
  segmented(controls, "Globe metric", Object.entries(METRICS).map(([key, m]) => ({ key, label: m.label })), metric,
    (key) => { metric = key; drawLegend(); repaint(); });
  const legend = document.createElement("div");
  legend.className = "map-legend";
  controls.append(legend);
  const drawLegend = () => {
    const m = METRICS[metric];
    thresholdLegend(legend, m.title, m.colors, m.breaks, m.tick);
    const na = document.createElement("span");
    na.className = "legend-na";
    na.textContent = "Gray: no data";
    legend.append(na);
  };
  drawLegend();

  const rows = Object.entries(countries).map(([iso3, c]) => ({ iso3, ...c }))
    .sort((a, b) => d3.ascending(a.name, b.name));
  fillTable(table, [
    { label: "Country", value: (r) => r.name },
    { label: "GDP per person (PPP $)", num: true, value: (r) => (r.gdp_pc == null ? "—" : d3.format(",")(r.gdp_pc)) },
    { label: `Rank (${world.gdp_rank_year})`, num: true, value: (r) => (r.gdp_rank == null ? "—" : String(r.gdp_rank)) },
    { label: "Year", num: true, value: (r) => String(r.gdp_year ?? "—") },
    { label: `Below ${world.poverty_line}, %`, num: true, value: (r) => (r.poverty == null ? "—" : d3.format(".1f")(r.poverty)) },
    { label: "Survey year", num: true, value: (r) => String(r.poverty_year ?? "—") },
  ], rows, "GDP per person and extreme poverty by country");

  const colorOf = (iso3) => {
    const m = METRICS[metric];
    const v = countries[iso3] ? m.value(countries[iso3]) : null;
    return v == null ? token(figure, "--map-na") : d3.scaleThreshold().domain(m.breaks).range(m.colors)(v);
  };

  // Tooltip rows for a country under the current metric.
  const tipFor = (f) => {
    const c = countries[f.id];
    const m = METRICS[metric];
    const v = c ? m.value(c) : null;
    if (v == null) return [{ value: "No data", label: "" }];
    if (metric === "gdp") {
      return [
        { value: m.format(v), label: `per person, ${c.gdp_year}` },
        { value: c.gdp_rank ? `#${c.gdp_rank} of ${world.gdp_rank_count}` : "Not ranked", label: c.gdp_rank ? `countries, ${world.gdp_rank_year}` : `no ${world.gdp_rank_year} figure yet` },
      ];
    }
    return [{ value: m.format(v), label: `below ${world.poverty_line}, ${c.poverty_year}` }];
  };
  const nameOf = (f) => countries[f.id]?.name ?? f.properties.name;

  const summary = () => {
    const us = countries.USA;
    return `Globe of countries colored by ${METRICS[metric].title}. United States: ${metric === "gdp" ? `$${d3.format(",")(us.gdp_pc)} per person, rank ${us.gdp_rank} of ${world.gdp_rank_count}` : `${us.poverty}% (${us.poverty_year})`}. Every value is in the data table below.`;
  };

  const ctx = { figure, plot, features, colorOf, tipFor, nameOf, summary };
  if (!hasWebGL()) {
    repaint = flatMap(ctx, "This browser can't draw the 3D globe, so here's a flat map.");
    return;
  }
  whenNear(figure, () => {
    loadScript(GLOBE_SRC)
      .then(() => { repaint = makeGlobe(ctx); })
      .catch(() => { repaint = flatMap(ctx, "The 3D globe couldn't load, so here's a flat map."); });
  });
}

// --- 3D globe ------------------------------------------------------------------
function makeGlobe({ figure, plot, features, colorOf, tipFor, nameOf, summary }) {
  plot.setAttribute("role", "img");
  plot.setAttribute("aria-label", summary());
  const height = () => (plot.clientWidth < 500 ? 360 : 460);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Remember the pointer, so the hover tooltip can sit next to it
  // (globe.gl's hover callback reports the country but not the position).
  let px = 0, py = 0, hovered = null;
  plot.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; if (hovered) moveTip(px, py); });
  plot.addEventListener("pointerleave", () => { hovered = null; hideTip(); });

  const globe = Globe({ animateIn: !reduceMotion })(plot)
    .width(plot.clientWidth).height(height())
    .backgroundColor("rgba(0,0,0,0)")
    .showAtmosphere(true).atmosphereAltitude(0.12)
    .polygonsData(features)
    .polygonAltitude(0.006)
    .polygonsTransitionDuration(reduceMotion ? 0 : 300)
    .onPolygonHover((f) => {
      hovered = f;
      globe.polygonAltitude((g) => (g === f ? 0.02 : 0.006));
      if (f) showTip(nameOf(f), tipFor(f), px, py);
      else hideTip();
    })
    // Tap on touch screens: show the same tooltip at the tap.
    .onPolygonClick((f, event) => { hovered = f; showTip(nameOf(f), tipFor(f), event.clientX, event.clientY); });

  const paintTheme = () => {
    globe.globeMaterial().color.set(token(figure, "--globe-ocean"));
    globe.atmosphereColor(token(figure, "--globe-atmosphere"));
    globe.polygonSideColor(() => token(figure, "--globe-side"))
      .polygonStrokeColor(() => token(figure, "--globe-border"));
  };
  const paint = () => {
    globe.polygonCapColor((f) => colorOf(f.id));
    plot.setAttribute("aria-label", summary());
    if (hovered) showTip(nameOf(hovered), tipFor(hovered), px, py);
  };
  paintTheme();
  paint();
  // Light/dark switches repaint the ocean and borders; data colors stay.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { paintTheme(); paint(); });

  // Start over North America; auto-rotate slowly until the reader drags,
  // scrolls or taps the globe (never, if they've asked for reduced motion).
  // Pulled back a little on phones so the whole globe fits the width.
  globe.pointOfView({ lat: 25, lng: -95, altitude: plot.clientWidth < 500 ? 2.2 : 1.75 }, 0);
  const controls = globe.controls();
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.35;
  // Don't trap page scrolling on phones: zoom needs two fingers there anyway.
  controls.enableZoom = true;
  const stop = () => { controls.autoRotate = false; };
  ["pointerdown", "wheel", "touchstart"].forEach((t) => plot.addEventListener(t, stop, { once: true, passive: true }));

  onWidth(plot, (w) => globe.width(w).height(height()));
  return paint;
}

// --- Flat fallback ---------------------------------------------------------------
function flatMap({ plot, features, colorOf, tipFor, nameOf, summary }, note) {
  const p = document.createElement("p");
  p.className = "chart-note";
  p.textContent = note;
  plot.before(p);
  let paths = null;
  onWidth(plot, (width) => {
    const height = Math.round(width * 0.5);
    // Fit the whole globe outline (not just the countries) into the box.
    const projection = d3.geoNaturalEarth1().fitSize([width, height], { type: "Sphere" });
    const path = d3.geoPath(projection);
    const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height)
      .attr("role", "img").attr("aria-label", summary());
    svg.append("path").attr("class", "sphere").attr("d", path({ type: "Sphere" }));
    paths = svg.append("g").attr("class", "countries")
      .selectAll("path").data(features).join("path")
      .attr("d", path).style("fill", (f) => colorOf(f.id))
      .on("pointerenter", (e, f) => showTip(nameOf(f), tipFor(f), e.clientX, e.clientY))
      .on("pointermove", (e) => moveTip(e.clientX, e.clientY))
      .on("pointerleave", hideTip);
    plot.replaceChildren(svg.node());
  });
  return () => {
    paths?.style("fill", (f) => colorOf(f.id));
    plot.querySelector("svg")?.setAttribute("aria-label", summary());
  };
}

// --- Helpers ---------------------------------------------------------------------
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

// Run fn once the element is within about a screen of the viewport.
function whenNear(el, fn) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: "100% 0px" });
  io.observe(el);
}
