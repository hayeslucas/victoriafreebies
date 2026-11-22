/* Shared by the search page and organization pages: the drop-off box, links to organization pages,
   and the Share button. Exposed as window.VF. */
(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var APPLE = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  function mapsUrl(a) { return APPLE ? "https://maps.apple.com/?q=" + encodeURIComponent(a) : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(a); }
  function linkPhones(p) { return esc(p).replace(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, function (m) { return '<a href="tel:' + m.replace(/[^0-9+]/g, "") + '">' + m + "</a>"; }); }
  /* Addresses with a street number link to maps (Apple Maps on Apple devices, Google Maps elsewhere);
     hovering shows "Open in Maps". Text like "Multiple Locations" stays plain. */
  function addressLink(a) {
    return /\d/.test(a) ? '<a class="maplink" data-tip="Open in Maps ↗" href="' + esc(mapsUrl(a)) + '" target="_blank" rel="noopener">' + esc(a) + '<span class="sr"> (opens in Maps)</span></a>' : esc(a);
  }

  /* The listing's "Drop off?" field in Airtable decides what the box shows:
     "ready" = drop it off at the address and hours; "phone" = call first.
     If the chosen detail is missing, fall back to the other so the donor still has a way to reach them. */
  function howTo(x) {
    var o = x.o, mode = x.dropoff || (o.address ? "ready" : "phone");
    if (mode === "ready") return o.address ? "drop" : o.phone ? "arrange" : "none";
    return o.phone ? "call" : o.address ? "drop" : "none";
  }
  function spotBox(x) {
    var o = x.o, h = howTo(x);
    if (h === "drop") return '<div class="spot"><p class="k">Drop it off at</p><p class="big">' + addressLink(o.address) + "</p>" + (o.hours ? '<p class="hrs">' + esc(o.hours) + "</p>" : "") + "</div>";
    if (h === "arrange") return '<div class="spot"><p class="k">Call to arrange a drop-off</p><p class="big">' + linkPhones(o.phone) + "</p></div>";
    if (h === "call") return '<div class="spot"><p class="k">Call first</p><p class="big">' + linkPhones(o.phone) + "</p></div>";
    return '<div class="spot none"><p class="k">Contact details coming soon</p></div>';
  }
  /* "Drop-off Instructions" on the organization: standing rules shown under every one of its listings. */
  function spot(x) { var o = x.o, b = spotBox(x); return o.notes && b.indexOf("spot none") < 0 ? b.replace(/<\/div>$/, '<p class="notes">' + esc(o.notes) + "</p></div>") : b; }

  /* Organization pages are per parent organization: Swift House, Mount Edwards and the rest share
     one Victoria Cool Aid Society page. A charity with no parent gets its own page. */
  function topId(orgId, orgs) { var o = orgs[orgId] || {}; return o.parentId && orgs[o.parentId] ? o.parentId : orgId; }
  function slug(name) { return String(name || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function orgUrl(orgId, orgs) { var t = orgs[topId(orgId, orgs)] || {}; return "/org/" + slug(t.name); }

  /* Share: the phone's share sheet where there is one, otherwise copy the link. */
  function share(btn, title, text, url) {
    var full = location.origin + url;
    function said(msg) { var old = btn.getAttribute("data-label") || btn.textContent; btn.setAttribute("data-label", old); btn.textContent = msg; setTimeout(function () { btn.textContent = old; }, 1800); }
    if (navigator.share) { navigator.share({ title: title, text: text, url: full }).catch(function () {}); return; }
    function fallback() {
      var t = document.createElement("textarea"); t.value = full; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); said("Link copied"); } catch (e) { prompt("Copy this link:", full); }
      document.body.removeChild(t);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(full).then(function () { said("Link copied"); }, fallback);
    else fallback();
  }
  var SHARE_ICON = '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 13V3M6 7l4-4 4 4M4 11v5h12v-5"/></svg>';

  window.VF = { esc: esc, mapsUrl: mapsUrl, linkPhones: linkPhones, addressLink: addressLink, howTo: howTo, spot: spot, topId: topId, slug: slug, orgUrl: orgUrl, share: share, SHARE_ICON: SHARE_ICON };
})();
