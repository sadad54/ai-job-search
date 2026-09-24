#!/usr/bin/env bun
// Self-contained CLI for searching jobs on RemoteOK (remoteok.com), a global
// remote-work job board. No external CLI framework, so it runs anywhere `bun`
// is available with zero install beyond the repo clone.
//
// Data source: RemoteOK's public JSON API (verified live 2026-09-24). robots.txt
// explicitly allows ClaudeBot/anthropic-ai to crawl it (Crawl-delay: 1).

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", n: "limit" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--") || a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const HELP = `remoteok-cli — search jobs on RemoteOK (global remote jobs, remoteok.com)

USAGE
  bun run src/cli.ts search --query "<text>" [flags]
  bun run src/cli.ts detail <slug|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>   Keywords (job title, skill, or role). REQUIRED.
  --limit, -n <n>       Cap results emitted (client-side).
  --format <fmt>        json (default) | table | plain.

NOTES
  RemoteOK has no --page or --jobage flag in this CLI: the API returns a fixed
  "latest jobs" window (~100 postings), not a browsable archive, and has no
  posting-age parameter. All jobs on this board are remote by definition, so
  there is no --location flag either.

  RemoteOK's tag search only matches its own canonical tag vocabulary exactly
  (e.g. "machine-learning", "python"). If your query doesn't match a real tag,
  the CLI automatically falls back to a client-side substring match over the
  latest jobs' titles/tags/companies, so you still get best-effort results —
  but a very specific or unusual phrase may return fewer hits than a portal
  with true free-text search.

EXAMPLES
  bun run src/cli.ts search -q "machine learning" --format table
  bun run src/cli.ts search -q "python" -n 10 --format table
  bun run src/cli.ts search -q "backend engineer" --format table
  bun run src/cli.ts detail remote-sr-solutions-architect-extrahop-1137394 --format plain
`

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set(["query", "limit", "format", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  const knownFlags = KNOWN_FLAGS[cmd]
  if (knownFlags) {
    for (const key of Object.keys(flags)) {
      if (key === "_" || knownFlags.has(key)) continue
      process.stderr.write(
        JSON.stringify({
          error: `unknown flag --${key} for '${cmd}' - see --help for the supported flags`,
          code: "UNKNOWN_FLAG",
        }) + "\n",
      )
      return 1
    }
  }

  if (cmd === "search") {
    const query = typeof flags.query === "string" ? flags.query : undefined
    if (!query) {
      process.stderr.write(
        JSON.stringify({ error: 'the --query/-q flag is required (e.g. -q "machine learning")', code: "NO_QUERY" }) +
          "\n",
      )
      return 1
    }
    const fmt = (flags.format as string) || "json"

    let limit: number | undefined
    if (flags.limit !== undefined) {
      const val = typeof flags.limit === "string" ? Number(flags.limit.trim()) : NaN
      if (!Number.isInteger(val) || val < 1) {
        process.stderr.write(
          JSON.stringify({ error: `--limit must be a whole number of at least 1, got "${flags.limit}"`, code: "BAD_ARG" }) + "\n",
        )
        return 1
      }
      limit = val
    }

    const opts: SearchOpts = {
      query,
      limit,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const idOrUrl = (flags._ as string[])[1]
    if (!idOrUrl) {
      process.stderr.write(JSON.stringify({ error: "detail requires a <slug|url>", code: "NO_ID" }) + "\n")
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = {
      idOrUrl,
      format: (fmt === "plain" ? "plain" : "json") as DetailOpts["format"],
    }
    return runDetail(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e), code: "INTERNAL_ERROR" }) + "\n",
    )
    process.exit(1)
  })
