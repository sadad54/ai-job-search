# Design: Malaysian + remote job portals, GitHub-grounded project evidence

Date: 2026-09-20
Status: approved in chat, pending spec review
Fork: Adnan Mashrur Sadad's personalised copy of MadsLorentzen/ai-job-search

## Goal

1. `/scrape` searches the boards that actually matter for this candidate: the
   Malaysian market (JobStreet, Indeed, Hiredly, FoundIt) and remote-first boards
   (Wellfound, Himalayas, RemoteOK, We Work Remotely, Remotive), in addition to the
   shipped LinkedIn and freehire skills.
2. Every project claim in `01-candidate-profile.md` is verifiable against a public
   GitHub repository, and the profile carries any substantive repo not yet listed.

## Non-goals

- Upstreaming any of this. Market-specific skills live in this fork (CONTRIBUTING.md).
- Authenticated or paid fetching services. A board that only works behind a login or
  a paid unlocker is covered by the WebSearch `site:` fallback, not a CLI.
- Rewriting the four existing project entries from scratch. They are verified and
  amended, never regenerated.

## Workstream 1: Feasibility spike (throwaway)

One pass per board, output is a verdict table, nothing built is kept.

| Board | Market | Probe |
|---|---|---|
| JobStreet (jobstreet.com.my) | MY | robots.txt; try `/api/jobsearch/v5/search` JSON; one HTML search fetch |
| Indeed (my.indeed.com) | MY | robots.txt; expect bot wall; one fetch to confirm |
| Hiredly (hiredly.com) | MY | robots.txt; inspect page source for XHR/JSON endpoint; one fetch |
| FoundIt (foundit.my) | MY | robots.txt; try known `/middleware/jobsearch` JSON; one fetch |
| Wellfound (wellfound.com) | Remote | robots.txt; expect Cloudflare; one fetch to confirm |
| Himalayas (himalayas.app) | Remote | `/jobs/api` public JSON; one fetch |
| RemoteOK (remoteok.com) | Remote | `/api` public JSON; one fetch |
| We Work Remotely | Remote | category RSS feeds; one fetch |
| Remotive (remotive.com) | Remote | `/api/remote-jobs` public JSON; one fetch |

Per board the spike records: robots.txt verdict (`tools/robots_check.py`), endpoint
found (JSON / RSS / HTML / none), HTTP status with the honest UA
(`Mozilla/5.0 (compatible; <board>-cli/1.0)`), whether the six contract fields
(id, title, company, location, date, url) are present, and whether a detail page is
fetchable. Fixture responses are saved to the session scratchpad for later tests.

Verdicts:
- **build**: robots permits, public endpoint returns parseable results with the
  honest UA, detail is reachable.
- **fallback-only**: robots permits but the board blocks non-browser clients, or
  only serves a login wall. Gets `site:` lines in `search-queries.md` only.
- **skip**: robots.txt disallows the search path. No CLI, no `site:` line either
  (the board has declined automated access; WebSearch is a third party's index but
  we do not build around a board that said no).

Volume: at most three requests per board. A 429 is recorded as inconclusive, not
as blocked, and is not retried.

The spike ends with a report to the user. Workstream 2 starts only after the user
has seen the table.

## Workstream 2: One portal skill per `build` board

Follows `.claude/commands/add-portal.md` exactly; `linkedin-search` is the
structural reference, `freehire-search` the reference for a JSON-API board.

Per skill, under `.agents/skills/<board>-search/`:

- `SKILL.md`: frontmatter `name`, `version: 1.0.0`, `description` with English and
  (for Malaysian boards) Malay trigger phrases, `context: fork`, `enabled: true`,
  `allowed-tools: Bash(bun run .agents/skills/<board>-search/cli/src/cli.ts *)`.
  Body: what it searches, personal-use warning where the board's terms restrict
  automation, command reference, 4-6 examples using Kuala Lumpur / Malaysia /
  Remote, output-format table, Notes with quirks found in the spike.
- `url-reference.md`: endpoints, parameter table, response-field anchors.
- `cli/package.json`: `<board>-cli`, `"type": "module"`, scripts `start`, `test`
  (`bun test --timeout 30000`), `typecheck`; `dependencies: {}`; dev deps
  `typescript` + `@types/bun` only; no lifecycle scripts.
- `cli/tsconfig.json`, `cli/README.md`.
- `cli/src/cli.ts`: flag parsing with a KNOWN_FLAGS allowlist per command (unknown
  flag exits 1 with `UNKNOWN_FLAG`), help text, dispatch.
- `cli/src/helpers.ts`: fetch with exponential backoff + jitter on 429/5xx (max 6),
  `""`/`null` on 404, honest UA, entity decoding, chunked parsing for HTML boards.
- `cli/src/commands/search.ts`, `detail.ts`.
- `cli/tests/helpers.ts` (`runCLI`, `parseJSON` copied from jobindex-search) plus
  fixture-based tests: parsing from the spike's saved responses, flag validation,
  request timeout, retry/backoff, error-to-stderr contract. Tests pass offline.

Contract (identical across all new skills):
- Commands: `search`, `detail <id|url>`.
- Search flags: `--query/-q`, `--jobage <days>` (mapped to the board's parameter or
  applied client-side on `date` when the board has none, documented either way),
  `--page <n>` 1-indexed, `--limit <n>` client-side cap, `--format json|table|plain`
  default `json`, `--location/-l` where the board supports it.
- Search JSON: `{ "meta": { "count", "page" }, "results": [...] }`, each result has
  `id`, `title`, `company`, `location`, `date`, `url` (missing = `null`, never
  omitted). Boards whose search response already carries the description include
  it as `description`, the way freehire does.
- Errors: stderr `{ "error", "code" }`, exit 1. Nothing on stdout.
- Location conventions per market: Malaysian boards default to no location filter
  (nationwide) with `-l` narrowing to a city; remote boards return remote-only
  listings by nature and expose region filters only if the API has them.

Registration gate per skill (add-portal Step 4): `bun install`, `bun run typecheck`,
live `search -q "AI engineer" --limit 5 --format table` with real populated fields,
one `detail` returning readable text, `bun test` green. No skill is registered
without all four.

## Workstream 3: Wiring

- `.claude/settings.json`: one
  `Bash(bun run .agents/skills/<board>-search/cli/src/cli.ts:*)` entry per new skill.
- `tools/security_guards.py`: the same entries added to `ALLOWED_PERMISSIONS` in the
  same change (the guard fails otherwise; that failure is the review step).
- `.claude/skills/job-scraper/search-queries.md`:
  - "Search Sites" lists every installed CLI board with its market, and names the
    `fallback-only` boards with `site:` query lines.
  - The four priority categories stay (AI/ML Engineering, Backend/Full-Stack, Data
    Science/Applied Research, MLOps/Adjacent). Each gets `site:` lines for the
    fallback boards; CLI boards need no `site:` line.
  - Location tiers: **Ideal** = Kuala Lumpur, Klang Valley, and remote roles hiring
    from Malaysia or worldwide; **Acceptable** = rest of Malaysia, Denmark, remote
    roles restricted to APAC/EU time zones; **Borderline** = remote roles restricted
    to a region that excludes Malaysia but where the posting says time zone is
    flexible; **Too far** = onsite roles outside Malaysia/Denmark.
  - Remote-board note: a remote listing with a country restriction that excludes
    Malaysia is a location FAIL, so `/rank` agents must read the eligibility line,
    not just the "Remote" label.
- Environment: `~/.bun/bin` is on disk but not on PATH in either shell, so `/scrape`
  currently falls back to WebSearch for everything. Document the PATH fix in a short
  note in `SETUP.md`'s troubleshooting section for this fork; adding it to the user's
  shell profile is the user's action, suggested rather than performed.

## Workstream 4: GitHub-grounded project evidence via `/expand`

Run the existing `/expand` command against `https://github.com/sadad54` with these
fork-specific rules layered on top of its Steps 1e-5 (the command itself is not
edited):

1. Enumerate all public repositories, not only pinned ones (command Step 1e.3).
2. For each of the four existing entries (Driftline, InterviewPilot, Freight Rate ML,
   ExpenSense): locate the matching repo, read README and any results/metrics files,
   and classify every quantitative claim as **supported** (number appears in the
   repo), **plausible** (repo shows the mechanism but not the number), or
   **unsupported** (repo contradicts or has nothing). Present the classification
   table before writing. The user rules on each plausible/unsupported item: keep,
   soften, or drop. Nothing is changed without that ruling.
3. New substantive repos (not forks, not empty, not coursework stubs) become new
   `## Independent Projects` entries formatted
   `- **Name** (Domain, Year): description with stack and outcome *(GitHub — repo)*`.
4. Each project entry that has a repo gets its URL recorded so `/apply` can carry an
   `\href` evidence link per `05-cv-templates.md` "Evidence Links". The link is
   stored in the profile line, not only in the CV template.
5. Competencies discovered from repo stacks go to Technical Skills with a source tag,
   per the command's Step 5.
6. Behavioral signals, if any, are labeled inferred per the command's rules.

Output: the confirmed additions and any corrections in `01-candidate-profile.md`;
corrections that change a fact also applied to `CLAUDE.md` and `cv/main_example.tex`
so the three grounding sources agree (per `/apply`'s standing rule).

## Verification

- `python tools/lint_skills.py` - frontmatter and allowed-tools paths resolve.
- `python tools/security_guards.py` - permissions, gitignore, manifests.
- `python -m unittest discover -s tests -t .` - repo spec tests still pass.
- Per new CLI: `bun run typecheck`, `bun test` (offline).
- End-to-end: `/scrape` with bun on PATH. Expected: every new `build` board appears
  in Step 1b, results carry its `portal:` tag in `seen_jobs.json`, no `health:` line
  for it, and `fallback (websearch):` lists only the `fallback-only` boards.
- `/rank` on the new batch: remote listings with a Malaysia-excluding restriction
  land under Excluded with a location FAIL.

## Order of work

1. Spike, report the verdict table, wait.
2. Skills for `build` boards: Malaysian first, then remote.
3. Wiring (settings, guards, search-queries, SETUP note).
4. `/expand` GitHub pass with the verification table and user rulings.
5. Full `/scrape` and `/rank` run as the acceptance test.

## Risks

- A board that passes the spike can still rate-limit under `/scrape`'s parallel
  fan-out. Mitigation: `--limit 20` per call as the scraper already does, and the
  health check's inconclusive-on-429 rule.
- JobStreet's JSON endpoint is undocumented and has changed before. Mitigation:
  `url-reference.md` records the anchors; the health check catches silent rot.
- Repo READMEs may not state the metrics the CV does. That is why classification is
  supported/plausible/unsupported with the user ruling, not an automatic strip.
