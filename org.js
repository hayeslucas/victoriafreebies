/* Organization pages: /org/<name>, e.g. /org/our-place-society.
   One page per parent organization (all of Cool Aid's sites share one page), built from /api/listings:
   everything the charity takes, grouped by location and category, then its Wish List items at the bottom.
   /org on its own lists every charity. */
(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var esc = VF.esc, CACHE_KEY = "vf-listings-v1", REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var want = decodeURIComponent((location.pathname.match(/^\/org\/([^\/]+)/) || [])[1] || "").toLowerCase();
  var D = null, shown = false;

  function base(id) { return String(id).split("-")[0]; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function live(d) {
    var orgs = d.orgs || {};
    return d.listings.filter(function (x) { return !x.expires || x.expires >= today(); }).map(function (x) { x.o = orgs[x.org] || {}; return x; });
  }
  function catOrder(a, b) { return (a === "Other") - (b === "Other") || a.localeCompare(b); }
  function details(x) { return x.items && x.items.toLowerCase() !== x.title.toLowerCase() ? '<p class="items">' + esc(x.items) + "</p>" : ""; }
  function shareBtn(x) { return '<button type="button" class="sharebtn" data-share="' + esc(x.id) + '">' + VF.SHARE_ICON + "Share</button>"; }

  /* Every charity, for /org on its own. */
  function directory(d) {
    var orgs = d.orgs || {}, count = {}, seen = {};
    live(d).forEach(function (x) { var t = VF.topId(x.org, orgs), k = t + "|" + base(x.id); if (!seen[k]) { seen[k] = 1; count[t] = (count[t] || 0) + 1; } });
    var ids = Object.keys(count).sort(function (a, b) { return orgs[a].name.localeCompare(orgs[b].name); });
    document.title = "Local charities · Victoria Freebies";
    $("oname").textContent = "Local charities";
    $("osub").textContent = "Every charity on Victoria Freebies, and how many things each is asking for right now.";
    $("page").innerHTML = '<ul class="orglist">' + ids.map(function (id) {
      return '<li><a href="/org/' + VF.slug(orgs[id].name) + '"><b>' + esc(orgs[id].name) + "</b><span>" + count[id] + " thing" + (count[id] > 1 ? "s" : "") + "</span></a></li>";
    }).join("") + "</ul>";
  }

  function notFound() {
    document.title = "Charity not found · Victoria Freebies";
    $("oname").textContent = "We couldn’t find that charity";
    $("osub").textContent = "It may have changed its name, or it has no requests right now.";
    $("page").innerHTML = '<p><a class="bigbtn" href="/org">See all charities</a> <a class="bigbtn alt" href="/">Search for an item</a></p>';
  }

  function render(d, fromCache) {
    var orgs = d.orgs || {}, all = live(d);
    if (!want) { D = d; return directory(d); }
    var top = Object.keys(orgs).filter(function (id) { return !orgs[id].parentId && VF.slug(orgs[id].name) === want; })[0];
    var mine = top ? all.filter(function (x) { return VF.topId(x.org, orgs) === top; }) : [];
    if (!top || !mine.length) { if (!fromCache) notFound(); return; }
    D = d;
    var t = orgs[top], name = t.name, nick = VF.short(t);

    /* Locations: the charity itself first, then its sites alphabetically. */
    var locs = [];
    mine.forEach(function (x) { if (locs.indexOf(x.org) < 0) locs.push(x.org); });
    locs.sort(function (a, b) { return (b === top) - (a === top) || orgs[a].name.localeCompare(orgs[b].name); });
    var multi = locs.length > 1, uniq = {};
    mine.forEach(function (x) { uniq[base(x.id)] = 1; });
    var n = Object.keys(uniq).length;

    document.title = nick + " · Victoria Freebies";
    $("oname").textContent = name;
    $("osub").textContent = n + " thing" + (n > 1 ? "s" : "") + " they’re asking for right now" + (multi ? ", across " + locs.length + " locations." : ".") + " Bringing one? See what else you could bring along.";
    $("oactions").innerHTML =
      (t.donate ? '<a class="bigbtn" href="' + esc(t.donate) + '" target="_blank" rel="noopener">Donate money <span aria-hidden="true">↗</span></a>' : "") +
      (t.website ? '<a class="bigbtn alt" href="' + esc(t.website) + '" target="_blank" rel="noopener">Website <span aria-hidden="true">↗</span></a>' : "") +
      '<button type="button" class="alt" id="sharepage">' + VF.SHARE_ICON + "Share this page</button>";

    var h = "";
    /* Everyday items by location: where to go once, then the list. */
    var wish = mine.filter(function (x) { return x.wish; });
    locs.forEach(function (loc) {
      var here = mine.filter(function (x) { return x.org === loc && !x.wish; });
      if (!here.length) return; // everything at this site is in the Wish List section below
      var o = orgs[loc], ref = here.filter(function (x) { return VF.howTo(x) === "drop"; })[0] || here[0] || mine.filter(function (x) { return x.org === loc; })[0];
      h += '<section class="oloc"><h2>' + (multi ? esc(VF.short(o)) : "What they accept") + "</h2>";
      h += VF.spot(ref);
      if (o.phone && VF.howTo(ref) === "drop") h += '<p class="ophone">Questions? Call ' + VF.linkPhones(o.phone) + "</p>";

      var cats = [];
      here.forEach(function (x) { if (cats.indexOf(x.category) < 0) cats.push(x.category); });
      cats.sort(catOrder).forEach(function (c) {
        var items = here.filter(function (x) { return x.category === c; }).sort(function (a, b) { return a.title.localeCompare(b.title); });
        h += (cats.length > 1 ? '<h3 class="ocat">' + esc(c || "Other") + "</h3>" : "") + '<ul class="oitems">' + items.map(function (x) {
          var callFirst = VF.howTo(x) === "call" && VF.howTo(ref) !== "call";
          return '<li id="item-' + esc(base(x.id)) + '"><b>' + esc(x.title) + "</b>" + details(x) + (x.case ? '<p class="why">♥ ' + esc(x.case) + "</p>" : "") +
            (callFirst ? '<p class="callnote">Call first for this one: ' + VF.linkPhones(o.phone) + "</p>" : "") + "</li>";
        }).join("") + "</ul>";
      });
      h += "</section>";
    });
    /* Wish List at the bottom, each item with its own drop-off box (they may be at different sites). */
    if (wish.length) {
      h += '<section class="owish"><h2>Wish List</h2><p class="lead">Specifically requested: asked for by name, for a specific person or program, and needed right now.</p><div class="results">' +
        wish.map(function (x) {
          return '<article class="res" id="item-' + esc(base(x.id)) + '">' + (multi ? '<p class="org">' + esc(VF.short(x.o)) + "</p>" : "") +
            '<h3 class="want">' + esc(x.title) + "</h3>" + details(x) + (x.case ? '<p class="why">♥ ' + esc(x.case) + "</p>" : "") + VF.spot(x) +
            '<p class="cardfoot">' + shareBtn(x) + "</p></article>";
        }).join("") + "</div></section>";
    }

    $("page").innerHTML = h;

    $("sharepage").onclick = function () { VF.share(this, nick + " on Victoria Freebies", "Here’s everything " + nick + " is asking for right now:", location.pathname); };
    $("page").onclick = function (e) {
      var b = e.target.closest && e.target.closest("button[data-share]"); if (!b) return;
      var x = mine.filter(function (l) { return l.id === b.getAttribute("data-share"); })[0]; if (!x) return;
      VF.share(b, x.title + " for " + VF.short(x.o), VF.short(x.o) + " is asking for " + x.title.toLowerCase() + ". Can you help?", location.pathname + "#item-" + base(x.id));
    };

    /* Arriving from a shared link or an "also takes" link to one item: bring it into view and highlight it. */
    var el = location.hash && document.getElementById(location.hash.slice(1));
    if (el) { el.classList.add("flash"); if (!shown) { shown = true; el.scrollIntoView({ block: "center", behavior: REDUCED ? "auto" : "smooth" }); } }
  }

  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) {}
  if (cached && Array.isArray(cached.listings)) render(cached, true);
  fetch("/api/listings", { headers: { Accept: "application/json" } }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
    if (!d || !Array.isArray(d.listings)) throw 0;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) {}
    render(d);
  }).catch(function () {
    if (D) return;
    $("oname").textContent = "Couldn’t load this page";
    $("osub").textContent = "Please try again in a few minutes.";
  });
})();
