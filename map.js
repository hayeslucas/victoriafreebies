/* Home page map: a small map above the results that shows where the current results are.
   It follows the search, category and filters (index.html calls VFMap.show with the matching listings).
   - Drop-off places: a pin with the number of matching needs. Tap for address, hours and directions.
   - Call-first and email-first places: a shaded circle about 1 km wide, never the address. The API only
     sends a rounded position for these (see api/listings.js), so the exact spot never reaches the browser.
   - Places with no address at all (e.g. youth housing) aren't on the map.
   "Open map" makes it full screen. Leaflet and the map tiles load only once the map scrolls into view. */
(function () {
  "use strict";
  var esc = VF.esc, box = document.getElementById("mapcard"); if (!box) return;
  var el = document.getElementById("map"), btn = document.getElementById("mapbig"), note = document.getElementById("mapnote");
  var LEAFLET = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/";
  var CLUSTER = "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/";
  var map = null, layer = null, pins = null, pending = null, loading = false, fitted = "", HOME = [48.4284, -123.3656];

  function loadLeaflet(done) {
    if (window.L) return done();
    if (loading) return; loading = true;
    var css = document.createElement("link"); css.rel = "stylesheet"; css.href = LEAFLET + "leaflet.min.css"; document.head.appendChild(css);
    function js(src, next) {
      var s = document.createElement("script"); s.src = src; s.onload = next;
      s.onerror = function () { box.hidden = true; }; // no map is better than a broken one
      document.head.appendChild(s);
    }
    /* Leaflet, then the add-on that groups pins that sit close together (downtown) into one bubble. */
    js(LEAFLET + "leaflet.min.js", function () { js(CLUSTER + "leaflet.markercluster.js", done); });
  }
  function init() {
    map = L.map(el, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView(HOME, 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
    /* Pins close together become one bubble with their total needs; tap it to zoom in and split them apart. */
    pins = L.markerClusterGroup({
      maxClusterRadius: 38, showCoverageOnHover: false, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 16,
      iconCreateFunction: function (c) {
        var n = c.getAllChildMarkers().reduce(function (t, m) { return t + (m.options.needs || 0); }, 0);
        return L.divIcon({ className: "mclus", html: "<span>" + n + "<small>" + c.getChildCount() + " places</small></span>", iconSize: [52, 52] });
      }
    }).addTo(map);
    touch(false);
    if (pending) draw(pending);
  }
  /* Start loading when the map is about to scroll into view (or right away on browsers without IntersectionObserver). */
  function start() { loadLeaflet(function () { if (!map) init(); }); }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: "300px" });
    io.observe(box);
  } else start();

  function count(n) { return n + " need" + (n > 1 ? "s" : ""); }
  /* One marker per place: every matching listing at that place goes in its popup. */
  function places(rows) {
    var by = {}, list = [], off = 0;
    rows.forEach(function (x) {
      var seenHere = false;
      (x.sites || [x.o]).forEach(function (o) {
        var id = o.id || x.org;
        if (o.lat == null || o.lng == null) return;
        seenHere = true;
        var p = by[id] || (by[id] = { id: id, o: o, items: [], drop: false });
        if (p.items.indexOf(x) < 0) p.items.push(x);
        if (!o.approx && VF.howTo({ dropoff: x.dropoff, o: o }) === "drop") p.drop = true;
        if (list.indexOf(p) < 0) list.push(p);
      });
      if (!seenHere) off++;
    });
    return { list: list, off: off };
  }
  function popup(p) {
    var o = p.o, orgs = (window.VF_DATA && VF_DATA.orgs) || {}, x0 = p.items[0];
    var url = VF.orgUrl(p.id, orgs) + "#site-" + p.id;
    var how = p.drop
      ? '<p class="mp-addr">' + esc(o.address) + (o.hours ? '<br><span>' + esc(o.hours) + "</span>" : "") + "</p>"
      : (function () { var h = VF.howTo({ dropoff: x0.dropoff, o: o });
          return '<p class="mp-how"><b>' + (h === "email" ? "Email first" : "Call first") + "</b> " + (h === "email" ? VF.emailLink(o.email) : VF.linkPhones(o.phone || "")) + '</p><p class="mp-area">Shown as an area to protect the people this charity serves. They’ll tell you where to bring it.</p>'; })();
    var titles = p.items.slice(0, 4).map(function (x) { return "<li>" + esc(x.title) + "</li>"; }).join("") + (p.items.length > 4 ? "<li>and " + (p.items.length - 4) + " more</li>" : "");
    return '<div class="mp"><p class="mp-name"><a href="' + esc(url) + '">' + esc(VF.where(o)) + "</a></p>" + how +
      '<p class="mp-k">' + count(p.items.length) + '</p><ul class="mp-items">' + titles + "</ul>" +
      '<p class="mp-links"><a href="' + esc(url) + '">See all their needs →</a>' + (p.drop ? ' <a href="' + esc(VF.mapsUrl(o.address)) + '" target="_blank" rel="noopener">Directions ↗</a>' : "") + "</p></div>";
  }
  function draw(rows) {
    pending = rows;
    box.hidden = !rows.length; // nothing to show (e.g. no matches): no map
    if (!map || !rows.length) return;
    layer.clearLayers(); pins.clearLayers();
    var r = places(rows), pts = [];
    r.list.forEach(function (p) {
      var ll = [p.o.lat, p.o.lng], m;
      if (p.drop) {
        m = L.marker(ll, { icon: L.divIcon({ className: "mpin", html: "<span><b>" + p.items.length + "</b></span>", iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] }), title: VF.short(p.o), keyboard: true, riseOnHover: true, needs: p.items.length });
      } else {
        m = L.circle(ll, { radius: 800, className: "marea", weight: 1.5 });
      }
      m.bindPopup(popup(p), { maxWidth: 280, autoPanPaddingTopLeft: [10, 60] });
      (p.drop ? pins : layer).addLayer(m); pts.push(ll);
    });
    var drops = r.list.filter(function (p) { return p.drop; }).length, areas = r.list.length - drops;
    note.innerHTML = r.list.length
      ? (drops ? '<span class="k-pin">' + drops + " drop-off spot" + (drops > 1 ? "s" : "") + "</span>" : "") +
        (areas ? '<span class="k-area">' + areas + " call first (rough area)</span>" : "") +
        (r.off ? '<span class="k-off">+' + r.off + " need" + (r.off > 1 ? "s" : "") + " with no public location</span>" : "")
      : "None of these charities share a location.";
    /* Zoom to fit the results, but only when the results change, so a donor's own panning isn't undone. */
    var key = r.list.map(function (p) { return p.id; }).sort().join(",");
    if (key !== fitted) {
      fitted = key; map.invalidateSize(false); // the box may have just changed size (opened or closed)
      /* Most places are in and around Victoria; a few are out in Sidney or Sooke. If most results are within
         about 12 km of downtown, frame those so the city isn't a speck, and the far ones are a pan or zoom away. */
      var near = pts.filter(function (ll) { return map.distance(ll, HOME) < 12000; });
      if (near.length >= Math.max(2, pts.length * 0.6)) pts = near;
      if (pts.length > 1) map.fitBounds(pts, { padding: [28, 28], maxZoom: 15 });
      else if (pts.length === 1) map.setView(pts[0], 14);
      else map.setView(HOME, 12);
    }
  }

  /* On phones the small map doesn't drag or pinch (so it never traps the page scroll); a tap opens the full one. */
  var PHONE = matchMedia("(max-width:760px)");
  function touch(big) {
    var on = big || !PHONE.matches;
    ["dragging", "touchZoom", "doubleClickZoom"].forEach(function (k) { map[k][on ? "enable" : "disable"](); });
    map.scrollWheelZoom[big ? "enable" : "disable"]();
  }
  /* Full screen and back. Escape or the button closes it. */
  function setBig(on) {
    box.classList.toggle("big", on); document.documentElement.classList.toggle("mapopen", on);
    btn.setAttribute("aria-expanded", String(on));
    btn.innerHTML = on ? "Close map ✕" : '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5"/></svg>Open map';
    if (map) { touch(on); map.invalidateSize(false); setTimeout(function () { map.invalidateSize(); fitted = ""; draw(pending || []); }, 60); }
    else start();
  }
  btn.onclick = function () { setBig(!box.classList.contains("big")); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && box.classList.contains("big")) { setBig(false); btn.focus(); } });
  /* Tapping the small map opens the full one on phones, where dragging a small map fights with scrolling the page. */
  el.addEventListener("click", function (e) { if (!box.classList.contains("big") && PHONE.matches && !e.target.closest(".leaflet-control")) setBig(true); });

  window.VFMap = { show: draw };
})();
