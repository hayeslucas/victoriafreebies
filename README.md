# Victoria Freebies

A one-page site: donors search for an item and see which Greater Victoria charities want it.

## How it works

- `index.html` is the whole front end (no build step).
- `api/listings.js` is a Vercel function. It reads the Airtable base "Victoria Donations Directory"
  and returns the public listings as JSON at `/api/listings`.
- The page fetches `/api/listings` when it loads. It keeps the last good copy in the visitor's
  browser, so repeat visits show results at once and still work if the API is down.

## Editing listings

Edit listings in Airtable. A listing appears on the site when:

- **Publicly Visible** is checked,
- **Status** is `Active`, and
- **Expiry Date** is empty or not yet past.

Each listing's **Drop off?** field decides how donors reach the charity:

- **Drop Off Ready (address and hours)**: the card says "Drop it off at" with the organization's Address and Drop-off Hours.
- **Phone first**: the card says "Call first" with the organization's Public Phone.
- **Email first**: the card says "Email first" with the organization's **Public Email**, and never shows an address
  (for charities that protect residents' privacy, e.g. youth housing). Falls back to the phone, never the address.

If the chosen detail is missing on the organization (for example Drop Off Ready but no Address), the card falls back
to the other one ("Call to arrange a drop-off"), so fill in the matching field.

**One listing, several shops:** link a listing to several organizations (e.g. Beacon's three thrift shops) and the
search shows **one** card: the first shop in full (Page Order decides which), the rest under "N more locations".
Organization pages still list it under each shop.

**Writing listings:** one listing = one kind of item a donor would search for.
- **Title:** the item, plural, 1–4 words ("Tents and tarps", not "Camping gear is always needed").
- **Item details:** always fill in, with what the title doesn't already say: which kinds, sizes, condition, quantity,
  and what's *not* wanted. Don't just repeat the title. Condition is one of **New only** ·
  **New or gently used** · **Any condition**; quantity goes at the end in words ("about 10 needed", "2 needed"; leave it out for just one). Never leave details blank or just a number. Put exclusions in their own
  sentence starting with "No" or "Not accepted" ("No pillows."): search skips those sentences, so a search for
  "pillows" won't find a listing that turns pillows away. Never other kinds of items: if you find yourself listing
  other things, split it into another listing.
- **Who will this help?** One full sentence that starts with who benefits and says how
  ("Women staying at Sandy Merriman House need…"), not a fragment ("Womens shelter in need").
- **Organizations → Drop-off Instructions:** standing rules for everything a charity accepts (where to park, which
  door, "no pickups"). Shown in the drop-off box of every one of its listings. Charities set it with the form's
  "Drop-off instructions" question; on approval the automation copies it to the organization (blank = keep).
  Don't repeat the address or hours here; the card shows them.
- The listing field **Public Instructions (retired)** is no longer shown on the site and can be deleted.
- Split when the parts would be searched for separately, have different rules, or belong in different
  categories. Broad listings are fine when the charity really takes the whole category (e.g. a thrift store's
  "Clothing"). Wish List = a specific quantity for a specific purpose; anything always accepted is Ongoing.

**Search words** (Donation Listings → **Search words**, hidden on the site): extra words donors might type, separated by
commas ("lawn mower, weed eater, leaf blower" on Habitat's "Garden and outdoor"). Search treats them almost like the
title. The Friday scheduled task fills them in for any active listing where they're blank and never overwrites
words someone typed; add a word any time a search should have found a listing. Only list things the listing really accepts.

**"No …" sentences count.** If a listing's Items, or the charity's Drop-off Instructions, has a sentence starting
"No" or "Not" ("No beds or mattresses."), a search for any word in it leaves that listing out entirely, even as a
catch-all. "No mattresses" also counts for a search for beds (`EXREL` in `index.html`). So write exclusions as their own "No …" sentence.

**Search** (in `index.html`) ranks results in three tiers: listings that name the item or a true synonym
(`SYN`, e.g. coat = jacket = parka); then catch-all listings for the item's category (`CATOF` maps items to
categories, `BROAD` says which titles count as catch-alls, e.g. a thrift store's "Clothing"); then pet items when
the search wasn't about pets. With two or more words, if some listings match every word, listings matching only some
of them are dropped ("pressure washer" doesn't find a clothes "washer"). If no listing has every word ("kids winter jacket"), listings with the last word (the thing itself) win.
Two-word names whose first word changes the meaning ("dish soap", "air mattress", "car seat", "coffee table") are
glued together by `COMP`, so "dishes" doesn't find dish soap and "mattress" doesn't find air mattresses; add a pair
there when a search finds the wrong thing. `KINDOF` is one-way ("drill" finds a "Tools" listing, not the reverse).
Searches for car seats, cribs, strollers or mattresses explain that most charities can't take them.
"Garden" and "Sports" are search groups even though
those listings sit under the Other category: mower, trimmer, wheelbarrow and so on find listings with "garden" or "yard"
in the title; skis, weights, golf and so on find "Sports equipment". If a new kind of item doesn't find the catch-all listings it should, add it to `CATOF`.

**Organization pages** (`/org/<name>`, built by `org.js` from the same API data): one page per parent
organization (all of Cool Aid's sites share `/org/victoria-cool-aid-society`), with one section per site (Organizations → **Page Order** first, e.g. REES 1 and Rock Bay
Landing 2 on Cool Aid's page; then drop-off sites before call-first ones, then most needs), each a compact table with drop-off-ready items first and Wish List items tagged, plus a **Donate money** button (Organizations → **Donate Link**) and its
**Website**. `/org` lists every charity and is the top bar's **Charities** link (top bar: Search · Wish List · Charities · About; "For charities" is in the footer and at the top of `/org`). Card names and "has N other needs" link here; Every search card, each organization page and each
site on a parent's page (e.g. Mount Edwards) have a Share menu (Facebook, X, WhatsApp, Bluesky, Email, Copy link, and the phone's own share
sheet as "More…"). `/org` has a search box (charity names and what they need) and a cause drop-down from Organizations → **Cause**
(a charity shows its own causes plus any its sites have, e.g. Cool Aid gets Women from Sandy Merriman House).
**Preferred Name** (e.g. "Cool Aid") is used where space is tight:
card lines and footers, share messages, tab titles. The full Name stays on the page heading. The page address comes from the organization's name, so renaming
an organization in Airtable changes its link.

**Map and charities boxes** (home page, above the results, side by side): a small map (`map.js`) that opens full
screen when tapped, and a charities box listing charities with their number of needs (random order each visit, so
every charity gets a turn near the top; after a search, the matching charities, most matches first). Both follow the
search, category and filters. Positions come from Organizations → **Latitude** /
**Longitude**. If those are blank, the site looks the Address up on OpenStreetMap by itself, so new places appear
without any extra step; fill them in by hand only if a pin lands in the wrong spot. Pins close together group into
one bubble showing their total needs. Places with a drop-off listing get a pin with their address. Call-first and email-first places get a shaded
circle about 1 km wide: the API sends only a rounded position and **no address** for them, so the exact spot never
reaches the browser. Places with no Latitude/Longitude aren't on the map. Map tiles: OpenStreetMap; library: Leaflet.

**Keeping wording in sync (important):** a request travels Form → Submission Intake → (approved) →
automation → Donation Listings → website. The approval automation copies select options **by name**, so these
fields must have *identical* option names in Submission Intake and Donation Listings:
"Drop off?", "Specifically Requested?" (What kind of request) and "Category". If you reword an option, reword it
in both tables. The website reads options by keyword, so it keeps working as long as the call-first option
contains "Call", the email-first option contains "Email", the drop-off option contains "Drop" and the wish-list option contains "Wish". Category names
appear on the site's category buttons exactly as written.

**Wish List:** listings whose **Specifically Requested?** field includes "Specifically Requested" get a
"Specifically requested" tag and appear on the Wish List (`/wish-list`, linked from the top bar). Listings marked
"General" appear in search as usual.

Changes show up within about 10 minutes. Vercel's CDN caches the API response
(`s-maxage=600`), so Airtable is called about once every 10 minutes no matter how much traffic the site gets.

Charities submit new listings at **victoriafreebies.ca/post** and changes at **/update** (`post.html`, `update.html`).
Each page embeds an Airtable form (Donation Request Form `pagYtNiHWxy6HWE64`, Update or remove a request `pagHqujgGW1WxH8uR`),
so the address bar stays on our domain. Both forms must be shared as "Anyone with the link" in Airtable or the embed won't load.
The embed doesn't resize itself: if a form gets much longer, raise `.af-post`/`.af-up` heights in `styles.css`.

Only these organization fields are sent to the site: name, **Public Phone**, address, drop-off hours,
website, **Drop-off Instructions**, **Donate Link** and **Preferred Name**. Contact name, email and Contact Phone stay private.

## Analytics

Every page loads Vercel Web Analytics (`/_vercel/insights/script.js`): page views, visitors, top pages and referrers,
with no cookies. Searches show up as page views with `?q=…` in the address. See it in the Vercel project → Analytics.


**Search log.** Vercel's analytics doesn't keep the search words, so the site logs them itself. When someone stops
typing for 2.5 seconds, `index.html` (`logSearch`) sends the words, how many listings and charities matched, and
where (Search, Wish List or Map) to `/api/search`. That forwards them to the Airtable automation **Log a search**,
which adds a row to the **Searches** table. Each search is sent once per visit, and only from victoriafreebies.ca
(not local testing). Nothing about the person is sent. The webhook address is the Vercel environment variable
`AIRTABLE_SEARCH_HOOK`; without it, nothing is logged. Each search uses one Airtable automation run.

## Setup on Vercel

1. In Airtable, create a personal access token (https://airtable.com/create/tokens) with the
   scope `data.records:read` and access to the "Victoria Donations Directory" base only.
2. In the Vercel project, go to Settings → Environment Variables and add `AIRTABLE_TOKEN` with
   that token. `AIRTABLE_BASE_ID` is optional and defaults to the current base.
3. Redeploy.

The function reads fields by ID, so renaming most fields in Airtable is safe. The exception is the
visibility filter in `api/listings.js` (`VISIBLE`), which uses the names "Publicly Visible", "Status"
and "Expiry Date". If you rename one of those, update that line.

## Running locally

```bash
npm i -g vercel
vercel env pull   # copies AIRTABLE_TOKEN into .env.local
vercel dev
```

## Share image (link previews)

Every page's `og:image` points to `icons/og.png` (the year-round image). From Nov 28, 2026 until early January
it points to `icons/og-holiday.png` ("Give what's needed this season", with snowflakes). To switch back, replace
`og-holiday.png` with `og.png` in all six HTML pages and restore the `og:image:alt` text
("Victoria Freebies: Have something to donate? Find out exactly who needs it.").
