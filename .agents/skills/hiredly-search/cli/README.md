# hiredly-cli

Zero-dependency CLI for searching jobs on [Hiredly](https://my.hiredly.com), a Malaysia-focused
tech/SME job board. Runs on `bun` alone — no API key, no browser.

## Why this works without a browser

Hiredly is a Next.js SSR site: both its search-results pages and its job-detail pages embed the
full job data server-side in a `<script id="__NEXT_DATA__">` JSON blob. A plain `fetch`/`curl`
gets the same data a browser would after JS execution — no headless browser needed. Verified live
2026-09-23 via `mcp__claude-in-chrome` network inspection (see `../url-reference.md`).

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
