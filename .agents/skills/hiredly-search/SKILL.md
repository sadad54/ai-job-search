---
name: hiredly-search
version: 1.0.0
description: >
  Use this skill to search job listings on Hiredly (my.hiredly.com), a
  Malaysia-focused tech/SME job board. Invoke for job search, vacancies, or job
  postings specifically in Malaysia (Kuala Lumpur, Selangor, Penang, Johor,
  etc.) — jawatan kosong, cari kerja, pekerjaan Malaysia, Hiredly jobs. Also
  covers internships and management-trainee listings on the same site.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/hiredly-search/cli/src/cli.ts *)
---

# Hiredly Search Skill

Search live job listings from [Hiredly](https://my.hiredly.com), a Malaysian tech/SME-focused job
board (part of the Wobb/Hiredly Sdn Bhd network). No authentication, no API key, and **zero
runtime dependencies** — it runs with just `bun`.

> Hiredly's search and detail pages are server-rendered (Next.js) and embed the full job payload
> in the page's own `__NEXT_DATA__` JSON — no headless browser or reverse-engineered API call
> needed. See `url-reference.md` for how this was verified.

## When to use this skill

- Search for job openings in Malaysia by keyword (role, skill, title)
- Get the full description of a specific Hiredly job listing

## Commands

### Search job listings

```bash
bun run .agents/skills/hiredly-search/cli/src/cli.ts search --query "<text>" [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — **required.** Keywords (job title, skill, or role), e.g.
  `"machine learning"`, `"data analyst"`, `"software engineer"`.
- `--page <n>` — page number (1-indexed, ~30 results per page).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

**No `--location` or `--jobage` flag.** Hiredly's location filter lives on a separate URL route
that cannot be combined with a keyword search (verified: combining them 404s), and no posting-age
filter was found. If you want to narrow by city, include it in `--query` as free text (e.g.
`-q "data analyst kuala lumpur"`) — this is best-effort text matching, not a real filter.

### Fetch full job detail

```bash
bun run .agents/skills/hiredly-search/cli/src/cli.ts detail <slug|url> [--format json|plain]
```

`slug` is the `id` field from `search` results (e.g.
`jobs-malaysia-snappymob-job-senior-machine-learning-engineer`) — despite the flag name, this is
Hiredly's job slug, not a numeric ID; the site has no ID-based lookup. You may also pass a full
`https://my.hiredly.com/jobs/<slug>` URL. Returns the full description, requirements, career
level, and experience-years range.

## Usage examples

```bash
# Machine learning roles, table view
bun run .agents/skills/hiredly-search/cli/src/cli.ts search -q "machine learning" --format table

# Software engineer roles, cap at 10 results
bun run .agents/skills/hiredly-search/cli/src/cli.ts search -q "software engineer" -n 10 --format table

# Data analyst roles, location as free text, page 2
bun run .agents/skills/hiredly-search/cli/src/cli.ts search -q "data analyst kuala lumpur" --page 2 --format table

# Full details for a specific job
bun run .agents/skills/hiredly-search/cli/src/cli.ts detail jobs-malaysia-snappymob-job-senior-machine-learning-engineer --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing slugs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits
with code `1`.

## Notes

- Data is from Hiredly's SSR pages — no credentials required.
- Results can include loosely-matched or boosted/sponsored postings mixed into a keyword search
  (the site's own behavior, not a CLI bug) — verify relevance before treating a result as a match.
- `robots.txt` on `my.hiredly.com` has no `Disallow` rules for any agent (see `url-reference.md`).
  Contrast: JobStreet Malaysia's `robots.txt` disallows search/detail access for generic bots, so
  a JobStreet portal skill was **not** built for this repo.
