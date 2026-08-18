# Architecture

## Role in the platform

`wholehealth-dashboard` is the clinician/coach-facing surface of Whole Health Cards. It doesn't
parse notes or sign health cards itself — it orchestrates the two services that do:

```
EHR (Epic / Oracle Health/ VA) ──SMART launch──▶ wholehealth-dashboard
                                                    │
                              DocumentReference (coach's note) fetched via FHIR
                                                    │
                                                    ▼
                                    coach-notes (in-process library call)
                                       NoteParser → mergeNotes → buildBundleFromNotes
                                                    │
                                        PhpData ─────┴───── FHIR Bundle (PCO IG)
                                          │                        │
                                          ▼                        ▼
                                 rendered PHP summary      POST to shc-services
                                    (in-app tabs)          (with the EHR session's
                                                             ID token as bearer auth)
                                                                    │
                                                                    ▼
                                                        signed SMART Health Card
                                                        (QR code + file download)
```

## Launch modes are the top-level branch

The app has five entry routes (`src/App.tsx`) instead of one home page, because "how was this
opened" determines everything else about what data is available:

- **`/launch`** — a practitioner SMART launch from inside the EHR. `src/config/fhirServers.ts`
  decides per-server whether to use the standard Authorization Code flow (`smartLaunch()`,
  redirects to the EHR) or SMART Backend Services / client credentials
  (`smartBackendLaunch()`, token exchange happens in-page — used for automated/no-redirect
  contexts).
- **`/patient`** — a standalone patient launch. Always Authorization Code; the user supplies the
  FHIR server URL themselves rather than receiving it as a launch parameter.
- **`/callback`** — the OAuth redirect target for both flows above; completes the token exchange
  and stores the resulting `smartClient` in `appStore`, then routes to `/app`.
- **`/app`** — the real dashboard, tab-driven via `?tab=`. Requires a `smartClient`.
  Every feature must handle "no notes yet," "notes fetched but not parsed," and "parsed" states.
- **`/dev`** — a standalone mode with no EHR at all. `appStore.launchMode` is set to
  `"standalone"`, and data comes from either a bundled sample FHIR bundle
  (`SampleBundleLoader`) or manually uploaded files (`FileUploadFallback`). This exists so the
  note-parsing → PHP → SHC pipeline can be exercised and demoed without any EHR sandbox access,
  and it's what CI/local verification should use by default.

`appStore` (Zustand) is what lets the rest of the app stay indifferent to which of these modes is
active — everything downstream reads `launchMode`, `smartClient`, `phpData`, and `fhirBundle` from
one place rather than threading launch-mode logic through every feature.

## EHR vendor differences are isolated, not scattered

Different EHRs disagree on details of the same FHIR APIs — e.g. Oracle/Cerner requires a
`charset` parameter on a `DocumentReference` attachment's `contentType`; Epic rejects it if
present. Rather than branch on vendor throughout the codebase, `ehrVendorForIss()`
(`src/config/fhirServers.ts`) classifies the launch `iss` once, and vendor-specific behavior is
kept behind that single function. Adding a new EHR is a config entry in `FHIR_SERVERS`, not a
sweep through feature code.

## Note processing happens client-side, in-process

`noteProcessingPipeline.ts` calls `coach-notes` directly as a library (not over HTTP) —
`NoteParser` → `mergeNotes` / `sortNotes` → `buildBundleFromNotes`. Both a merged `PhpData` (for
the in-app PHP summary) and a per-session FHIR Bundle (for FHIR-native consumers and for
`shc-services`) are produced from the same parse pass, mirroring the CLI pipeline in
`coach-notes` itself — see that repo's [ARCHITECTURE.md](https://github.com/mtnlotus/coach-notes/blob/main/ARCHITECTURE.md)
for why two artifacts come out of one parse.

Running the parser in-browser (rather than shipping notes to a server to parse) keeps clinical
note text inside the authenticated EHR session boundary until the point the user explicitly
chooses to generate a shareable artifact.

## Authenticating to shc-services: reuse the EHR session, not a new credential

`useCreateSHC` sends `shc-services` the **SMART on FHIR ID token** already obtained during launch
— not the FHIR access token, and not a separate Azure credential. This is a deliberate mirror of
`shc-services`' own auth design (see that repo's ARCHITECTURE.md): ID tokens are OIDC-signed with
each EHR's standard published keys and carry a `iss` that supports JWKS discovery, whereas some
EHRs' access tokens (e.g. Epic's) use unpublished signing keys that `shc-services` couldn't
verify. Practically, this means a user never has to separately authenticate to get a health card
— the EHR launch is the only login.

## Data fetching: React Query over `fhirclient`

Each FHIR resource type has one hook (`usePatient`, `useGoals`, `useConditions`,
`useMedications`, `useDocumentReferences`, …) wrapping a `fhirclient` request in TanStack Query,
giving caching and loading/error states for free. Hooks read the active `smartClient` from
`appStore` rather than taking it as a prop, so any component can fetch data without threading the
client through the tree.

## Known gaps / in progress

- Production EHR onboarding (adding real Epic/Oracle production orgs to `FHIR_SERVERS` and to
  `shc-services`' `SMART_TRUSTED_ISSUERS`) is ongoing.
- The PDF generation function (`VITE_PDF_FUNCTION_URL`) is a separate deployed service outside
  this workspace's three repos — its source isn't here.
- UI is functional but not yet visually finished — see the `design/` assets in the
  `wholehealth-workspace` meta-repo for target styling.
