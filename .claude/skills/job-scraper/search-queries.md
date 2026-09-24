# Search Queries for Job Scraper

<!-- SETUP: Customize these queries based on your skills, target roles, and location -->

## Installed portal CLIs (primary for `/scrape`)

`/scrape` discovers every portal skill under `.agents/skills/*/SKILL.md` and runs its CLI first. Shipped country-agnostic CLIs include `linkedin-search` and `freehire-search`; Danish demos and any skill you add with `/add-portal` are included the same way. You do **not** need a matching `site:` line below for those CLIs to run.

The `site:` query templates in this file are the **WebSearch fallback** — for portals without a CLI, company career pages, or when a CLI fails.

**Language scope:** write every query category in every language listed in your CLAUDE.md Languages table (typically 1-2, sometimes more). A posting requiring a language you have *not* declared, as a job condition, is excluded before scoring; a posting requiring a *higher level* than you declared in a language you *do* work in is flagged for your own judgment, not excluded — see `04-job-evaluation.md`'s Language Gate, the single source of truth for this rule. Translate each category's keywords rather than machine-translating word-for-word (e.g. "Frontend Developer" -> "Desarrollador Frontend", not a literal word-for-word translation) if you work in more than one language.

## Search Sites

Primary (your market's job boards - scaffold one with `/add-portal`):
- **jobstreet.com.my** - Malaysia's largest general job board (no `/add-portal` CLI: robots.txt disallows the search/detail routes for the default `User-agent: *` rule)
- **linkedin.com/jobs** - LinkedIn job listings (filter: Malaysia / Kuala Lumpur, and Denmark); also covered by `linkedin-search` CLI
- **jobindex.dk**, **jobbank.dk**, **jobdanmark.dk**, **jobnet.dk** - Danish job portals, covered by the `jobindex-search`, `jobbank-search`, `jobdanmark-search`, and `jobnet-search` CLIs
- **my.hiredly.com** - Malaysia tech/SME job board, covered by the `hiredly-search` CLI
- **remoteok.com** - global remote-work job board, covered by the `remoteok-search` CLI
- **aijobs.net** (served by foorilla.com) - global tech/AI job platform, covered by the `aijobsboard-search` CLI (company names not shown without a paid subscription - see its `url-reference.md`)
- **wellfound.com** - remote-friendly tech/startup roles (WebSearch fallback only: Cloudflare Turnstile blocks a CLI; also robots.txt disallows `/search`)
- Skipped entirely (bot-protected, no viable CLI or fallback beyond WebSearch): **foundit.com** / **foundit.my** (Akamai bot manager), **monster.com** (DataDome), **himalayas.app** (Cloudflare JS challenge)

Secondary (company career pages via Google):
- Direct Google searches with `site:` filters for known target companies

**Query language note:** the candidate's Languages table lists English (Native/Fluent) and Bengali (Native), but Bengali is not a working language of the target job markets (Malaysia, Denmark, remote/international tech). Queries below are written in English only, which is the professional language for all three markets.

## Query Categories

Queries are grouped by priority. Write **each category in every language from your Languages table** (see Language scope above). Combine each query with your location terms (e.g. your city, region, or metro area) where the site supports it.

**Organize by function, not job title.** The same underlying work carries different titles across companies and markets (a "Data Scientist" role at one employer may be posted as "Insights Analyst" or "Data Consultant" at another). Name each priority category after the function it covers, and list several plausible job titles as query variants within that category rather than betting an entire priority tier on one exact title string.

### Priority 1: AI/ML Engineering

These match the strongest and most desired career direction: applied AI/LLM systems and ML pipelines.

```
site:jobstreet.com.my "AI Engineer" Kuala Lumpur
site:jobstreet.com.my "Machine Learning Engineer" Kuala Lumpur
site:jobstreet.com.my "RAG" OR "LLM" Malaysia
site:linkedin.com/jobs "AI Engineer" Malaysia
site:linkedin.com/jobs "Machine Learning Engineer" Denmark
site:linkedin.com/jobs "AI Engineer" remote
site:wellfound.com "Machine Learning Engineer" OR "AI Engineer" remote
```

### Priority 2: Software Engineering (Backend/Full-Stack)

Secondary but equally targeted direction: API-backed backend and full-stack product engineering.

```
site:jobstreet.com.my "Software Engineer" Kuala Lumpur
site:jobstreet.com.my "Backend Engineer" OR "Full-Stack Engineer" Malaysia
site:linkedin.com/jobs "Software Engineer" Malaysia
site:linkedin.com/jobs "Backend Engineer" Denmark
site:linkedin.com/jobs "Full-Stack Engineer" remote
```

### Priority 3: Data Science / Applied Research

Domain expertise from first-author research (RAG evaluation, Text-to-SQL, benchmarking).

```
site:jobstreet.com.my "Data Scientist" Malaysia
site:linkedin.com/jobs "Data Scientist" OR "Applied Scientist" Malaysia
site:linkedin.com/jobs "Applied Scientist" Denmark OR remote
```

### Priority 4: MLOps / Adjacent Roles

Adjacent roles building on the Driftline MLOps/deployment experience.

```
site:jobstreet.com.my "MLOps Engineer" Malaysia
site:linkedin.com/jobs "MLOps Engineer" OR "Machine Learning Platform Engineer" Malaysia
site:linkedin.com/jobs "MLOps Engineer" Denmark OR remote
```

## Location Filter

When evaluating results, verify the job location fits the candidate's scope (Malaysia + Denmark + remote/international). Location filter tiers:
- **Ideal:** Kuala Lumpur and remote roles (any location)
- **Acceptable:** rest of Malaysia; Denmark (any city)
- **Borderline:** other EU/APAC countries with genuinely remote-friendly roles
- **Too far:** onsite roles requiring relocation outside Malaysia or Denmark

## Language Filter

Your working languages and levels are in CLAUDE.md's Languages table. When filtering scraped results, apply `04-job-evaluation.md`'s Language Gate: a posting requiring a language you haven't declared at all is excluded; a posting requiring a higher level than you declared in a language you do work in is not excluded, flag it clearly instead (see `job-scraper/SKILL.md`'s Step 3 "Quick Fit Assessment" for how the flag surfaces in `/scrape` output). Postings simply *written* in a language you don't work in, that don't require it on the job, are fine.

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
