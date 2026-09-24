// Data source: Hiredly (my.hiredly.com), a Next.js SSR site. Search and detail
// pages embed their full job data server-side in a `__NEXT_DATA__` JSON blob —
// no browser/JS execution needed, no separate API call to reverse-engineer.
// Verified live 2026-09-23: the slug-based search URL (`/<keyword-slug>-jobs`)
// returns keyword-filtered results in that blob; detail pages live at
// `/jobs/<slug>`, also SSR with the full job in `pageProps.job`.

export const BASE_URL = "https://my.hiredly.com"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; hiredly-search-cli/1.0)"

/** Fetch HTML with exponential backoff on 429/5xx. Returns "" on a 404. */
export async function htmlFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

/** Convert free-text keywords into Hiredly's URL slug format: "machine learning" -> "machine-learning". */
export function slugifyKeyword(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Extract and parse the page's embedded Next.js data blob. */
export function extractNextData(html: string): Record<string, unknown> | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

interface RawCompany {
  name?: string | null
  slug?: string | null
}

interface RawJob {
  id: string
  title?: string | null
  company?: RawCompany | null
  location?: string | null
  stateRegion?: string | null
  activeAt?: string | null
  createdAt?: string | null
  slug?: string | null
  salary?: string | null
  jobType?: string | null
  externalJobUrl?: string | null
  description?: string | null
  shortDescription?: string | null
  requirements?: string | null
  careerLevel?: string | null
  minYearsExperience?: number | null
  maxYearsExperience?: number | null
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  salary: string | null
  jobType: string | null
}

export interface JobDetail extends JobCard {
  description: string | null
  requirements: string | null
  careerLevel: string | null
  experienceYears: string | null
}

function detailUrl(slug: string | null | undefined, id: string): string {
  return slug ? `${BASE_URL}/jobs/${slug}` : `${BASE_URL}/jobs/${id}`
}

/** Pull the SSR-embedded jobs array out of a search-results page's Next.js data. */
export function parseSearchResults(html: string): JobCard[] {
  const data = extractNextData(html)
  const pageProps = (data?.props as any)?.pageProps
  const jobsRaw = pageProps?.jobs
  if (!jobsRaw) return []
  const jobs: RawJob[] = Array.isArray(jobsRaw) ? jobsRaw : Object.values(jobsRaw)

  return jobs
    .filter((j) => j && j.id)
    // "id" is the job's slug, not its internal UUID: the slug is what
    // `detail <id>` needs to fetch the page (Hiredly has no UUID-based
    // detail lookup), so using the UUID here would make results unusable
    // with the detail command.
    .map((j) => ({
      id: j.slug || j.id,
      title: (j.title || "").trim() || "(untitled)",
      company: j.company?.name?.trim() || null,
      location: j.location?.trim() || j.stateRegion?.trim() || null,
      date: j.activeAt || j.createdAt || null,
      url: j.externalJobUrl || detailUrl(j.slug, j.id),
      salary: j.salary && j.salary !== "Undisclosed" ? j.salary : null,
      jobType: j.jobType || null,
    }))
}

/** Pull the SSR-embedded job out of a detail page's Next.js data. */
export function parseJobDetail(html: string): JobDetail | null {
  const data = extractNextData(html)
  const job = (data?.props as any)?.pageProps?.job as RawJob | undefined
  if (!job || !job.id) return null

  const experienceYears =
    job.minYearsExperience != null || job.maxYearsExperience != null
      ? `${job.minYearsExperience ?? "?"}-${job.maxYearsExperience ?? "?"} years`
      : null

  return {
    id: job.slug || job.id,
    title: (job.title || "").trim() || "(untitled)",
    company: job.company?.name?.trim() || null,
    location: job.location?.trim() || job.stateRegion?.trim() || null,
    date: job.createdAt || null,
    url: job.externalJobUrl || detailUrl(job.slug, job.id),
    salary: job.salary && job.salary !== "Undisclosed" ? job.salary : null,
    jobType: job.jobType || null,
    description: stripHtml(job.description) || stripHtml(job.shortDescription) || null,
    requirements: stripHtml(job.requirements) || null,
    careerLevel: job.careerLevel || null,
    experienceYears,
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
}

function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, "")).replace(/\n{3,}/g, "\n\n").trim()
  return text || null
}
