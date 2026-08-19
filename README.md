# Whole Health Dashboard

Your health and wellbeing improve when you have a clear understanding of your personal goals, why they are important to you, and a plan to achieve them. Whether you're working toward better fitness, managing a condition, reducing stress, or simply feeling more balanced day to day, clarity matters. When you can see where you are, where you want to go, and how your health data supports that journey, it's easier to stay engaged, make adjustments, and build healthy habits that last.

Whole Health Dashbard is a [SMART on FHIR](https://build.fhir.org/ig/HL7/smart-app-launch/) app for Health & Wellness
Coaches and other care team members, embedded in EHR systems such as Epic or Oracle Health
Millennium. It turns a coach's clinical notes into a Personal Health Plan and lets a patient
leave with a verifiable [SMART Health Card](https://build.fhir.org/ig/HL7/smart-health-cards-and-links). 
This dashboard app and a complimentary iOS mobile for individuals will read a Health & Wellness Coach's progress notes from text and convert them into a **Personal Health Plan (PHP)** conforming to the [Person-Centered Outcomes (PCO) FHIR IG](https://build.fhir.org/ig/HL7/pco-ig).

See [ARCHITECTURE.md](ARCHITECTURE.md) for what's built and what's not.

## Specifications

* [HL7 FHIR R4](https://hl7.org/fhir/R4)
* [SMART Health Cards and Links](https://build.fhir.org/ig/HL7/smart-health-cards-and-links)
* [Person-Centered Outcomes (PCO)](https://build.fhir.org/ig/HL7/pco-ig) — FHIR profiles used for coaching goals and observations

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) — this repo uses pnpm exclusively; do not use npm or yarn

## Setup

```bash
pnpm install
cp .env.example .env.local
# fill in .env.local — see Configuration below
pnpm dev
```

Open `http://localhost:5173/dev` for the standalone developer view, which runs the full pipeline
(sample FHIR bundle or uploaded notes → PHP → SMART Health Card) without a live EHR connection or
any SMART launch parameters.

## Scripts

```bash
pnpm dev                # Vite dev server
pnpm build               # tsc -b && vite build → dist/
pnpm start               # serve the built dist/ (via npx serve)
pnpm preview              # Vite preview of the production build
pnpm test                 # Vitest, single run (unit tests only)
pnpm test:watch           # Vitest, watch mode
pnpm test:integration     # Vitest, *.integration.test.ts only
pnpm typecheck             # tsc --noEmit
pnpm lint                  # Biome check src/ test/
pnpm lint:fix               # Biome check --write
pnpm format                  # Biome format --write
```

## Configuration

Copy [`.env.example`](.env.example) to `.env.local` and fill in the values for your environment.

| Variable | Purpose |
|---|---|
| `VITE_SMART_CLIENT_ID` | SMART on FHIR client ID registered with the EHR (or vendor sandbox). |
| `VITE_SMART_PRIVATE_KEY_JWK` | Set to use the SMART Backend Services (client credentials) flow — token exchange happens in-page, no EHR redirect. Leave empty to use the standard Authorization Code flow instead (`smartLaunch()` redirects to the EHR; `CallbackPage` completes it). |
| `VITE_FHIR_ISS` | Default FHIR server base URL, used by `/dev` and `/patient` when no `iss` launch parameter is present. |
| `VITE_SHC_CREATE_URL` | Base URL of a running [`shc-services`](https://github.com/mtnlotus/shc-services) instance. In dev, the Vite proxy also forwards `/api/shc` → `http://localhost:3000/shc`. |
| `VITE_AZURE_CLIENT_ID` / `VITE_AZURE_TENANT_ID` / `VITE_AZURE_CLIENT_SECRET` | Azure Entra ID app registration used to obtain the bearer token `shc-services` expects. |
| `VITE_SHC_SCOPE` | OAuth scope requested for the `shc-services` token, e.g. `api://<client-id>/.default`. |
| `VITE_PDF_FUNCTION_URL` | URL of the PDF-generation function used to render the Personal Health Plan PDF (a separate deployed service — not part of this repo). |

**Local monorepo development:** if you have `coach-notes` checked out as a sibling directory
(`../coach-notes`, as in the [`wholehealth-workspace`](https://github.com/mtnlotus/wholehealth-workspace)
layout), Vite automatically aliases the `coach-notes` import to that local source instead of the
published `github:mtnlotus/coach-notes` dependency — see `vite.config.ts` / `vitest.config.ts`.
No setup needed; it's detected by file existence.

## Launch modes

The app has no single "home page" — where it lands depends on how it was opened:

| Route | Used for |
|---|---|
| `/launch` | Practitioner SMART launch from an EHR (Authorization Code or Backend Services flow, chosen per-server — see `src/config/fhirServers.ts`) |
| `/patient` | Standalone patient-initiated launch — prompts for a FHIR server URL, then runs the Authorization Code flow |
| `/callback` | OAuth redirect target; completes the token exchange and routes to `/app` |
| `/app` | The main tab-based dashboard (`?tab=` — `summary`, `php`, `records`, `inventory`, `wbs`, `notes`) |
| `/dev` | Standalone developer/demo view — sample bundle or manual file upload, no EHR required |

## Testing

```bash
pnpm test              # unit tests (jsdom)
pnpm test:integration  # integration tests, e.g. the full note-parsing pipeline
```

Sample FHIR data for manual testing lives in `test/sample-data/`.

## Deployment

Deployed as an Azure Static Web App via GitHub Actions
([`.github/workflows/main_wholehealth-dashboard.yml`](.github/workflows/main_wholehealth-dashboard.yml))
on push to `main` — runs tests, builds with the `VITE_*` secrets injected at build time (Vite
inlines env vars into the static bundle), and deploys `dist/`.

## Project layout

```
src/
├── App.tsx                    # Route table (launch modes → pages)
├── auth/                       # SMART on FHIR launch flows (code, backend services, callback)
├── config/fhirServers.ts        # Per-EHR client config, vendor quirks (Epic/Cerner), scopes
├── pages/                        # Route-level pages (Launch, PatientLaunch, Callback, Dev)
├── features/
│   ├── dashboard/                  # Tab shell + the six dashboard tabs
│   ├── notes/                       # Clinical note upload / sample bundle loading
│   ├── php/                          # Personal Health Plan summary rendering
│   └── sharing/                       # SMART Health Card selection + display
├── hooks/                          # React Query hooks over the FHIR client (Patient, Goal, …)
├── services/                        # HTTP clients for shc-services and the PDF function
├── store/appStore.ts                # Zustand store — launch mode, SMART client, loaded PHP data
└── components/                     # Shared presentational components
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for how these pieces fit together, and
[AGENTS.md](AGENTS.md) for guidance if you're an AI agent working in this repo.

## Related

- [`coach-notes`](https://github.com/mtnlotus/coach-notes) — note parsing and PHP generation
- [`shc-services`](https://github.com/mtnlotus/shc-services) — SMART Health Card signing
- [SMART App Launch IG](https://build.fhir.org/ig/HL7/smart-app-launch/)
- [Person-Centered Outcomes (PCO) IG](https://build.fhir.org/ig/HL7/pco-ig)

## License

[MIT](LICENSE)
