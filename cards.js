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

  /* Share: a small menu with Facebook, X, WhatsApp, Email and Copy link, plus the phone's own share sheet
     ("More…", which reaches Instagram, Messages and other apps) where the browser has one. */
  function copy(full, done) {
    function fallback() {
      var t = document.createElement("textarea"); t.value = full; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); done(); } catch (e) { prompt("Copy this link:", full); }
      document.body.removeChild(t);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(full).then(done, fallback); else fallback();
  }
  var openMenu = null;
  function closeMenu() { if (openMenu) { openMenu.btn.setAttribute("aria-expanded", "false"); openMenu.el.remove(); openMenu = null; } }
  document.addEventListener("click", function (e) { if (openMenu && !openMenu.el.contains(e.target) && e.target !== openMenu.btn && !openMenu.btn.contains(e.target)) closeMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && openMenu) { var b = openMenu.btn; closeMenu(); b.focus(); } });
  function share(btn, title, text, url) {
    if (openMenu && openMenu.btn === btn) { closeMenu(); return; }
    closeMenu();
    var full = location.origin + url, u = encodeURIComponent(full), t = encodeURIComponent(text);
    var links = [
      ["Facebook", "https://www.facebook.com/sharer/sharer.php?u=" + u],
      ["X (Twitter)", "https://twitter.com/intent/tweet?text=" + t + "&url=" + u],
      ["WhatsApp", "https://wa.me/?text=" + encodeURIComponent(text + " " + full)],
      ["Bluesky", "https://bsky.app/intent/compose?text=" + encodeURIComponent(text + " " + full)],
      ["Email", "mailto:?subject=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(text + "\n\n" + full)]
    ];
    var el = document.createElement("div");
    el.className = "sharemenu"; el.setAttribute("role", "menu");
    el.innerHTML = links.map(function (l) { return '<a role="menuitem" href="' + esc(l[1]) + '"' + (l[0] === "Email" ? "" : ' target="_blank" rel="noopener"') + ">" + esc(l[0]) + "</a>"; }).join("") +
      '<button type="button" role="menuitem" data-act="copy">Copy link</button>' +
      (navigator.share ? '<button type="button" role="menuitem" data-act="more">More…</button>' : "");
    el.addEventListener("click", function (e) {
      var a = e.target.closest("[data-act]"); if (!a) { setTimeout(closeMenu, 0); return; }
      if (a.getAttribute("data-act") === "copy") copy(full, function () { a.textContent = "Link copied ✓"; setTimeout(closeMenu, 1200); });
      else { closeMenu(); navigator.share({ title: title, text: text, url: full }).catch(function () {}); }
    });
    btn.insertAdjacentElement("afterend", el);
    btn.setAttribute("aria-expanded", "true");
    openMenu = { btn: btn, el: el };
    var first = el.querySelector("a,button"); if (first) first.focus();
  }
  var SHARE_ICON = '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 13V3M6 7l4-4 4 4M4 11v5h12v-5"/></svg>';

  /* Short everyday name ("Cool Aid") where space is tight; the full name stays on the organization page heading. */
  function short(o) { return (o && (o.short || o.name)) || ""; }
  /* "Mount Edwards · Cool Aid" for a site, just "Our Place" for a charity on its own. */
  function where(o) { return short(o) + (o && o.parent ? " · " + (o.parentShort || o.parent) : ""); }

  window.VF = { short: short, where: where, esc: esc, mapsUrl: mapsUrl, linkPhones: linkPhones, addressLink: addressLink, howTo: howTo, spot: spot, topId: topId, slug: slug, orgUrl: orgUrl, share: share, SHARE_ICON: SHARE_ICON };
})();
