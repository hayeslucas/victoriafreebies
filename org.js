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
  function details(x) { return x.items && x.items.toLowerCase() !== x.title.toLowerCase() ? '<p class="items">' + esc(x.items) + "</p>" : ""; }
  function shareBtn(x) { return '<button type="button" class="sharebtn" data-share="' + esc(x.id) + '">' + VF.SHARE_ICON + "Share</button>"; }

  /* Every charity, for /org on its own. */
  function directory(d) {
    var orgs = d.orgs || {}, count = {}, seen = {};
    live(d).forEach(function (x) { var t = VF.topId(x.org, orgs), k = t + "|" + base(x.id); if (!seen[k]) { seen[k] = 1; count[t] = (count[t] || 0) + 1; } });
    var ids = Object.keys(count).sort(function (a, b) { return count[b] - count[a] || orgs[a].name.localeCompare(orgs[b].name); }); // most needs first
    document.title = "Local charities · Victoria Freebies";
    $("oname").textContent = "Local charities";
    $("osub").textContent = "Every charity on Victoria Freebies, and how many needs each has posted right now.";
    $("page").innerHTML = '<p class="orgcta">Run a charity? <a href="/charities">Post your requests <span aria-hidden="true">→</span></a></p><ul class="orglist">' + ids.map(function (id) {
      return '<li><a href="/org/' + VF.slug(orgs[id].name) + '"><b>' + esc(orgs[id].name) + "</b><span>" + count[id] + " need" + (count[id] > 1 ? "s" : "") + "</span></a></li>";
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
    $("osub").textContent = n + " need" + (n > 1 ? "s" : "") + " right now" + (multi ? ", across " + locs.length + " locations." : ".") + " Bringing one? See what else you could bring along.";
    $("oactions").innerHTML =
      (t.donate ? '<a class="bigbtn" href="' + esc(t.donate) + '" target="_blank" rel="noopener">Donate money <span aria-hidden="true">↗</span></a>' : "") +
      (t.website ? '<a class="bigbtn alt" href="' + esc(t.website) + '" target="_blank" rel="noopener">Website <span aria-hidden="true">↗</span></a>' : "") +
      '<button type="button" class="alt" id="sharepage">' + VF.SHARE_ICON + "Share this page</button>";

    /* One section per site, with everything that site needs together, so a donor heading to one place
       sees it all in one spot. Sites with the most needs first; a charity with several sites gets a jump list.
       Same rule as the cards: a "Call first" listing shows the phone number, never the address. */
    function isCall(x) { return VF.howTo(x) === "call"; }
    function where(o, call) {
      var addr = o.address ? VF.addressLink(o.address) + (o.hours ? ' <span class="ohrs">· ' + esc(o.hours) + "</span>" : "") : "";
      return '<div class="osite' + (call ? " call" : "") + '">' +
        (call ? '<p><b class="callfirst">Call first</b> ' + VF.linkPhones(o.phone) + "</p>"
              : (addr ? "<p><b>Drop off</b> " + addr + "</p>" : "") + (o.phone ? "<p><b>Phone</b> " + VF.linkPhones(o.phone) + "</p>" : "")) +
        (o.notes ? '<p class="notes">' + esc(o.notes) + "</p>" : "") + "</div>";
    }
    /* The "who it helps" line goes above the table only when every item there shares it. */
    function common(list) { var c = list[0] && list[0].case; return list.length > 1 && c && list.every(function (x) { return x.case === c; }) ? c : ""; }
    function byTitle(a, b) { return a.title.localeCompare(b.title); }
    function row(x, o, shared, callNote, cols, tag) {
      var d = details(x).replace('<p class="items">', "").replace("</p>", "");
      return '<tr id="item-' + esc(base(x.id)) + '"' + (x.wish ? ' class="wishrow"' : "") + '><th scope="row">' + esc(x.title) + (x.wish && tag ? ' <span class="wtag">Wish List</span>' : "") + "</th><td>" + d +
        (x.case && x.case !== shared ? '<span class="rowwhy">♥ ' + esc(x.case) + "</span>" : "") +
        (callNote ? '<span class="rowcall">Call first: ' + VF.linkPhones(o.phone) + "</span>" : "") + "</td>" +
        (cols === 3 ? '<td class="act">' + (x.wish ? shareBtn(x) : "") + "</td>" : "") + "</tr>";
    }
    var sites = locs.map(function (loc) { return { o: orgs[loc], id: loc, list: mine.filter(function (x) { return x.org === loc; }) }; })
      .sort(function (a, b) { return a.list.every(isCall) - b.list.every(isCall) || b.list.length - a.list.length || a.o.name.localeCompare(b.o.name); }); // drop-off sites first
    var h = "";
    if (multi) h += '<nav class="ojump" aria-label="Sites">' + sites.map(function (st) {
      return '<a href="#site-' + esc(st.id) + '">' + esc(VF.short(st.o)) + " <span>" + st.list.length + "</span></a>";
    }).join("") + "</nav>";
    sites.forEach(function (st) {
      var o = st.o, list = st.list, allCall = list.every(isCall), shared = common(list), cols = list.some(function (x) { return x.wish; }) ? 3 : 2;
      var allWish = list.every(function (x) { return x.wish; });
      h += '<section class="oloc" id="site-' + esc(st.id) + '"><h2>' + (multi ? esc(VF.short(o)) : "What they need") + ' <span class="cnt">' + list.length + " need" + (list.length > 1 ? "s" : "") + (allWish ? ' <span class="wtag">from Wish List</span>' : "") + "</span></h2>" +
        where(o, allCall) + (shared ? '<p class="why">♥ ' + esc(shared) + "</p>" : "") +
        '<table class="otable"><thead><tr><th scope="col">Item</th><th scope="col">Details</th>' + (cols === 3 ? '<th scope="col"><span class="sr">Share</span></th>' : "") + "</tr></thead><tbody>";
      /* Drop-off-ready items first, then call-first; everyday before Wish List; then A to Z. */
      list.slice().sort(function (a, b) { return isCall(a) - isCall(b) || a.wish - b.wish || byTitle(a, b); })
        .forEach(function (x) { h += row(x, o, shared, !allCall && isCall(x), cols, !allWish); });
      h += "</tbody></table></section>";
    });

    $("page").innerHTML = h;

    $("sharepage").onclick = function () { VF.share(this, nick + " on Victoria Freebies", "Here’s everything " + nick + " needs right now:", location.pathname); };
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
