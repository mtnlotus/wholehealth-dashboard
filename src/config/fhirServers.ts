export const DEFAULT_SMART_SCOPE =
  "launch openid fhirUser patient/Patient.read patient/DocumentReference.read patient/Binary.read patient/Goal.read patient/Condition.read patient/MedicationRequest.read";

export type AppType = "patient" | "practitioner";

export interface FhirServerConfig {
  iss: string;
  clientId: string;
  label: string;
  clientSecret?: string;
  scope?: string;
  /** Override the OAuth2 grant type for this server. Omit to use the global default. */
  authFlow?: "code" | "backend";
  /** Defaults to "practitioner" if omitted. */
  appType?: AppType;
}

export const FHIR_SERVERS: FhirServerConfig[] = [
  {
    iss: "https://sandbox-api.va.gov/services/fhir/v0/r4",
    clientId: "0oa1b48zszuAMvJhd2p8",
    clientSecret: "REDACTED-ROTATED-SECRET",
    scope:
      "launch/patient openid profile fhirUser patient/Patient.read patient/DocumentReference.read patient/Binary.read patient/Condition.read patient/MedicationRequest.read",
    appType: "patient",
    label: "VA Sandbox",
  },
  {
    iss: "https://sandbox-api.va.gov/services/fhir/v0/r4",
    clientId: "0oa1b43cyc1mp4Br52p8",
    scope:
      "launch openid profile fhirUser user/Patient.read user/Practitioner.read user/DocumentReference.read user/Binary.read user/Condition.read user/MedicationRequest.read",
    appType: "practitioner",
    label: "VA Sandbox (Practitioner)",
  },
  {
    iss: "https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    clientId: "e5164fcc-f986-46ee-b923-9e21a92b88f9",
    appType: "practitioner",
    label: "Oracle Sandbox",
  },
  // Epic patient app
  {
    iss: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    clientId: "06f080fa-155c-40a9-b2bd-e4ccb9987b1a",
    clientSecret:
      "REDACTED-ROTATED-SECRET",
    authFlow: "code",
    appType: "patient",
    label: "Epic Sandbox",
  },
  {
    iss: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    clientId: "79d0d7ce-949c-4b31-a962-9bc083a9197d",
    authFlow: "code",
    appType: "practitioner",
    label: "Epic Sandbox (Practitioner)",
  },
];

/** Find the best-matching server for the given ISS and optional app type. */
function findServer(iss: string, appType?: AppType): FhirServerConfig | undefined {
  const normalized = iss.replace(/\/$/, "");
  const matches = FHIR_SERVERS.filter((s) => s.iss === normalized);
  if (matches.length === 0) return undefined;
  if (appType) {
    return matches.find((s) => (s.appType ?? "practitioner") === appType) ?? matches[0];
  }
  return matches[0];
}

/** Return all servers configured for the given app type. */
export function serversForAppType(appType: AppType): FhirServerConfig[] {
  return FHIR_SERVERS.filter((s) => (s.appType ?? "practitioner") === appType);
}

/** Return the client ID for a given ISS, falling back to the env default. */
export function clientIdForIss(iss: string, appType?: AppType): string {
  return findServer(iss, appType)?.clientId ?? import.meta.env.VITE_SMART_CLIENT_ID;
}

/** Return the client secret for a given ISS, or undefined if not configured. */
export function clientSecretForIss(iss: string, appType?: AppType): string | undefined {
  return findServer(iss, appType)?.clientSecret;
}

/** Return the SMART scope for a given ISS, falling back to DEFAULT_SMART_SCOPE. */
export function scopeForIss(iss: string, appType?: AppType): string {
  return findServer(iss, appType)?.scope ?? DEFAULT_SMART_SCOPE;
}

/**
 * Return the auth flow for a given ISS.
 * Explicit per-server config wins; otherwise falls back to the global default:
 * backend if VITE_SMART_PRIVATE_KEY_JWK is set, code otherwise.
 */
export function authFlowForIss(iss: string, appType?: AppType): "code" | "backend" {
  const server = findServer(iss, appType);
  if (server?.authFlow) return server.authFlow;
  return import.meta.env.VITE_SMART_PRIVATE_KEY_JWK ? "backend" : "code";
}

/**
 * Return how this server expects the client to authenticate at the token endpoint.
 * "secret" — client_secret in the POST body
 * "jwt"    — signed JWT client_assertion (requires VITE_SMART_PRIVATE_KEY_JWK)
 * "none"   — public client, no credential
 */
export function clientAuthMethodForIss(iss: string, appType?: AppType): "secret" | "jwt" | "none" {
  const server = findServer(iss, appType);
  if (server?.clientSecret) return "secret";
  if (import.meta.env.VITE_SMART_PRIVATE_KEY_JWK) return "jwt";
  return "none";
}

/**
 * Same as clientAuthMethodForIss but matches by clientId instead of appType.
 * Use this in the OAuth callback where the stored state has clientId but not appType,
 * and multiple app registrations share the same ISS (e.g. Epic patient vs practitioner).
 */
export function clientAuthMethodForClientId(iss: string, clientId: string): "secret" | "jwt" | "none" {
  const normalized = iss.replace(/\/$/, "");
  const server = FHIR_SERVERS.find((s) => s.iss === normalized && s.clientId === clientId);
  if (server?.clientSecret) return "secret";
  if (import.meta.env.VITE_SMART_PRIVATE_KEY_JWK) return "jwt";
  return "none";
}
