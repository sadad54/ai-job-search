# remoteok-cli

Zero-dependency CLI for searching jobs on [RemoteOK](https://remoteok.com), a global
remote-work job board. Runs on `bun` alone — no API key, no browser.

## Why this works without a browser

RemoteOK publishes a public JSON API at `remoteok.com/api` (and `remoteok.com/api?tags=<tag>`
for a tag-filtered subset). robots.txt explicitly allows `ClaudeBot`/`anthropic-ai` to crawl
it with a 1s crawl-delay. Detail pages (`/remote-jobs/<slug>`) additionally carry a proper
`schema.org/JobPosting` JSON-LD block, parsed for the full description and structured fields.
Verified live 2026-09-24 (see `../url-reference.md`).

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
