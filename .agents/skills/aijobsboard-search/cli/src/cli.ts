#!/usr/bin/env bun
// Self-contained CLI for searching jobs on AI Jobs Board (aijobs.net), which
// redirects to and is served by foorilla.com, a broader tech/AI job platform.
// No external CLI framework, so it runs anywhere `bun` is available with zero
// install beyond the repo clone.
//
// Data source: foorilla.com's htmx-rendered job-search fragment (verified live
// 2026-09-24) — the same request the site's own "Quick search" box makes. The
// platform's real JSON API requires a paid PRO+ subscription, so this CLI scrapes
// the public HTML instead. robots.txt allows /hiring/jobs/.

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

const HELP = `aijobsboard-cli — search jobs on AI Jobs Board (aijobs.net / foorilla.com)

USAGE
  bun run src/cli.ts search --query "<text>" [flags]
  bun run src/cli.ts detail <slug|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>   Keywords (job title, skill, or role). REQUIRED.
  --page <n>           1-indexed page (50 results/page). Default 1.
  --limit, -n <n>       Cap results emitted (client-side).
  --format <fmt>        json (default) | table | plain.

NOTES
  Company names are NOT shown by this portal on the free tier — neither the
  results list nor the detail page exposes them without a paid subscription
  (this is a real platform limitation, not a parsing gap). "company" is always
  null; open the job's "url" in a browser to see the employer.

  No --location filter: this CLI only exposes free-text search. A [WH]/[R]
  badge sometimes appears next to the location in results — believed to signal
  remote/worldwide-hire eligibility based on the site's own tag naming
  (context_key: "WMOD"), but this was not confirmed against site documentation,
  so treat it as a hint, not a guarantee.

EXAMPLES
  bun run src/cli.ts search -q "machine learning" --format table
  bun run src/cli.ts search -q "LLM engineer" -n 10 --format table
  bun run src/cli.ts search -q "backend engineer" --page 2 --format table
  bun run src/cli.ts detail pessoa-desenvolvedora-machine-learning-brasilia-distrito-federal-brasil-3769793 --format plain
`

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set(["query", "page", "limit", "format", "help", "h"]),
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

    const parseIntFlag = (name: string, raw: string | boolean | string[]): number | null => {
      const val = typeof raw === "string" ? Number(raw.trim()) : NaN
      if (!Number.isInteger(val) || val < 1) {
        process.stderr.write(
          JSON.stringify({ error: `--${name} must be a whole number of at least 1, got "${raw}"`, code: "BAD_ARG" }) + "\n",
        )
        return null
      }
      return val
    }

    let page = 1
    if (flags.page !== undefined) {
      const v = parseIntFlag("page", flags.page)
      if (v === null) return 1
      page = v
    }
    let limit: number | undefined
    if (flags.limit !== undefined) {
      const v = parseIntFlag("limit", flags.limit)
      if (v === null) return 1
      limit = v
    }

    const opts: SearchOpts = {
      query,
      page,
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
