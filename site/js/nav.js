// Reading-progress nav, adapted from the portfolio's SectionNav: one coin-dot
// and label per <section data-nav-label> in <main>. The section in view gets
// aria-current; the ones above it get data-read (filled coin), so the row of
// dots doubles as a progress bar.

const nav = document.querySelector(".progress-nav");
const list = nav.querySelector("ol");
const sections = [...document.querySelectorAll("main section[data-nav-label]")];

const links = new Map();
for (const section of sections) {
  const link = document.createElement("a");
  link.href = `#${section.id}`;
  const dot = document.createElement("span");
  dot.className = "dot";
  const label = document.createElement("span");
  label.className = "label";
  label.textContent = section.dataset.navLabel;
  link.append(dot, label);
  const item = document.createElement("li");
  item.append(link);
  list.append(item);
  links.set(section, link);
}
nav.hidden = sections.length === 0;

// `current` is the index of the section in view, or -1 above the first one.
const setCurrent = (current) => {
  sections.forEach((s, i) => {
    const link = links.get(s);
    link.toggleAttribute("data-read", i < current);
    if (i === current) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
};

// The current section is the first one crossing a band from 20% to 40% down
// the window. Between sections the last one stays marked. Above the first
// section (the intro) nothing is marked.
const inBand = new Set();
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) inBand.add(entry.target);
      else inBand.delete(entry.target);
    }
    const first = sections.findIndex((s) => inBand.has(s));
    if (first !== -1) setCurrent(first);
    else if (sections[0].getBoundingClientRect().top > window.innerHeight * 0.4) setCurrent(-1);
  },
  { rootMargin: "-20% 0px -60% 0px" },
);
sections.forEach((s) => observer.observe(s));
