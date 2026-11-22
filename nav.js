/* Top bar: a pill slides to whichever link is hovered or focused and rests on the current page;
   the bar gets a shadow once the page scrolls; the heart logo beats once on load. */
(function () {
  "use strict";
  var bar = document.getElementById("topbar");
  if (!bar) return;
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onScroll() { bar.classList.toggle("scrolled", window.scrollY > 4); }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var wrap = bar.querySelector(".navlinks"), pill = bar.querySelector(".navpill");
  var links = Array.prototype.slice.call(wrap.querySelectorAll("a"));
  var current = wrap.querySelector('a[aria-current="page"]');
  function moveTo(a, instant) {
    if (!a) { pill.style.opacity = "0"; return; }
    if (instant || REDUCED) pill.style.transition = "none";
    pill.style.width = a.offsetWidth + "px";
    pill.style.height = a.offsetHeight + "px";
    pill.style.transform = "translate(" + a.offsetLeft + "px," + a.offsetTop + "px)";
    pill.style.opacity = "1";
    if (instant || REDUCED) { void pill.offsetWidth; pill.style.transition = ""; }
  }
  moveTo(current, true);
  links.forEach(function (a) {
    a.addEventListener("mouseenter", function () { moveTo(a); });
    a.addEventListener("focus", function () { moveTo(a); });
  });
  wrap.addEventListener("mouseleave", function () { moveTo(current); });
  wrap.addEventListener("focusout", function (e) { if (!wrap.contains(e.relatedTarget)) moveTo(current); });
  addEventListener("resize", function () { moveTo(current, true); });
  // The home page switches between Search and Wish List without reloading.
  document.addEventListener("navchange", function () { current = wrap.querySelector('a[aria-current="page"]'); moveTo(current); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveTo(current, true); });

  if (!REDUCED) {
    var logo = bar.querySelector(".logo");
    logo.classList.add("beat");
    setTimeout(function () { logo.classList.remove("beat"); }, 1000);
  }
})();
