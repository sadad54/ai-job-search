import { BASE_URL, textFetch, parseApiResponse, filterCardsByKeywords, slugifyKeyword, writeError, type JobCard } from "../helpers.js"

export interface SearchOpts {
  query: string
  limit?: number
  format: "json" | "table" | "plain"
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 40).padEnd(40)
    const company = (c.company || "—").slice(0, 26).padEnd(26)
    const loc = (c.location || "—").slice(0, 18).padEnd(18)
    const date = (c.date || "—").slice(0, 10)
    return `${c.id.slice(0, 12).padEnd(13)} ${title} ${company} ${loc} ${date}`
  })
  const header =
    "ID".padEnd(13) + " " + "TITLE".padEnd(40) + " " + "COMPANY".padEnd(26) + " " + "LOCATION".padEnd(18) + " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const slug = slugifyKeyword(opts.query)
    const params = new URLSearchParams()
    if (slug) params.set("tags", slug)
    let json = await textFetch(`${BASE_URL}/api?${params.toString()}`)
    let cards = parseApiResponse(json)

    // RemoteOK's `tags` filter is an exact match against each job's tag list, so a
    // query that isn't itself a canonical tag returns zero rows even when relevant
    // jobs exist. Fall back to the unfiltered latest-jobs list and match client-side.
    if (cards.length === 0) {
      const unfiltered = await textFetch(`${BASE_URL}/api`)
      cards = filterCardsByKeywords(parseApiResponse(unfiltered), opts.query)
    }

    if (opts.limit !== undefined && opts.limit >= 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.salary || "—"} · ${c.date || "—"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(JSON.stringify({ meta: { count: cards.length, page: 1 }, results: cards }, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
