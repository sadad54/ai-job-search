import {
  SEARCH_URL,
  htmlFetch,
  parseJobCards,
  jobageToTPR,
  minutesToTPR,
  workTypeFlag,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location: string
  jobage: number
  jobageMinutes?: number
  remote?: string // "remote" | "hybrid" | "onsite"
  visaHint?: boolean
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

// LinkedIn's public jobs-guest endpoint has no real visa-sponsorship filter
// (verified: the authenticated UI's f_VJ param has no effect on unauthenticated
// requests — the guest endpoint returns identical results with or without it).
// --visa-hint is a keyword heuristic only: low precision, no recall guarantee.
function applyVisaHint(query: string | undefined): string | undefined {
  const hint = "visa sponsorship"
  if (!query) return hint
  return `${query} ${hint}`
}

function buildUrl(opts: SearchOpts): string {
  const params = new URLSearchParams()
  const keywords = opts.visaHint ? applyVisaHint(opts.query) : opts.query
  if (keywords) params.set("keywords", keywords)
  if (opts.location) params.set("location", opts.location)
  const tpr = opts.jobageMinutes !== undefined ? minutesToTPR(opts.jobageMinutes) : jobageToTPR(opts.jobage)
  if (tpr) params.set("f_TPR", tpr)
  const wt = workTypeFlag(opts.remote)
  if (wt) params.set("f_WT", wt)
  params.set("start", String((opts.page - 1) * 10))
  return `${SEARCH_URL}?${params.toString()}`
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 42).padEnd(42)
    const company = (c.company || "—").slice(0, 26).padEnd(26)
    const loc = (c.location || "—").slice(0, 24).padEnd(24)
    const date = c.date || "—"
    return `${c.id.padEnd(11)} ${title} ${company} ${loc} ${date}`
  })
  const header =
    "ID".padEnd(11) +
    " " +
    "TITLE".padEnd(42) +
    " " +
    "COMPANY".padEnd(26) +
    " " +
    "LOCATION".padEnd(24) +
    " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const html = await htmlFetch(buildUrl(opts))
    let cards = parseJobCards(html)
    if (opts.limit !== undefined && opts.limit >= 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.date || "—"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: cards.length, page: opts.page }, results: cards },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
