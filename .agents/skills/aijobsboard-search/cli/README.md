# aijobsboard-cli

Zero-dependency CLI for searching jobs on [AI Jobs Board](https://aijobs.net) (aijobs.net,
now served by [foorilla.com](https://foorilla.com), a broader tech/AI job platform). Runs on
`bun` alone — no API key, no browser.

## Why this works without a browser

foorilla.com renders its job search as server-side HTML fetched via htmx. Sending the same
`HX-Request: true` header the site's own "Quick search" box sends returns just the results
fragment — a plain `fetch`/`curl` gets the same markup a browser would after the htmx swap.
Verified live 2026-09-24 (see `../url-reference.md`).

The platform's real JSON API (`foorilla.com/api/v1/`) requires a paid PRO+ subscription, so
this CLI deliberately scrapes the public HTML search instead of that API.

## Known limitation: no company names

Company names aren't exposed on the unauthenticated tier — not in the results list, not on
the detail page (which renders a truncated placeholder). `company` is always `null` in this
CLI's output; open a result's `url` in a browser to see the employer.

## Install

```bash
bun install
bun run typecheck
```

## Usage

```bash
bun run src/cli.ts search -q "machine learning" --format table
bun run src/cli.ts detail <slug> --format plain
```

See `../SKILL.md` for the full flag reference and examples.

## Test

```bash
bun run test
```
