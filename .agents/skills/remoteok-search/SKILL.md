---
name: remoteok-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search for remote jobs, find remote
  job listings, or look up a specific remote job posting on RemoteOK — a global
  remote-work job board covering software, data, AI/ML, design, marketing, and
  other roles. Every listing on this board is remote by definition, so no
  location filter is needed. Trigger phrases: remote jobs, remote job search,
  remote positions, work from home jobs, RemoteOK, remote-first roles, digital
  nomad jobs.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/remoteok-search/cli/src/cli.ts *)
---

# RemoteOK Search Skill

Search live job listings from [RemoteOK](https://remoteok.com)'s public JSON API — a
global remote-work job board. No authentication, no API key, and **zero runtime
dependencies** — it runs with just `bun`.

RemoteOK's `robots.txt` explicitly allows `ClaudeBot`/`anthropic-ai` to crawl it
(`Allow: /`, `Crawl-delay: 1`) — this portal has opted in to AI-agent access, not merely
tolerated it under a generic `Allow: /`.

## When to use this skill

- Search for remote job openings by keyword (title, skill, or role)
- Get the full description of a specific remote posting

## Commands

### Search job listings

```bash
bun run .agents/skills/remoteok-search/cli/src/cli.ts search --query "<text>" [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — **required.** Keywords (job title, skill, or role).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/remoteok-search/cli/src/cli.ts detail <slug|url> [--format json|plain]
```

`slug` is the `id` field from `search` results (e.g.
`remote-sr-solutions-architect-extrahop-1137394`). You may also pass a full
`https://remoteok.com/remote-jobs/<slug>` URL. Returns the full description, salary range,
employment type, and posting validity window.

## Usage examples

```bash
# Machine learning roles, remote
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q "machine learning" --format table

# Python roles
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q "python" -n 10 --format table

# Backend engineering roles
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q "backend engineer" --format table

# Full details for a specific posting
bun run .agents/skills/remoteok-search/cli/src/cli.ts detail remote-sr-solutions-architect-extrahop-1137394 --format plain
```

## Output format

| Format  | Description |
|---------|-------------|
| `json`  | `{ "meta": { "count", "page" }, "results": [...] }` — default, machine-readable |
| `table` | Fixed-width columns: ID, title, company, location, date |
| `plain` | Human-readable block per result |

## Notes

- **No `--page` or `--jobage` flag.** RemoteOK's public API returns a fixed "latest jobs"
  window (~100 postings), not a browsable archive, and has no posting-age query parameter.
- **No `--location` flag.** Every job on RemoteOK is remote by definition; `location` in the
  output usually reads `"Remote"` but may show a timezone/region constraint (e.g. "Remote -
  United States") for roles with geographic restrictions.
- **Tag-search quirk:** RemoteOK's `?tags=` filter is an exact match against its own tag
  vocabulary, not free-text search. A query outside that vocabulary (an unusual multi-word
  phrase) automatically falls back to a client-side substring match over the latest jobs list —
  this gives best-effort recall but may return fewer/different hits than a true full-text
  search for very specific phrasing. See `url-reference.md` for the verified quirk list.
- Detail lookups hit the individual posting's own page (not the `/api` list), so they work for
  any slug ever posted — not just the ~100 rows currently in the "latest jobs" window.
