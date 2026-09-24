// Data source: RemoteOK's public JSON API (remoteok.com/api). robots.txt explicitly
// allows ClaudeBot/anthropic-ai to crawl it (Crawl-delay: 1), and the API's own
// "legal" notice (always element 0 of the response array) only asks for attribution,
// not for a key or a rate cap beyond that crawl-delay. Verified live 2026-09-24.
//
// The API has no free-text search: `?tags=<slug>` does an exact match against each
// job's `tags` array, so a query outside RemoteOK's own tag vocabulary (e.g. a
// multi-word phrase that isn't itself a canonical tag) returns zero rows. To avoid
// that recall gap, search() falls back to fetching the unfiltered latest-jobs list
// and filtering client-side by substring match on position/tags/company.

export const BASE_URL = "https://remoteok.com"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; remoteok-search-cli/1.0)"

/** Fetch JSON/HTML with exponential backoff on 429/5xx. Returns "" on a 404. */
export async function textFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json,text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
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

/** Convert free-text keywords into RemoteOK's tag-slug format: "machine learning" -> "machine-learning". */
export function slugifyKeyword(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

interface RawJob {
  slug?: string
  id?: string
  epoch?: number
  date?: string | null
  company?: string | null
  position?: string | null
  tags?: string[] | null
  description?: string | null
  location?: string | null
  apply_url?: string | null
  salary_min?: number | null
  salary_max?: number | null
  url?: string | null
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  tags: string[]
  salary: string | null
}

export interface JobDetail extends JobCard {
  description: string | null
  employmentType: string | null
  validThrough: string | null
}

function formatSalary(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null
  const fmt = (n: number) => `$${Math.round(n / 1000)}K`
  if (min && max && min !== max) return `${fmt(min)}-${fmt(max)}`
  return fmt(min || max || 0)
}

/** Parse a raw `/api` (or `/api?tags=...`) JSON array. Index 0 is always a legal notice, not a job. */
export function parseApiResponse(json: string): JobCard[] {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []
  const jobs = data.filter((j): j is RawJob => !!j && typeof j === "object" && "position" in j)

  return jobs
    .filter((j) => j.slug || j.id)
    .map((j) => ({
      id: j.slug || j.id || "",
      title: (j.position || "").trim() || "(untitled)",
      company: j.company?.trim() || null,
      location: j.location?.trim() || null,
      date: j.date || null,
      // The API sometimes returns "remoteOK.com" (mixed case) in `url` — normalize
      // to the canonical lowercase host rather than trust the API's casing verbatim.
      url: j.url ? j.url.replace(/^https?:\/\/remoteok\.com/i, BASE_URL) : `${BASE_URL}/remote-jobs/${j.slug || j.id}`,
      tags: Array.isArray(j.tags) ? j.tags : [],
      salary: formatSalary(j.salary_min, j.salary_max),
    }))
}

/** Best-effort client-side filter for when the exact-tag API match under-recalls a free-text query. */
export function filterCardsByKeywords(cards: JobCard[], query: string): JobCard[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1)
  if (words.length === 0) return cards
  return cards.filter((c) => {
    const haystack = `${c.title} ${c.company || ""} ${c.tags.join(" ")}`.toLowerCase()
    return words.some((w) => haystack.includes(w))
  })
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

/** Extract the JobPosting + Organization JSON-LD blocks from a detail page. */
export function parseJobDetail(html: string, slug: string): JobDetail | null {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  let posting: any = null
  for (const m of blocks) {
    try {
      const parsed = JSON.parse(m[1])
      if (parsed["@type"] === "JobPosting") posting = parsed
    } catch {
      // skip malformed block, keep scanning the rest
    }
  }
  if (!posting) return null

  const org = posting.hiringOrganization
  const location = posting.jobLocationType === "TELECOMMUTE" ? "Remote" : posting.jobLocation?.[0]?.address?.addressLocality || null
  const salary = posting.baseSalary?.value
    ? formatSalary(posting.baseSalary.value.minValue, posting.baseSalary.value.maxValue)
    : null

  return {
    id: slug,
    title: (posting.title || "").trim() || "(untitled)",
    company: org?.name?.trim() || null,
    location,
    date: posting.datePosted || null,
    url: `${BASE_URL}/remote-jobs/${slug}`,
    tags: [],
    salary,
    description: stripHtml(posting.description) || posting.description || null,
    employmentType: posting.employmentType || null,
    validThrough: posting.validThrough || null,
  }
}
