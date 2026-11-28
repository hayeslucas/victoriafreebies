// POST /api/search  { search, results, charities, where }
// Saves what donors search for to the Searches table in Airtable, through the "Log a search"
// automation's webhook (AIRTABLE_SEARCH_HOOK in Vercel). Nothing about the person is sent:
// no IP address, no browser details, only the words typed and how many results they got.
const WHERE = ["Search", "Wish List", "Map"];

const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(request) {
  const hook = process.env.AIRTABLE_SEARCH_HOOK;
  let b = null;
  try { b = JSON.parse(await request.text()); } catch (e) { /* ignore */ }
  const search = String((b && b.search) || "").toLowerCase().replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  const num = (v) => Math.max(0, Math.min(999, parseInt(v, 10) || 0));
  if (!hook || search.length < 2) return done();
  try {
    await fetch(hook, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ search, results: num(b.results), charities: num(b.charities), where: WHERE.indexOf(b.where) > -1 ? b.where : "Search" }),
    });
  } catch (e) { /* logging must never break anything */ }
  return done();
}
