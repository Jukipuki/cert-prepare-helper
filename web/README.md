# Cert Prep Practice Quiz

A client-side practice quiz covering multiple certification exams (CCDV-F, CCAR-F, CCAR-Fv2 today;
CCAR-P once its scenario-matching format ships), offering an untimed **zen** mode (explanation shown
immediately after each question) and a 120-minute timed **exam** mode (disclosure deferred to
submission). A candidate first chooses an exam, then a mode. Nothing is stored and nothing is
transmitted: no account, no `localStorage`, no cookies, no server state. See `specs/001-static-quiz/`
and `specs/002-multi-exam-support/` at the repository root for the full spec, plan and task
breakdown.

## Local setup

Requires Node >= 22 and npm. No database, no credentials, no `.env` file — if any step below asks
you for a secret, something has gone wrong.

```bash
cd web
npm install
npm run generate:questions   # sql/002-sql/004 -> src/content/questions.generated.json
npm run dev                  # http://localhost:3000
```

`generate:questions` also runs automatically as a `predev`/`prebuild` step, so the explicit call is
only needed right after editing a seed migration.

## Content is generated, never hand-edited

`src/content/questions.generated.json` is produced by `scripts/generate-questions.ts` from the
canonical seed migrations in `../sql/` (Constitution v1.1.0, Principle I) — one bundle covering every
configured exam. The generator reads an explicit, ordered `SEED_SOURCES` list of
`{ seedFile, examCode, examName }` entries; adding a future exam means adding one entry to that list
and regenerating, not changing how any existing exam's content is produced (FR-009). If a question is
wrong, fix its exam's seed migration and regenerate — editing the generated JSON directly is a
constitution violation and will be overwritten on the next generation anyway. Generation is
all-or-nothing: an invalid row in any one configured exam fails the whole run rather than shipping a
bundle missing or partially populated for that exam. `npm run verify:questions` regenerates into a
temp path and fails the build if the committed file has drifted from the seed.

## Scripts

| Script                       | Purpose                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| `npm run dev`                | Start the dev server (regenerates content first)                |
| `npm run build`              | Production build (regenerates content first)                    |
| `npm run lint`               | ESLint, zero warnings allowed                                   |
| `npm run format:check`       | Prettier check                                                  |
| `npm run typecheck`          | `tsc --noEmit`, strict                                          |
| `npm run test`               | Vitest unit + component suites                                  |
| `npm run test:e2e`           | Playwright end-to-end suite                                     |
| `npm run generate:questions` | Regenerate the bundled content from the seed                    |
| `npm run verify:questions`   | Fail if the committed bundle has drifted from the seed          |
| `npm run verify:bundle`      | Fail if the initial client JS exceeds the 200 KB gzipped budget |

All of the above (except `dev`/`build`/`start`) are CI merge gates.

## Deployment

Vercel project settings -> **Root Directory: `web`**. Everything else is default.

No environment variables exist or should be added — this feature transmits nothing over the network
by design (FR-010, SC-015).

## Core Web Vitals

Measured with Lighthouse against a production build (`npm run build && npm run start`), against
Constitution Principle IV budgets (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 at p75). Total Blocking
Time (TBT) is used as the lab proxy for INP, which cannot be measured without real user interaction
data.

| Condition                                                                 | Route   | LCP   | CLS | TBT       |
| ------------------------------------------------------------------------- | ------- | ----- | --- | --------- |
| Desktop (no throttling)                                                   | `/`     | 0.5s  | 0   | 0ms       |
| Desktop (no throttling)                                                   | `/quiz` | 0.9s  | 0   | 0ms       |
| Mobile-simulated (Lighthouse default: 4x CPU slowdown, simulated slow 4G) | `/`     | ~2.7s | 0   | ~50ms     |
| Mobile-simulated (Lighthouse default: 4x CPU slowdown, simulated slow 4G) | `/quiz` | ~3.2s | 0   | ~50-140ms |

CLS is 0 in every condition — nothing shifts after paint. TBT stays far under the 200ms budget in
every condition. LCP passes comfortably under real hardware/network conditions; the mobile-simulated
number exceeds the 2.5s budget, but that profile is Lighthouse's default pessimistic lab throttle
(a mid-tier phone on slow 4G), not the field p75 the budget is actually defined against. The LCP
element is the first question's text, which only renders after the client-side content chunk loads
(a deliberate tradeoff — see research.md R2/R3 — content is fetched via dynamic `import()` rather
than bundled, to keep the entry bundle small and the `QuestionSource` boundary real). These are lab
measurements from a single local machine; confirming real p75 numbers requires production traffic
(e.g. Vercel Analytics) once deployed.

Measured before multi-exam support (specs/002-multi-exam-support): the generated content bundle is
larger now that it holds several exams, but it is still fetched via the same dynamic `import()`, kept
out of `/`'s and `/quiz`'s initial JS exactly as before (see that feature's research.md R3) — these
numbers have not been re-measured against the larger bundle.
