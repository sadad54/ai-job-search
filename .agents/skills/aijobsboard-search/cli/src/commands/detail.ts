import { BASE_URL, htmlFetch, parseJobDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  idOrUrl: string
  format: "json" | "plain"
}

/**
 * Parse a detail invocation's <id|url> into a canonical fetch target, or null.
 * A URL input must be a foorilla.com host with a /hiring/jobs/<slug>/ path; the
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
    if (host !== "foorilla.com" && !host.endsWith(".foorilla.com")) return null
    const match = pathname.match(/\/hiring\/jobs\/([a-z0-9-]+)\/?/)
    if (!match) return null
    return { url: `${BASE_URL}/hiring/jobs/${match[1]}/`, slug: match[1] }
  }
  if (/^[a-z0-9-]+$/.test(trimmed)) {
    return { url: `${BASE_URL}/hiring/jobs/${trimmed}/`, slug: trimmed }
  }
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const target = buildUrl(opts.idOrUrl)
  if (!target) {
    writeError(
      `could not parse "${opts.idOrUrl}" as an AI Jobs Board slug or URL (expected a slug like "pessoa-desenvolvedora-machine-learning-brasilia-distrito-federal-brasil-3769793" or a https://foorilla.com/hiring/jobs/<slug>/ URL)`,
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
    const job = parseJobDetail(html, target.slug)
    if (!job) {
      writeError(`no job found for "${opts.idOrUrl}"`, "NOT_FOUND")
      return 1
    }

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.location || "—"} · ${job.salary || "—"} · ${job.jobType || "—"} · ${job.date || "—"}`,
        job.roles.length ? `Role(s): ${job.roles.join(", ")}` : null,
        job.skills.length ? `Skills: ${job.skills.join(", ")}` : null,
        job.educationRequirements.length ? `Education: ${job.educationRequirements.join(", ")}` : null,
        "(company name not shown by AI Jobs Board without a subscription — see the job page)",
        job.url,
        "",
        job.description || "(no task/description details found)",
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
