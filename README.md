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

If the chosen detail is missing on the organization (for example Drop Off Ready but no Address), the card falls back
to the other one ("Call to arrange a drop-off"), so fill in the matching field.

**Writing listings:** one listing = one kind of item a donor would search for.
- **Title:** the item, plural, 1–4 words ("Tents and tarps", not "Camping gear is always needed").
- **Item details:** optional. Only what the title doesn't already say: which kinds, sizes, condition, quantity,
  and what's *not* wanted. Leave it blank if it would just repeat the title. Condition is one of **New only** ·
  **New or gently used** · **Any condition**; quantity goes at the end as "(about 10)". Put exclusions in their own
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

**Search** (in `index.html`) ranks results in three tiers: listings that name the item or a true synonym
(`SYN`, e.g. coat = jacket = parka); then catch-all listings for the item's category (`CATOF` maps items to
categories, `BROAD` says which titles count as catch-alls, e.g. a thrift store's "Clothing"); then pet items when
the search wasn't about pets. If a new kind of item doesn't find the catch-all listings it should, add it to `CATOF`.

**Organization pages** (`/org/<name>`, built by `org.js` from the same API data): one page per parent
organization (all of Cool Aid's sites share `/org/victoria-cool-aid-society`), with one section per site (Organizations → **Page Order** first, e.g. REES 1 and Rock Bay
Landing 2 on Cool Aid's page; then drop-off sites before call-first ones, then most needs), each a compact table with drop-off-ready items first and Wish List items tagged, plus a **Donate money** button (Organizations → **Donate Link**) and its
**Website**. `/org` lists every charity and is the top bar's **Charities** link (top bar: Search · Wish List · Charities · About; "For charities" is in the footer and at the top of `/org`). Card names and "has N other needs" link here; Wish List items have a
Share button that links to the item on this page. **Preferred Name** (e.g. "Cool Aid") is used where space is tight:
card lines and footers, share messages, tab titles. The full Name stays on the page heading. The page address comes from the organization's name, so renaming
an organization in Airtable changes its link.

**Keeping wording in sync (important):** a request travels Form → Submission Intake → (approved) →
automation → Donation Listings → website. The approval automation copies select options **by name**, so these
fields must have *identical* option names in Submission Intake and Donation Listings:
"Drop off?", "Specifically Requested?" (What kind of request) and "Category". If you reword an option, reword it
in both tables. The website reads options by keyword, so it keeps working as long as the call-first option
contains "Call", the drop-off option contains "Drop" and the wish-list option contains "Wish". Category names
appear on the site's category buttons exactly as written.

**Wish List:** listings whose **Specifically Requested?** field includes "Specifically Requested" get a
"Specifically requested" tag and appear on the Wish List (`/wish-list`, linked from the top bar). Listings marked
"General" appear in search as usual.

Changes show up within about 10 minutes. Vercel's CDN caches the API response
(`s-maxage=600`), so Airtable is called about once every 10 minutes no matter how much traffic the site gets.

Charities submit new listings through the Airtable form:
https://airtable.com/appgw8rdpxxxGmWG3/pagYtNiHWxy6HWE64/form

Only these organization fields are sent to the site: name, **Public Phone**, address, drop-off hours,
website, **Drop-off Instructions**, **Donate Link** and **Preferred Name**. Contact name, email and Contact Phone stay private.

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
