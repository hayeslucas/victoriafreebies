/* Home page map: a small box above the results (half width, next to the charities box) that shows where the
   current results are; tapping it opens the full-screen map.
   It follows the search, category and filters (index.html calls VFMap.show with the matching listings).
   - Drop-off places: a pin with the number of matching needs. Tap for address, hours and directions.
   - Call-first and email-first places: a shaded circle about 1 km wide, never the address. The API only
     sends a rounded position for these (see api/listings.js), so the exact spot never reaches the browser.
   - Places with no address at all (e.g. youth housing) aren't on the map.
   Leaflet and the map tiles load only once the map scrolls into view. */
(function () {
  "use strict";
  var esc = VF.esc, box = document.getElementById("mapcard"); if (!box) return;
  var el = document.getElementById("map"), btn = document.getElementById("mapbig"), closeBtn = document.getElementById("mapclose"), countEl = document.getElementById("mapcount");
  var statusEl = document.getElementById("mapstatus"), form = document.getElementById("mapsearch"), mapq = document.getElementById("mapq");
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
          return '<p class="mp-how"><b>' + (h === "email" ? "Email first" : "Call first") + "</b> " + (h === "email" ? VF.emailLink(o.email) : VF.linkPhones(o.phone || "")) + "</p>"; })();
    var titles = p.items.slice(0, 4).map(function (x) { return "<li>" + esc(x.title) + "</li>"; }).join("") + (p.items.length > 4 ? "<li>and " + (p.items.length - 4) + " more</li>" : "");
    return '<div class="mp"><p class="mp-name"><a href="' + esc(url) + '">' + esc(VF.where(o)) + "</a></p>" + how +
      '<p class="mp-k">' + count(p.items.length) + '</p><ul class="mp-items">' + titles + "</ul>" +
      '<p class="mp-links"><a href="' + esc(url) + '">See all their needs →</a>' + (p.drop ? ' <a href="' + esc(VF.mapsUrl(o.address)) + '" target="_blank" rel="noopener">Directions ↗</a>' : "") + "</p></div>";
  }
  var lastQ = "";
  function draw(rows, q) {
    pending = rows; if (q !== undefined) lastQ = q || "";
    /* The box's headline and the full map's status line: how many places, before the map itself has even loaded. */
    var all = places(rows).list.length, words = all + " place" + (all === 1 ? "" : "s");
    if (rows.length) countEl.textContent = words + (lastQ ? " for “" + lastQ + "”" : " to give");
    statusEl.innerHTML = lastQ
      ? (all ? "Showing <b>" + words + "</b> for “" + esc(lastQ) + "”" : "Nothing on the map for “" + esc(lastQ) + "” right now") + ' · <button type="button" class="linkbtn" id="mapall">Show everything</button>'
      : "Showing <b>" + words + "</b> to give";
    var allBtn = document.getElementById("mapall"); if (allBtn) allBtn.onclick = function () { mapq.value = ""; window.VFSearch && VFSearch(""); };
    if (!map) return;
    if (!rows.length) { layer.clearLayers(); pins.clearLayers(); fitted = ""; return; }
    layer.clearLayers(); pins.clearLayers();
    var r = places(rows), pts = [];
    /* Call-first areas share rounded positions, so several places can land on the same spot (e.g. Cool Aid's
       downtown houses): draw one circle there and list every place in its popup. */
    var areas = {};
    r.list.forEach(function (p) {
      var ll = [p.o.lat, p.o.lng];
      pts.push(ll);
      if (!p.drop) { var k = ll.join(","); (areas[k] = areas[k] || []).push(p); return; }
      var m = L.marker(ll, { icon: L.divIcon({ className: "mpin", html: "<span><b>" + p.items.length + "</b></span>", iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] }), title: VF.short(p.o), keyboard: true, riseOnHover: true, needs: p.items.length });
      m.bindPopup(popup(p), { maxWidth: 280, autoPanPaddingTopLeft: [10, 60] });
      pins.addLayer(m);
    });
    Object.keys(areas).forEach(function (k) {
      var group = areas[k], c = L.circle(k.split(",").map(Number), { radius: 800, className: "marea", weight: 1.5 });
      c.bindPopup(group.map(popup).join('<hr class="mp-sep">'), { maxWidth: 280, maxHeight: 340, autoPanPaddingTopLeft: [10, 60] });
      layer.addLayer(c);
    });
    /* Zoom to fit the results, but only when the results change, so a donor's own panning isn't undone. */
    var key = r.list.map(function (p) { return p.id; }).sort().join(",");
    if (key !== fitted) {
      fitted = key; map.invalidateSize(false); // the box may have just changed size (opened or closed)
      /* Most places are in and around Victoria; a few are out in Sidney or Sooke. If most results are within
         about 12 km of downtown, frame those so the city isn't a speck, and the far ones are a pan or zoom away. */
      var near = pts.filter(function (ll) { return map.distance(ll, HOME) < 12000; });
      if (near.length >= Math.max(2, pts.length * 0.6)) pts = near;
      var pad = box.classList.contains("big") ? 28 : 6; // the small map is only about 100px tall
      if (pts.length > 1) map.fitBounds(pts, { padding: [pad, pad], maxZoom: 15 });
      else if (pts.length === 1) map.setView(pts[0], 14);
      else map.setView(HOME, 12);
    }
  }

  /* The small map is just a picture: no dragging or zooming until it's opened full screen. */
  function touch(big) {
    ["dragging", "touchZoom", "doubleClickZoom", "scrollWheelZoom", "boxZoom", "keyboard"].forEach(function (k) { map[k][big ? "enable" : "disable"](); });
  }
  /* Full screen and back. The close button or Escape closes it. */
  function setBig(on) {
    box.classList.toggle("big", on); document.documentElement.classList.toggle("mapopen", on);
    if (on) mapq.value = lastQ;
    btn.setAttribute("aria-expanded", String(on));
    if (map) { touch(on); map.invalidateSize(false); setTimeout(function () { map.invalidateSize(); fitted = ""; draw(pending || []); }, 60); }
    else start();
    (on ? closeBtn : btn).focus();
  }
  box.addEventListener("click", function (e) { if (!box.classList.contains("big")) setBig(true); });
  /* Search again without leaving the map. */
  form.onsubmit = function (e) { e.preventDefault(); mapq.blur(); window.VFSearch && VFSearch(mapq.value); };
  closeBtn.onclick = function (e) { e.stopPropagation(); setBig(false); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && box.classList.contains("big")) setBig(false); });

  window.VFMap = { show: draw, isBig: function () { return box.classList.contains("big"); } };
})();
