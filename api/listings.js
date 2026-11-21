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
  category: "fldw2UAbx1pEpptCo",
  items: "fldJhbzWV0Y4ftROz",
  case: "fld50E7eRJq2Vo82e",
  instructions: "fld3YpEhK3A7eML9d",
  expires: "fldUf929jkl9X2adv",
};
const ORGS = {
  table: "tbl5P54dhVqE7yqZM",
  name: "fld2jjf0sa3qU5NFc",
  phone: "fldUUNdANQuiEhaRU", // "Public Phone". Never "Contact Phone", which is private.
  address: "fldERugbFTWakgFLU",
  hours: "fldn9qsoJgjE793Jn",
  website: "fld8kMmJu0Y9s4RZm",
  parent: "fldWQp9IZSi1b8cEX", // "Parent Organization", e.g. Swift House -> Victoria Cool Aid Society
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
// "Drop off?" options: "Drop Off Ready (address and hours)" -> "ready", "Phone first" -> "phone".
// Matched by keyword so small wording changes to the options don't break it. Blank -> "".
const dropoffMode = (v) => (/phone/i.test(v) ? "phone" : /drop/i.test(v) ? "ready" : "");
const str = (v) => (v == null ? "" : typeof v === "object" && v.name ? v.name : String(v)).trim();

export async function buildData() {
  const [listingRecs, orgRecs] = await Promise.all([
    fetchAll(LISTINGS.table, pick(LISTINGS), VISIBLE),
    fetchAll(ORGS.table, pick(ORGS)),
  ]);

  const listings = [];
  for (const r of listingRecs) {
    const f = r.fields;
    const org = (f[LISTINGS.org] || [])[0];
    const title = str(f[LISTINGS.title]);
    if (!org || !title) continue; // incomplete record: leave it off the site
    listings.push({
      id: r.id,
      title,
      org,
      dropoff: dropoffMode(str(f[LISTINGS.dropoff])),
      category: str(f[LISTINGS.category]),
      items: str(f[LISTINGS.items]),
      case: str(f[LISTINGS.case]),
      instructions: str(f[LISTINGS.instructions]),
      expires: str(f[LISTINGS.expires]),
    });
  }

  // Only send charities that have a visible listing.
  const used = new Set(listings.map((l) => l.org));
  const names = Object.fromEntries(orgRecs.map((r) => [r.id, str(r.fields[ORGS.name])]));
  const orgs = {};
  for (const r of orgRecs) {
    if (!used.has(r.id)) continue;
    const f = r.fields;
    const parentId = (f[ORGS.parent] || [])[0];
    orgs[r.id] = {
      name: str(f[ORGS.name]),
      parent: parentId && parentId !== r.id ? names[parentId] || "" : "",
      phone: str(f[ORGS.phone]),
      address: str(f[ORGS.address]),
      hours: str(f[ORGS.hours]),
      website: str(f[ORGS.website]),
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
