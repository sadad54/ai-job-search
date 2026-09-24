---
name: aijobsboard-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search for tech/AI jobs, find job
  listings, or look up a specific job posting on AI Jobs Board (aijobs.net) —
  a global platform for coders, builders, and AI/ML practitioners (served by
  foorilla.com). Covers software engineering, data, AI/ML, and related roles
  across many countries and remote setups. Trigger phrases: AI jobs, AI jobs
  board, foorilla, tech job search, builder jobs, hacker jobs, AI/ML job
  listings, coder jobs.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/aijobsboard-search/cli/src/cli.ts *)
---

# AI Jobs Board Search Skill

Search live job listings from [AI Jobs Board](https://aijobs.net) (now served by
[foorilla.com](https://foorilla.com)) — a global tech/AI-focused job platform. No
authentication, no API key, and **zero runtime dependencies** — it runs with just `bun`.

foorilla.com's real JSON API requires a paid PRO+ subscription; this skill scrapes the
site's public htmx-rendered search HTML instead (same request the site's own search box
makes), which is unauthenticated and permitted by `robots.txt`.

## ⚠️ Known limitation: no company names

Company names are **not shown** on the free tier — neither in search results nor on the
detail page (which renders a truncated placeholder instead of the real name). `company` is
always `null` in this CLI's output. Open a result's `url` in a browser to see the employer
before deciding whether to pursue it.

## When to use this skill

- Search for tech/AI/ML job openings by keyword (title, skill, or role), globally
- Get the task list, required skills, education requirements, and salary for a specific posting

## Commands

### Search job listings

```bash
bun run .agents/skills/aijobsboard-search/cli/src/cli.ts search --query "<text>" [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — **required.** Keywords (job title, skill, or role).
- `--page <n>` — page number (1-indexed, ~50 results/page).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/aijobsboard-search/cli/src/cli.ts detail <slug|url> [--format json|plain]
```

`slug` is the `id` field from `search` results. You may also pass a full
`https://foorilla.com/hiring/jobs/<slug>/` URL. Returns the task list, required skills,
education requirements, role tags, salary, and location — but **not** the company name (see
limitation above).

## Usage examples

```bash
# Machine learning roles
bun run .agents/skills/aijobsboard-search/cli/src/cli.ts search -q "machine learning" --format table

# LLM engineering roles, page 2
bun run .agents/skills/aijobsboard-search/cli/src/cli.ts search -q "LLM engineer" --page 2 --format table

# Backend engineering roles
bun run .agents/skills/aijobsboard-search/cli/src/cli.ts search -q "backend engineer" -n 10 --format table

# Full details for a specific posting
bun run .agents/skills/aijobsboard-search/cli/src/cli.ts detail pessoa-desenvolvedora-machine-learning-brasilia-distrito-federal-brasil-3769793 --format plain
```

## Output format

| Format  | Description |
|---------|-------------|
| `json`  | `{ "meta": { "count", "page" }, "results": [...] }` — default, machine-readable |
| `table` | Fixed-width columns: ID, title, location, salary, date |
| `plain` | Human-readable block per result |

## Notes

- **`company` is always `null`.** This is a genuine platform limitation on the free tier, not
  a parsing gap — see `url-reference.md`. Always open the job's `url` to identify the employer.
- **No absolute posting date.** Only a relative age string (e.g. `"5h ago"`, `"23d ago"`) is
  exposed; there's no `--jobage` filter in this CLI.
- **No `--location` filter.** Only free-text `--query` search is exposed; include a city or
  "remote" in the query text if you want to narrow by location (best-effort — matches on
  whatever text the posting itself contains).
- A `[WH]`/`[R]` badge sometimes appears next to a result's location — likely a
  remote/worldwide-hire signal (`remoteBadge` in JSON output) based on the site's own tag
  naming, but this wasn't confirmed against site documentation, so treat it as a hint only.
- Apply links are never fetched — they're a robots.txt-disallowed tracking redirect
  (`/hiring/jobs/*/apply/`). Use the posting's own `url` to view and apply in a browser.
