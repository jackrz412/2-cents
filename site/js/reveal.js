// Scroll motion, after the LLM lab article: each paragraph, heading and chart
// fades in the first time it scrolls into view, and a chart's plot then
// fills in (styles.css, "Scroll motion"). Runs only when the head script has
// added .motion (no reduced-motion preference, IntersectionObserver present).

const root = document.documentElement;
if (root.classList.contains("motion")) {
  window.revealReady = true; // tells the head script's fallback this file ran
  const items = document.querySelectorAll("main > section > *, .methods > *");
  items.forEach((el) => el.classList.add("reveal"));

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        el.classList.add("is-in");
        observer.unobserve(el);
        // After the first fill, redraws (resize, toggles) appear at once.
        if (el.classList.contains("chart")) setTimeout(() => el.classList.add("drawn"), 2200);
      }
    },
    // Start once a fifth of the element is in view, a little above the bottom edge.
    { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
  );
  items.forEach((el) => observer.observe(el));
}
