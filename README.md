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

Changes show up within about 10 minutes. Vercel's CDN caches the API response
(`s-maxage=600`), so Airtable is called about once every 10 minutes no matter how much traffic the site gets.

Charities submit new listings through the Airtable form:
https://airtable.com/appgw8rdpxxxGmWG3/pagYtNiHWxy6HWE64/form

Only these organization fields are sent to the site: name, **Public Phone**, address, drop-off hours
and website. Contact name, email and Contact Phone stay private.

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
