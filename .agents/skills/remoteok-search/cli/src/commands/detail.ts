import { BASE_URL, textFetch, parseJobDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  idOrUrl: string
  format: "json" | "plain"
}

/**
 * Parse a detail invocation's <id|url> into a canonical fetch target, or null.
 * A URL input must be a remoteok.com host with a /remote-jobs/<slug> path; the
 * fetch URL is rebuilt from the extracted slug rather than the raw input trusted
 * verbatim.
 */
export function buildUrl(idOrUrl: string): { url: string; slug: string } | null {
  const trimmed = idOrUrl.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    let host: string
    let pathname: string
    try {
      const u = new URL(trimmed)
      host = u.hostname.toLowerCase()
      pathname = u.pathname
    } catch {
      return null
    }
    if (host !== "remoteok.com" && !host.endsWith(".remoteok.com")) return null
    const match = pathname.match(/\/remote-jobs\/([a-zA-Z0-9-]+)/)
    if (!match) return null
    return { url: `${BASE_URL}/remote-jobs/${match[1]}`, slug: match[1] }
  }
  if (/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return { url: `${BASE_URL}/remote-jobs/${trimmed}`, slug: trimmed }
  }
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const target = buildUrl(opts.idOrUrl)
  if (!target) {
    writeError(
      `could not parse "${opts.idOrUrl}" as a RemoteOK job slug or URL (expected a slug like "remote-sr-solutions-architect-extrahop-1137394" or a https://remoteok.com/remote-jobs/<slug> URL)`,
      "BAD_ID",
    )
    return 1
  }

  try {
    const html = await textFetch(target.url)
    if (!html) {
      writeError(`no job found for "${opts.idOrUrl}"`, "NOT_FOUND")
      return 1
    }
    const job = parseJobDetail(html, target.slug)
    if (!job) {
      writeError(`no job found for "${opts.idOrUrl}"`, "NOT_FOUND")
      return 1
    }

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"} · ${job.salary || "—"} · ${job.employmentType || "—"}`,
        job.validThrough ? `Valid through: ${job.validThrough}` : null,
        job.url,
        "",
        job.description || "(no description)",
      ].filter((l) => l !== null)
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
