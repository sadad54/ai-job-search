import { BASE_URL, htmlFetch, parseJobDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  idOrUrl: string
  format: "json" | "plain"
}

/**
 * Parse a detail invocation's <id|url> into a canonical fetch target, or null.
 * A URL input must be a my.hiredly.com/hiredly.com host with a /jobs/<slug>
 * path; the fetch URL is rebuilt from the extracted slug rather than the raw
 * input trusted verbatim (a non-posting page — redirect target, look-alike
 * host — must not silently come back as a fake posting).
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
    if (host !== "hiredly.com" && !host.endsWith(".hiredly.com")) return null
    const match = pathname.match(/\/jobs\/([a-zA-Z0-9-]+)/)
    if (!match) return null
    return { url: `${BASE_URL}/jobs/${match[1]}`, slug: match[1] }
  }
  if (/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return { url: `${BASE_URL}/jobs/${trimmed}`, slug: trimmed }
  }
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const target = buildUrl(opts.idOrUrl)
  if (!target) {
    writeError(
      `could not parse "${opts.idOrUrl}" as a Hiredly job slug or URL (expected a slug like "jobs-malaysia-<company>-job-<title>" or a https://my.hiredly.com/jobs/<slug> URL)`,
      "BAD_ID",
    )
    return 1
  }

  try {
    const html = await htmlFetch(target.url)
    if (!html) {
      writeError(`no job found for "${opts.idOrUrl}"`, "NOT_FOUND")
      return 1
    }
    const job = parseJobDetail(html)
    if (!job) {
      writeError(`no job found for "${opts.idOrUrl}"`, "NOT_FOUND")
      return 1
    }

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"} · ${job.salary || "—"} · ${job.jobType || "—"}`,
        job.careerLevel ? `Career level: ${job.careerLevel}` : null,
        job.experienceYears ? `Experience: ${job.experienceYears}` : null,
        job.url,
        "",
        job.description || "(no description)",
        job.requirements ? `\nRequirements:\n${job.requirements}` : null,
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
