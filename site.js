/* Shared effects for the Mission & vision and For charities pages.
   Everything here is decoration: if it fails, the pages still read fine.
   Motion is skipped when the visitor has "reduce motion" turned on. */
(function () {
  "use strict";
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CACHE_KEY = "vf-listings-v1"; // same copy the home page saves

  /* Add class "in" once an element scrolls into view. */
  function onView(el, fn) {
    if (REDUCED || !("IntersectionObserver" in window)) { fn(el); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); } });
    }, { threshold: 0.25 });
    io.observe(el);
  }
  document.querySelectorAll("[data-reveal]").forEach(function (el) {
    onView(el, function (t) { t.classList.add("in"); });
  });

  /* ---- Live numbers: counted from the same Airtable data as the search ---- */
  function countUp(el, n) {
    if (REDUCED) { el.textContent = n; return; }
    var start = null, dur = 1100;
    function step(ts) {
      if (start === null) start = ts;
      var k = Math.min(1, (ts - start) / dur), eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(n * eased);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function showStats(d) {
    var strip = document.getElementById("stats");
    if (!strip || !d || !Array.isArray(d.listings)) return;
    var today = new Date().toISOString().slice(0, 10), orgs = d.orgs || {};
    var live = d.listings.filter(function (x) { return !x.expires || x.expires >= today; });
    var needs = {}, charities = {}, types = {};
    live.forEach(function (x) {
      needs[String(x.id).split("-")[0]] = 1;              // a listing shared by two locations counts once
      var o = orgs[x.org] || {};
      charities[o.parent || o.name || x.org] = 1;          // Cool Aid's sites count as one charity
      if (x.category) types[x.category] = 1;
    });
    var nums = { needs: Object.keys(needs).length, charities: Object.keys(charities).length, types: Object.keys(types).length };
    if (!nums.needs) return;
    strip.hidden = false;
    onView(strip, function () {
      strip.querySelectorAll("[data-stat]").forEach(function (el) { countUp(el, nums[el.getAttribute("data-stat")]); });
    });
  }
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) {}
  if (cached) showStats(cached);
  else fetch("/api/listings").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return;
    showStats(d);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) {}
  }).catch(function () {});

  /* ---- Timeline: a green line draws down as you scroll, lighting each step it reaches ---- */
  var tl = document.querySelector(".timeline");
  if (tl) {
    var fill = tl.querySelector(".tl-fill"), items = tl.querySelectorAll(".dream");
    if (REDUCED) {
      fill.style.transform = "scaleY(1)";
      items.forEach(function (it) { it.classList.add("in"); });
    } else {
      var ticking = false;
      var update = function () {
        ticking = false;
        var r = tl.getBoundingClientRect(), line = innerHeight * 0.75 - r.top;
        var k = Math.max(0, Math.min(1, line / r.height));
        fill.style.transform = "scaleY(" + k + ")";
        items.forEach(function (it) { if (it.offsetTop + 14 <= line) it.classList.add("in"); });
      };
      addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
      addEventListener("resize", update);
      update();
    }
  }
})();
