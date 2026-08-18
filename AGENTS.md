# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this app does

`wholehealth-dashboard` is a SMART on FHIR React app, embedded in EHR systems (Epic, Oracle
Health Millennium) and used by clinicians / Health & Wellness Coaches. It reads a coach's
clinical notes from the EHR (via `DocumentReference`), runs them through
[`coach-notes`](https://github.com/mtnlotus/coach-notes) to produce a Personal Health Plan (PHP),
and uses [`shc-services`](https://github.com/mtnlotus/shc-services) to issue the patient a signed
SMART Health Card for that plan. It also surfaces standard FHIR data (conditions, medications,
goals, encounters) alongside the PHP.

This is an active, working codebase — not a placeholder. See [README.md](README.md) for setup
and [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit together before making structural
changes.

## Requirements

- Deployed as an Azure Static Web App.
- Authorization is SMART on FHIR only — no separate login system. Practitioner launches use
  Authorization Code or Backend Services flow (per-EHR, see `src/config/fhirServers.ts`); patient
  launches always use Authorization Code.
- EHR-specific quirks (e.g. Cerner requiring a `charset` param on `DocumentReference` attachment
  `contentType`, which Epic rejects) are isolated behind `ehrVendorForIss()` — don't scatter
  vendor conditionals through feature code.

## Core technologies & stack

- **Language:** TypeScript, strict mode.
- **Framework:** React 19 + React Router 7, Vite 6.
- **State:** Zustand (`src/store/appStore.ts`) for cross-page app state (launch mode, SMART
  client, loaded PHP data); TanStack React Query for FHIR data fetching/caching.
- **FHIR client:** `fhirclient` for the SMART launch/token dance; `@smile-cdr/fhirts` for R4
  types.
- **Package manager:** pnpm only. `pnpm-lock.yaml` is committed — run `pnpm install` after pulling.
- **Testing:** Vitest + Testing Library + jsdom. `*.integration.test.ts` files are excluded from
  the default `pnpm test` run — use `pnpm test:integration` for those.
- **Linting/formatting:** Biome — 2-space indent, 100-char lines, double quotes, trailing commas,
  always semicolons. Run `pnpm lint` / `pnpm format` before committing.
- **Key dependencies:** `coach-notes` (note parsing / PHP model, `github:mtnlotus/coach-notes`),
  `jose` (JWT handling for the client-credentials SMART flow), `recharts` (WBS score
  visualization), `zod` (validation).

## Where things live

```
src/
├── App.tsx                    # Route table (launch modes → pages)
├── auth/                       # smartLaunch.ts (Auth Code), smartBackendLaunch.ts (client
│                                # credentials), smartCallback.ts (token exchange completion)
├── config/fhirServers.ts        # Per-EHR client IDs/secrets/scopes, vendor detection
├── pages/                        # Route-level pages: LaunchPage, PatientLaunchPage,
│                                  # CallbackPage, DevPage, StandalonePage
├── features/
│   ├── dashboard/                  # DashboardLayout (tab shell) + 6 tabs (Summary, PHP,
│   │                                 # Records, Inventory, WBS, Notes)
│   ├── notes/                       # DocumentReference upload / sample bundle loading
│   ├── php/                          # PHP summary + goal list + WBS display
│   └── sharing/                       # SHC selection modal + SMART Health Card panel
├── hooks/                          # React Query hooks per FHIR resource (usePatient,
│                                    # useGoals, useConditions, useMedications, ...)
├── services/                        # shcClient.ts (calls shc-services), pdfClient.ts (calls
│                                    # the external PDF function)
└── store/appStore.ts                # launchMode, smartClient, phpData, fhirBundle, uploaded/
                                      # standalone DocumentReferences
```

## Constraints an agent must respect

- **No client secrets in the iOS-equivalent trust boundary.** This app runs in a browser
  embedded in an EHR — treat `VITE_*` env vars as public (Vite inlines them into the built
  bundle). `VITE_SMART_PRIVATE_KEY_JWK` and `VITE_AZURE_CLIENT_SECRET` exist for specific
  backend-services / confidential-client flows the EHR integration requires; don't add new
  secrets to the client bundle without understanding that they will be visible to anyone who
  opens dev tools.
- **Don't fetch health records without a SMART scope for them.** Requested scopes live in
  `src/config/fhirServers.ts` (`DEFAULT_PATIENT_SMART_SCOPE` /
  `DEFAULT_PRACTITIONER_SMART_SCOPE`) — add a resource's scope there before adding a hook that
  reads it.
- **`/dev` must keep working without any EHR.** It's the primary way to verify a change locally
  and in CI screenshots — don't make dashboard features assume a live `smartClient` is always
  present; check `launchMode` and fall back to `standaloneDocRefs` / `uploadedDocRefs`.
- **PHI stays out of `dev-notes/`, tests, and commits.** `test/sample-data/` bundles must remain
  synthetic/de-identified — this is a public repo.

## Making changes

- Run `pnpm test` and, if you touched note parsing or the PHP pipeline, `pnpm test:integration`.
- Run `pnpm typecheck` and `pnpm lint:fix` before considering a change done.
- If you change a SMART launch flow (`src/auth/`) or scope list
  (`src/config/fhirServers.ts`), verify manually against `/dev` and, if possible, a sandbox EHR —
  these are hard to unit test meaningfully end to end.
- CI (`.github/workflows/main_wholehealth-dashboard.yml`) runs `install → test → build` on every
  push/PR to `main` and deploys `dist/` on push. Builds fail loudly if a required `VITE_*` secret
  is missing at build time.
- Keep `README.md` and this file in sync with any change to routes, launch modes, or required
  env vars.

## Related packages

- [`coach-notes`](https://github.com/mtnlotus/coach-notes) — note parsing / PHP generation.
  When developing both together, check them out as siblings under the same parent directory —
  Vite auto-aliases the local `coach-notes` source (see `vite.config.ts`).
- [`shc-services`](https://github.com/mtnlotus/shc-services) — SMART Health Card issuance. Run it
  locally on port 3000 and the dev server's `/api/shc` proxy will reach it.

## Open-source reference implementations

- [`kill-the-clipboard`](https://github.com/vintasoftware/kill-the-clipboard) — for SMART Health
  Card / Link consumption patterns, if extending `sharing/`.
