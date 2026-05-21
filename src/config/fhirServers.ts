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
  /**
   * Explicit client auth method for token exchange. Inferred if omitted:
   * "secret" when clientSecret is set, "jwt" when VITE_SMART_PRIVATE_KEY_JWK is set, else "none".
   * Set to "none" for public PKCE clients that have no secret and no registered public key.
   */
  clientAuthMethod?: "secret" | "jwt" | "none";
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
    authFlow: "backend",
    appType: "practitioner",
    label: "VA Sandbox (Practitioner)",
  },
  {
    iss: "https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    clientId: "c4b5bb81-cd2f-431b-8d50-066696a9e367",
    clientSecret: "REDACTED-ROTATED-SECRET",
    scope:
      "launch/patient openid profile fhirUser patient/Patient.read patient/DocumentReference.read patient/Binary.read patient/Goal.read patient/Condition.read patient/MedicationRequest.read",
    appType: "patient",
    label: "Oracle Sandbox",
  },
  {
    iss: "https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    clientId: "e5164fcc-f986-46ee-b923-9e21a92b88f9",
    clientSecret: "REDACTED-ROTATED-SECRET",
    // clientAuthMethod: "jwt",
    appType: "practitioner",
    label: "Oracle Sandbox (Practitioner)",
  },
  // Epic patient app
  {
    iss: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    clientId: "06f080fa-155c-40a9-b2bd-e4ccb9987b1a",
    clientSecret:
      "REDACTED-ROTATED-SECRET",
    appType: "patient",
    label: "Epic Sandbox",
  },
  {
    iss: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    clientId: "79d0d7ce-949c-4b31-a962-9bc083a9197d",
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
 * Servers must opt in to Backend Services via explicit authFlow: "backend".
 * Defaults to Authorization Code ("code") — JWK presence signals JWT code-exchange
 * capability (e.g. Epic), not that all servers should use Backend Services.
 */
export function authFlowForIss(iss: string, appType?: AppType): "code" | "backend" {
  const server = findServer(iss, appType);
  return server?.authFlow ?? "code";
}

/**
 * Return how this server expects the client to authenticate at the token endpoint.
 * "secret" — client_secret in the POST body
 * "jwt"    — signed JWT client_assertion (requires VITE_SMART_PRIVATE_KEY_JWK)
 * "none"   — public PKCE client, no credential in token request
 * Explicit clientAuthMethod config wins; otherwise inferred from clientSecret / JWK presence.
 */
export function clientAuthMethodForIss(iss: string, appType?: AppType): "secret" | "jwt" | "none" {
  const server = findServer(iss, appType);
  if (server?.clientAuthMethod) return server.clientAuthMethod;
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
  if (server?.clientAuthMethod) return server.clientAuthMethod;
  if (server?.clientSecret) return "secret";
  if (import.meta.env.VITE_SMART_PRIVATE_KEY_JWK) return "jwt";
  return "none";
}
