# Hiredly (my.hiredly.com) URL Reference

Investigated live 2026-09-23 via `curl` + `mcp__claude-in-chrome` network inspection.

## Domain note

`hiredly.com` 308-redirects to `my.hiredly.com` (the canonical Malaysia site — Hiredly also runs
`sg.hiredly.com` etc. for other SEA markets, out of scope here). Always use `my.hiredly.com`.

## robots.txt

```
https://my.hiredly.com/robots.txt
```

Lists `Allow: /` only for Googlebot/Bingbot/GPTBot/ChatGPT-User, but has **no `Disallow` lines at
all** — there is no restrictive default rule for other agents, so search/detail access is open.
(Contrast with `jobstreet.com.my`/`my.jobstreet.com`, whose `robots.txt` disallows `/api/jobsearch/`,
`/graphql`, `*/job/`, and any URL containing `?` for the default `User-agent: *` rule — that portal
was skipped entirely, see repo decision log / conversation history.)

## Search

```
GET https://my.hiredly.com/<keyword-slug>-jobs?page=<n>
```

- `<keyword-slug>` is the search query lowercased, spaces → hyphens (e.g. `"machine learning"` →
  `machine-learning-jobs`).
- **This is a real page route, not a query-string search** — `?keyword=...` on `/jobs` does
  nothing (verified: it left the search box empty and returned the unfiltered default listing).
  The UI itself navigates to `/machine-learning-jobs` when you type and submit "machine learning".
- `page` is a real query param on this route (`?page=2`), 1-indexed, ~30 results/page.
- An unmatched/nonsense slug returns HTTP 200 with an empty `jobs` array (not a 404 or crash).
- Results can include loosely-related/boosted postings mixed in (e.g. a title containing
  "Machine" for a `machine-learning-jobs` query) — Hiredly interleaves sponsored/boosted listings;
  this is the site's own behavior, not a bug in the CLI's parsing.

### Response shape

The page is server-rendered (Next.js `getServerSideProps`). The full job list is embedded in:

```html
<script id="__NEXT_DATA__" type="application/json">
  { "props": { "pageProps": { "jobs": { "0": {...}, "1": {...}, ... } } } }
</script>
```

`jobs` is a JS array serialized as a numeric-keyed object — iterate with `Object.values`. Each
entry has `id` (internal UUID — **not usable for detail lookup**), `slug` (**use this as the
CLI's `id`** — it's what the detail route needs), `title`, `company.name`, `location`,
`stateRegion`, `salary` (or `"Undisclosed"`), `jobType`, `activeAt`/`createdAt`, `externalJobUrl`
(set when the posting redirects off-site).

## Detail

```
GET https://my.hiredly.com/jobs/<slug>
```

Found by clicking a job card in a live browser session (network/URL inspection) — the slug is
**not** rendered as a static `<a href>` in the search page's initial HTML (cards are wired up
client-side), so it must come from the `slug` field in a search result's embedded JSON, not from
grepping the page source.

Also SSR — `__NEXT_DATA__` → `props.pageProps.job` (a single object, not a `jobs` array) with the
same fields as a search-result entry plus `description` (HTML), `shortDescription`,
`requirements` (HTML), `careerLevel`, `minYearsExperience`/`maxYearsExperience`.

**Important:** the bare slug string as a top-level page (`/<slug>` without `/jobs/`) does **not**
work — it's swallowed by the same catch-all route as search and returns an empty `jobs: []` (the
slug doesn't match any job as a keyword filter). The `/jobs/` prefix is required.

## Location filtering — not composable with keyword search

- `/jobs-in-<city-slug>` (e.g. `/jobs-in-kuala-lumpur`) is a real route returning that city's
  unfiltered listing.
- `/<keyword-slug>-jobs-in-<city-slug>` (combining both) returns **HTTP 404** — confirmed live.
- No other combined-filter URL pattern was found in the time available. The CLI has no
  `--location` flag; SKILL.md tells users to put the city in `--query` as free text instead
  (matches on location text sometimes surfaces in results, but this is unverified/best-effort).

## Job-age / posted-within filtering

Not found. The visible "Filter" button in the UI wasn't reverse-engineered (would require
GraphQL request-body inspection via `https://my-api.hiredly.com/api/job_seeker/v1/graphql`, a POST
endpoint whose query shape wasn't captured). The CLI has no `--jobage` flag; all results are
returned regardless of posting age.

## Fetching

- Plain `fetch`/`curl` with an honest `User-Agent` (`hiredly-search-cli/1.0`) gets full SSR data —
  no browser, no API key, no GraphQL request needed for search or detail.
- Zero runtime dependencies: no HTML DOM parser needed either, since the payload is JSON already
  embedded via regex-extractable `<script id="__NEXT_DATA__">`.
