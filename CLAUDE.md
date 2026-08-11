# cert-prepare-helper

CCDV-F certification practice material: a canonical question bank in `sql/`, a Cowork routine that
drills it on a schedule, and a static practice quiz web app. Governed by
`.specify/memory/constitution.md` — read it before touching schema, content, or the client app.

## Repository layout

| Path | What it is |
|---|---|
| `sql/` | Canonical schema (`001_create_cert_prep_schema.sql`) and question seed (`002_seed_ccdv_f_questions.sql`) for the shared Supabase project. Source of truth for all question content. |
| `web/` | The Next.js practice quiz app (zen + exam modes). Vercel Root Directory = `web`. See `web/README.md` for setup, scripts, and deployment. |
| `cowork/` | The hourly Cowork spaced-repetition routine that reads/writes `cert_questions` and `cert_attempts` directly against Supabase. |
| `prompts/` | The PDF-to-SQL prompt used to regenerate the seed from the source practice-question PDF. |
| `pdf/` | Source exam material. Kept local only — never redistributed from this public repo (see `.gitignore`). |
| `specs/` | Spec-kit feature specs, plans, and task breakdowns (e.g. `specs/001-static-quiz/`). |
| `handover-cert-preparation-quiz.md` | Original handover doc with the use-case split and platform decision rationale. |

## Commands

All app commands run from `web/`:

```bash
cd web
npm install
npm run dev            # http://localhost:3000 (regenerates content first)
npm run build           # production build (regenerates content first)
npm run lint             # ESLint, zero warnings
npm run typecheck        # tsc --noEmit, strict
npm run test              # Vitest unit + component suites
npm run test:e2e          # Playwright end-to-end suite
npm run generate:questions  # sql/002 -> web/src/content/questions.generated.json
npm run verify:questions    # fail if the committed bundle has drifted from the seed
npm run verify:bundle       # fail if initial client JS exceeds the 200 KB gzipped budget
```

CI (`.github/workflows/ci.yml`) runs all of the above except `dev`/`start` on every push and PR.

## Generated content — never hand-edit

`web/src/content/questions.generated.json` is produced by `web/scripts/generate-questions.ts` from
`sql/002_seed_ccdv_f_questions.sql`. This is Constitution Principle I: the seed migration is the
single source of truth; a bundled copy may ship only via a committed, repeatable export step, never
hand-typed or hand-patched. If a question is wrong:

1. Fix `sql/002_seed_ccdv_f_questions.sql` (and re-verify against the source PDF if the fix isn't
   obviously correct).
2. Run `npm run generate:questions` from `web/` and commit the regenerated JSON.

Editing the generated JSON directly is a constitution violation, and `npm run verify:questions` (a
CI gate) will overwrite/reject any hand-edit that has drifted from a fresh generation anyway.

Known erratum: question 5.9's answer is `C`. The source PDF's answer key says `A, D`, which
contradicts the question itself and its own rationale — confirmed wrong by the question author. Do
not "fix" 5.9 back to `A, D` if ever regenerating the seed from the PDF.

## Open gap: RLS is disabled on the shared Supabase project

All tables in the shared project — the pre-existing tables and both `cert_questions` /
`cert_attempts` — currently have Row Level Security **disabled**. The anon key has full read/write
access to everything in the project. Remediation SQL exists but has not been applied
(see `sql/001_create_cert_prep_schema.sql`'s commented-out `enable row level security` lines).

**This must be fixed before any client-side code (browser frontend, artifact) is ever given the anon
key.** The `web/` quiz app deliberately ships zero credentials and makes zero requests to Supabase or
any other service — it sidesteps this gap entirely rather than depending on it being fixed (see
`specs/001-static-quiz/plan.md`, Data Integrity & Security Constraints). Any future feature that
does need the anon key client-side (e.g. a per-user progress use case) must apply the RLS fix first,
scoped so the anon/client key can only read/write what it should — not just "enable RLS" with a
permissive default policy.
