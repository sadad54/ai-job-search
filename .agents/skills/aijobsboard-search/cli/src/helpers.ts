// Data source: AI Jobs Board (aijobs.net) — which now redirects to and is served by
// foorilla.com, a broader tech/AI job platform ("foo🦍"). foorilla.com/robots.txt
// allows /hiring/jobs/ (only pagination query strings and a few unrelated paths are
// disallowed). Its public GraphQL-free API requires a paid PRO+ subscription
// (foorilla.com/api/llms.txt), so this CLI instead scrapes the same htmx-rendered
// HTML fragment the site's own "Quick search" box requests — sent with the
// `HX-Request: true` header the site's frontend sends, so the server returns just
// the results fragment instead of a full page shell. Verified live 2026-09-24.
//
// Known limitation: on the unauthenticated/free tier, company names are not shown —
// neither the results list nor the detail page exposes them (detail page renders a
// truncated placeholder like "@ I..."). `company` is therefore always `null` here;
// this is a genuine platform gap, not a parsing bug — see url-reference.md.

export const BASE_URL = "https://foorilla.com"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; aijobsboard-search-cli/1.0)"

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
        "HX-Request": "true",
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

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  salary: string | null
  jobType: string | null
  remoteBadge: string | null
}

export interface JobDetail extends JobCard {
  description: string | null
  skills: string[]
  roles: string[]
  educationRequirements: string[]
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

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, "")).trim()
}

function detailUrl(slug: string): string {
  return `${BASE_URL}/hiring/jobs/${slug}/`
}

/** Split the htmx job-search fragment into per-<li> chunks and parse each independently. */
export function parseSearchResults(html: string): JobCard[] {
  const section = html.split('id="quick-search-results"')[1] || html
  const items = section.split(/<li class="list-group-item[^"]*">/).slice(1)
  const cards: JobCard[] = []

  for (const raw of items) {
    const chunk = raw.split("</li>")[0]
    try {
      const slugMatch = chunk.match(/hx-get="\/hiring\/jobs\/([a-z0-9-]+)\/"/)
      if (!slugMatch) continue
      const slug = slugMatch[1]

      const titleMatch = chunk.match(/class="stretched-link terminal-title"[\s\S]*?>([\s\S]*?)<\/a>/)
      const title = titleMatch ? stripTags(titleMatch[1]) : ""
      if (!title) continue

      const dateMatch = chunk.match(/terminal-meta"><small>\s*([^<]+?)\s*<\/small>/)
      const date = dateMatch ? dateMatch[1].trim() : null

      const salaryMatch = chunk.match(/class="text-bg-(?:success|secondary)">([^<]+)<\/small>/)
      const salary = salaryMatch ? decodeHtmlEntities(salaryMatch[1].trim()) : null

      const jobTypeMatch = chunk.match(/class="text-body-secondary">\[([^\]]+)\]<\/small>/)
      const jobType = jobTypeMatch ? jobTypeMatch[1].trim() : null

      const locBlockMatch = chunk.match(/class="text-end">\s*<small>([\s\S]*?)<\/small>/)
      let location: string | null = null
      let remoteBadge: string | null = null
      if (locBlockMatch) {
        const badgeMatch = locBlockMatch[1].match(/class="text-success">\[([^\]]+)\]<\/span>/)
        remoteBadge = badgeMatch ? badgeMatch[1] : null
        location = stripTags(locBlockMatch[1].replace(/<span[\s\S]*?<\/span>/, "")) || null
      }

      cards.push({
        id: slug,
        title,
        company: null,
        location,
        date,
        url: detailUrl(slug),
        salary,
        jobType,
        remoteBadge,
      })
    } catch {
      // one malformed card must not break the rest
      continue
    }
  }
  return cards
}

/** Extract a `<strong>Label:</strong> <ul>...</ul>` or `<div>...</div>` block's tag texts. */
function extractTagGroup(html: string, label: string): string[] {
  const re = new RegExp(`<strong>${label}:</strong>\\s*<div[^>]*>([\\s\\S]*?)</div>`, "i")
  const m = html.match(re)
  if (!m) return []
  const tags = [...m[1].matchAll(/terminal-tag[^>]*>\[([^\]]+)\]<\/a>/g)].map((t) => t[1])
  return tags
}

/** Parse a single job's detail page (the htmx fragment returned for a job's hx-get target). */
export function parseJobDetail(html: string, slug: string): JobDetail | null {
  const titleMatch = html.match(/<h1>\s*([\s\S]*?)\s*<\/h1>/)
  const title = titleMatch ? stripTags(titleMatch[1]) : ""
  if (!title) return null

  const locationMatch = html.match(/<div class="hstack justify-content-between">\s*<div>\s*([\s\S]*?)\s*(?:<a href="" class="terminal-tag|<\/div>)/)
  const location = locationMatch ? stripTags(locationMatch[1]) || null : null

  const salaryMatch = html.match(/class="text-bg-(?:success|secondary)">([^<]+)<\/(?:span|small)>/)
  const salary = salaryMatch ? decodeHtmlEntities(salaryMatch[1].trim()) : null

  const jobTypeMatch = html.match(/class="terminal-tag text-body-secondary"[^>]*>\[([^\]]+)\]<\/a>/)
  const jobType = jobTypeMatch ? jobTypeMatch[1] : null

  const dateMatch = html.match(/<em>\s*(Found[^<]+?)\s*<\/em>/)
  const date = dateMatch ? dateMatch[1].trim() : null

  const tasksMatch = html.match(/<strong>Tasks:<\/strong>\s*<ul[^>]*>([\s\S]*?)<\/ul>/)
  const tasks = tasksMatch
    ? [...tasksMatch[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((t) => stripTags(t[1]))
    : []
  const description = tasks.length > 0 ? tasks.map((t) => `- ${t}`).join("\n") : null

  const skills = extractTagGroup(html, "Skills/Tech stack required")
  const roles = extractTagGroup(html, "Role\\(s\\)")
  const educationRequirements = extractTagGroup(html, "Educational requirements")

  return {
    id: slug,
    title,
    company: null,
    location,
    date,
    url: detailUrl(slug),
    salary,
    jobType,
    remoteBadge: null,
    description,
    skills,
    roles,
    educationRequirements,
  }
}
