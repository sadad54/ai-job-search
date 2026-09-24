# RemoteOK (remoteok.com) URL Reference

Investigated live 2026-09-24 via `curl`.

## robots.txt

```
https://remoteok.com/robots.txt
```

`User-agent: *` gets `Allow: /` with `Crawl-delay: 1`, plus a `Disallow` list for AJAX/tracking
endpoints (`?action=get_jobs`, `/track-ad`, `/l/`, spam-pattern paths) that this CLI never
touches. A named block explicitly covers `GPTBot`, `ClaudeBot`, `anthropic-ai`, `Claude-Web`,
and other AI/LLM crawlers with the same `Allow: /` + `Crawl-delay: 1` policy — RemoteOK is
opting in to AI-agent crawling, not merely tolerating it.

## Search

```
GET https://remoteok.com/api?tags=<slug>
```

- `<slug>` is the query lowercased, spaces → hyphens (e.g. `"machine learning"` →
  `machine-learning`).
- This is RemoteOK's **own public JSON API** (not reverse-engineered from page source) — the
  `/api` route is documented in the page footer link and its response's element 0 is a
  self-describing `legal` notice (attribution requested, no key required).
- `tags` does an **exact match** against each job's `tags` array — it is not free-text search.
  A query that isn't itself one of RemoteOK's canonical tags (`python`, `machine-learning`,
  `engineer`, `design`, etc.) returns zero rows even when semantically relevant jobs exist
  (verified: `?tags=software-engineer` returns 0 matches even though many "software engineer"
  postings exist under other tags).
- **No pagination and no posting-age filter.** `/api` (unfiltered) returns the site's latest
  ~100 postings; `?id=` and other filter params were tested and ignored (return the same
  unfiltered list). There is no way to page back further through RemoteOK's public API.

### Response shape

A plain JSON array. Element 0 is always the `legal` attribution notice, not a job — skip it
(or just filter on `"position" in entry`, which the legal object lacks). Each job entry has:
`slug` (also the detail-page URL segment — **use this as the CLI's `id`**), `id` (numeric,
same suffix as the slug), `date`, `company`, `position`, `tags` (array), `description` (HTML),
`location` (usually `"Remote"` or a specific city/region for hybrid/timezone-restricted roles),
`apply_url`, `salary_min`/`salary_max` (`0` when undisclosed), `url` (**sometimes mixed-case
`remoteOK.com`** — normalize to lowercase before displaying/testing against it).

## Client-side fallback for free-text queries

Because `tags=` is exact-match-only, `search.ts` re-fetches the unfiltered `/api` list and
filters client-side (substring match on `title`/`company`/`tags`, any word) whenever the
tag-filtered call returns zero rows. This trades perfect precision for better recall on
queries outside RemoteOK's tag vocabulary, and is documented in the CLI's `--help` text so
users know results may differ from a true full-text search.

## Detail

```
GET https://remoteok.com/remote-jobs/<slug>
```

Not part of the JSON API — this is the site's own HTML job-posting page, which carries a
`<script type="application/ld+json">` block for `schema.org/JobPosting` (plus a second block
for the hiring `Organization`). Parsed fields: `title`, `description` (already plain
paragraph-broken text, not HTML — schema.org strips markup), `baseSalary.value.{minValue,
maxValue}`, `employmentType`, `jobLocationType` (`"TELECOMMUTE"` for fully-remote), `jobLocation`
(structured address, often literally `"Anywhere"` for remote-first roles), `validThrough`,
`hiringOrganization.name`.

This detail fetch works for **any** slug that has ever been posted (not limited to the
~100-row `/api` window), since it hits the individual posting's own page rather than the
list endpoint — this is why `detail` doesn't just re-query `/api` and look up the id locally.

## Fetching

- Plain `fetch`/`curl` with an honest `User-Agent` (`remoteok-search-cli/1.0`) gets full data
  for both the JSON API and the HTML detail pages — no browser, no API key, no CAPTCHA.
- Zero runtime dependencies: JSON.parse for the API, a small regex scan for the JSON-LD script
  block on detail pages.
- Respect the 1s `Crawl-delay` from robots.txt when issuing multiple requests in a session
  (the CLI itself only ever makes 1-2 requests per invocation, well within this).
