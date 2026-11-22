// GET /api/listings
// Reads public listings from Airtable and returns { synced, orgs, listings }.
// The response is cached on Vercel's CDN (see CACHE below), so Airtable is
// called at most about once per cache period, no matter how much traffic the site gets.
//
// Needs these Vercel environment variables:
//   AIRTABLE_TOKEN    personal access token, scope data.records:read, access to this base only
//   AIRTABLE_BASE_ID  optional, defaults to the Victoria Donations Directory base

const BASE_ID = process.env.AIRTABLE_BASE_ID || "appgw8rdpxxxGmWG3";

// Fields are read by ID, so renaming a field in Airtable won't break the site.
const LISTINGS = {
  table: "tblco5ktO1b8RHWdT",
  title: "fld3CrfSICeY5ohAE",
  org: "fldkWSeFmAttZzkeq",
  dropoff: "fldjV2qVZHJQOuNil", // "Drop off?": decides whether the card shows the address or the phone number
  wish: "fldZyRvKY1UQN0a6s", // "Specifically Requested?": "Specifically Requested" puts the listing on the Wish List
  category: "fldw2UAbx1pEpptCo",
  items: "fldJhbzWV0Y4ftROz",
  case: "fld50E7eRJq2Vo82e",
  expires: "fldUf929jkl9X2adv",
};
const ORGS = {
  table: "tbl5P54dhVqE7yqZM",
  name: "fld2jjf0sa3qU5NFc",
  order: "fldTRkRFlBp7G7zls", // "Page Order": position of a site on its parent's organization page (blank = automatic)
  short: "fld2Ze8WffnRgRx9f", // "Preferred Name": short everyday name for tight spots; blank = use Name
  phone: "fldUUNdANQuiEhaRU", // "Public Phone". Never "Contact Phone", which is private.
  address: "fldERugbFTWakgFLU",
  hours: "fldn9qsoJgjE793Jn",
  website: "fld8kMmJu0Y9s4RZm",
  parent: "fldWQp9IZSi1b8cEX", // "Parent Organization", e.g. Swift House -> Victoria Cool Aid Society
  notes: "fldDYgz4NJJM44ziv", // "Drop-off Instructions": standing rules shown in the drop-off box of every listing for this organization
  donate: "fldHUMhogSdDRKrcP", // "Donate Link": the charity's page for giving money, shown on its organization page
};

// Only listings that are switched on, active, and not past their expiry date.
// Formulas use field names; if you rename one of these three fields, update this line.
const VISIBLE =
  "AND({Publicly Visible}, {Status}='Active', IF({Expiry Date}, NOT(IS_BEFORE({Expiry Date}, TODAY())), TRUE()))";

// Fresh for 10 minutes; after that the CDN serves the cached copy and refreshes it in the background.
const CACHE = "public, s-maxage=600, stale-while-revalidate=86400";

async function fetchAll(table, fields, formula) {
  const out = [];
  let offset;
  do {
    const params = new URLSearchParams({ returnFieldsByFieldId: "true", pageSize: "100" });
    fields.forEach((f) => params.append("fields[]", f));
    if (formula) params.set("filterByFormula", formula);
    if (offset) params.set("offset", offset);
    const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${table}?${params}`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Airtable ${table}: ${res.status} ${await res.text()}`);
    const body = await res.json();
    out.push(...body.records);
    offset = body.offset;
  } while (offset);
  return out;
}

const pick = (spec) => Object.entries(spec).filter(([k]) => k !== "table").map(([, id]) => id);
// "Drop off?" options are matched by keyword, so the wording can change freely as long as
// the call-first option contains "Call" (or "phone") and the drop-off option contains "Drop". Blank -> "".
const dropoffMode = (v) => (/\bcall\b|phone/i.test(v) ? "phone" : /drop/i.test(v) ? "ready" : "");
// "Specifically Requested?" options: the Wish List option must contain "Wish" (or "Specific"); anything else is a general listing.
const isWish = (v) => /wish|specific/i.test(v);
const str = (v) => (v == null ? "" : typeof v === "object" && v.name ? v.name : String(v)).trim();

export async function buildData() {
  const [listingRecs, orgRecs] = await Promise.all([
    fetchAll(LISTINGS.table, pick(LISTINGS), VISIBLE),
    fetchAll(ORGS.table, pick(ORGS)),
  ]);

  const listings = [];
  for (const r of listingRecs) {
    const f = r.fields;
    const orgIds = f[LISTINGS.org] || [];
    const title = str(f[LISTINGS.title]);
    if (!orgIds.length || !title) continue; // incomplete record: leave it off the site
    // A listing linked to several organizations (e.g. two thrift stores) becomes one card per organization.
    for (const org of orgIds) listings.push({
      id: orgIds.length > 1 ? `${r.id}-${org}` : r.id,
      added: r.createdTime || "", // when the listing was created in Airtable; used to show newer listings first
      title,
      org,
      dropoff: dropoffMode(str(f[LISTINGS.dropoff])),
      wish: (f[LISTINGS.wish] || []).some((v) => isWish(str(v))),
      category: str(f[LISTINGS.category]),
      items: str(f[LISTINGS.items]),
      case: str(f[LISTINGS.case]),
      expires: str(f[LISTINGS.expires]),
    });
  }

  // Only send charities that have a visible listing, plus their parent organizations
  // (organization pages are per parent, e.g. one page for all of Cool Aid's sites).
  const used = new Set(listings.map((l) => l.org));
  const byId = Object.fromEntries(orgRecs.map((r) => [r.id, r]));
  const parentOf = (r) => {
    const p = (r.fields[ORGS.parent] || [])[0];
    return p && p !== r.id && byId[p] ? p : "";
  };
  const send = new Set(used);
  for (const id of used) if (byId[id] && parentOf(byId[id])) send.add(parentOf(byId[id]));
  const orgs = {};
  for (const r of orgRecs) {
    if (!send.has(r.id)) continue;
    const f = r.fields;
    const parentId = parentOf(r);
    orgs[r.id] = {
      name: str(f[ORGS.name]),
      short: str(f[ORGS.short]) || str(f[ORGS.name]),
      order: typeof f[ORGS.order] === "number" ? f[ORGS.order] : null,
      parent: parentId ? str(byId[parentId].fields[ORGS.name]) : "",
      parentShort: parentId ? str(byId[parentId].fields[ORGS.short]) || str(byId[parentId].fields[ORGS.name]) : "",
      parentId,
      phone: str(f[ORGS.phone]),
      address: str(f[ORGS.address]),
      hours: str(f[ORGS.hours]),
      website: str(f[ORGS.website]),
      notes: str(f[ORGS.notes]),
      donate: str(f[ORGS.donate]),
    };
  }

  return { synced: new Date().toISOString(), orgs, listings };
}

export async function GET() {
  if (!process.env.AIRTABLE_TOKEN) {
    return Response.json({ error: "AIRTABLE_TOKEN is not set" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const data = await buildData();
    return Response.json(data, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error(err);
    // Not cached, so the next request tries again.
    return Response.json({ error: "Could not load listings" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
