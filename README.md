# Victoria Freebies

A one-page site: donors search for an item and see which Greater Victoria charities want it.

- `index.html` is the whole site (no build step).
- Listings come from the Airtable base "Victoria Donations Directory". They are copied into
  `index.html` between `<!--VF-DATA-START-->` and `<!--VF-DATA-END-->`.
- To change a listing, edit it in Airtable, not here. Then copy the updated `index.html` into this repo.
- Charities submit new listings through the Airtable form:
  https://airtable.com/appgw8rdpxxxGmWG3/pagYtNiHWxy6HWE64/form
