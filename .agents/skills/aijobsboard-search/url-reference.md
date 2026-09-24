# AI Jobs Board (aijobs.net / foorilla.com) URL Reference

Investigated live 2026-09-24 via `curl` + `mcp__claude-in-chrome` network inspection.

## Domain note

`aijobs.net/robots.txt` itself redirects (via the site's own routing) straight to
`https://foorilla.com/hiring/`. AI Jobs Board has been absorbed into **foorilla**
("foo🦍"), a broader "career platform for coders, builders, hackers and makers" covering
hiring, media, events, and salary data, not just AI roles. All requests in this skill target
`foorilla.com` directly.

## robots.txt

```
https://foorilla.com/robots.txt
```

`User-agent: *` gets `Allow: /` with a short `Disallow` list (`/account/`, `/regions/`,
`/topics/`, `/hiring/companies/`, `/hiring/jobs/*/apply/`, and a few other
non-job-search paths). **`/hiring/jobs/` itself (the search route this CLI uses) is not
disallowed.** There's also an `Allow: /api/llms.txt` LLM-discovery hint pointing at the
platform's real API.

## The real API requires a paid subscription — not used here

`https://foorilla.com/api/llms.txt` documents a full REST API at `/api/v1/hiring/job/` with
free-text filters (`title`, `location`, `company`). However: *"Every endpoint except the API
root requires an API key... Access requires an active PRO+ subscription."* This CLI does not
use that API — see the HTML-scraping approach below instead.

## Search (HTML scrape via htmx)

```
GET https://foorilla.com/hiring/jobs/?job_search=<query>&page=<n>
Header: HX-Request: true
```

- `job_search` is genuine free-text search (confirmed live: query terms actually appear in
  matched job titles/slugs) — this is the same request the site's own "Quick search" input
  box fires (`hx-get="/hiring/jobs/"`, `hx-trigger="input changed delay:600ms"`).
- **The `HX-Request: true` header is required** to get back just the results fragment; without
  it the server returns the full page shell (still 200, but the results are wrapped in a much
  larger unrelated document and the "quick search" box hasn't run yet client-side).
- The site's structured filter drawer (`/hiring/filter/`) exposes facets like `roles`,
  `tech_skills`, `experience_levels`, `salary` as separate autocomplete-backed multi-selects
  (via `/ac/tag/roles/?q=...` etc., itself unauthenticated and open) — **not used by this
  CLI** to keep the `--query` contract a single free-text string; a future iteration could add
  flags that resolve through the autocomplete endpoints.
- `page` is a real, verified param (confirmed: page 1 and page 2 for the same query returned
  zero overlapping job slugs), 1-indexed, ~50 results/page.
- The `"236,866 new jobs found (60d)"` counter shown near the top of the fragment is a **global
  site counter, not the filtered result count** — don't parse it as `meta.count`; count the
  actual `<li class="list-group-item">` entries instead.

### Response shape

The htmx fragment's results live under `<div id="quick-search-results"><ul class="list-group
list-group-flush ...">`, one `<li class="list-group-item">` (or `list-group-item py-1` for a
featured listing) per job:

- Detail-page slug: `hx-get="/hiring/jobs/<slug>/"` on the `.terminal-title` anchor.
- Title: the anchor's text content (strip a leading `<small>Feat./Featured</small>` badge on
  boosted listings).
- Relative posting age: the sibling `<small>` inside `.terminal-meta` (e.g. `"23d ago"`,
  `"5h ago"`) — **no absolute date is exposed** on the list or detail view.
- Salary: `<small class="text-bg-success">` (featured) or `text-bg-secondary">` (standard).
- Career-level/job-type badges: `<small class="text-warning-emphasis">[SE]</small>` (an
  abbreviation code, meaning not documented by the site) and
  `<small class="text-body-secondary">[Full Time]</small>`.
- Location + a `[R]`/`[WH]` badge (`<span class="text-success">`) in the trailing `.text-end`
  block.

**No company name anywhere in the results list.** This isn't a parsing miss — the markup for
each `<li>` genuinely has no company field on this unauthenticated view.

## Detail

```
GET https://foorilla.com/hiring/jobs/<slug>/
Header: HX-Request: true
```

Also an htmx fragment (the same one loaded into `#main2` when a card is clicked in the live
UI). Adds: `<h1>` title, a `Tasks:` `<ul>` (used as the description in this CLI — there is no
free-text paragraph description on this platform, only a bulleted task list), `Perks/Benefits`,
`Skills/Tech stack required`, `Educational requirements`, and `Role(s)` — each rendered as a
list of `<a class="terminal-tag">[Label]</a>` chips, parsed with a shared `extractTagGroup`
regex helper.

**Company name is truncated/hidden here too** — the hiring-organization link renders literal
placeholder text like `@ I...` rather than the real name, confirmed on multiple postings. This
appears to be a subscription paywall on employer identity specifically (title, tasks, skills,
salary, and location are all shown in full).

An `[R]`/`[WH]` badge with `hx-vals='{"context_key": "WMOD", "context_value": "1"}'` appears
next to the location on some (not all) postings — likely a remote/worldwide-hire signal based
on the tag key name, but this was not confirmed against any site documentation, so the CLI
surfaces it as `remoteBadge` without asserting its meaning.

**Apply links are robots.txt-disallowed and not fetched.** The detail page's "Apply" button
points at `/hiring/jobs/<id>/apply/` — a tracking-redirect path explicitly listed under
`Disallow: /hiring/jobs/*/apply/`. This CLI never requests that path; users click through the
posting's own `url` (the `/hiring/jobs/<slug>/` page) in a browser to apply.

## Fetching

- Plain `fetch`/`curl` with an honest `User-Agent` (`aijobsboard-search-cli/1.0`) plus the
  `HX-Request: true` header gets the full results/detail fragments — no browser, no API key,
  no CAPTCHA (unlike Wellfound/Himalayas, which front the same kind of page with a Cloudflare
  Turnstile/JS challenge that blocks plain HTTP clients entirely).
- Zero runtime dependencies: chunked regex parsing per `<li>`/tag-group, matching the pattern
  used in `hiredly-search`/`linkedin-search` rather than a full DOM parser.
