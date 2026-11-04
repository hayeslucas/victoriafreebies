# Victoria Freebies

- `index.html` — the page and its wording.
- `charities.json` — the charities and what they want. One block per charity.

## Editing a charity
Each charity looks like this. Keep the quotes, colons and commas exactly as they are.
- name, area ("Victoria, Langford" style), note (short sentences, each ends with a period)
- items: each has "text" and "status" (requested, accepted or contact)
- conditions: any of "new", "gently", "opened"
- pickup: text, or "" for none
- how: "direct", "programs", "sold" or ""
- drop: "walk-in", "appointment" or ""
- source: where the info came from, checked: date as "2026-11-03"

After editing, paste the whole file into jsonlint.com to check it for typos before you commit.
