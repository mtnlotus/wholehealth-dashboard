export const DEFAULT_PATIENT_SMART_SCOPE =
  "launch openid fhirUser patient/Patient.read patient/DocumentReference.read patient/Binary.read patient/Goal.read patient/Condition.read patient/MedicationRequest.read";

export const DEFAULT_PRACTITIONER_SMART_SCOPE =
  "launch openid fhirUser user/Patient.read user/DocumentReference.read user/DocumentReference.write user/Binary.read user/Goal.read user/Condition.read user/MedicationRequest.read user/Encounter.read";

export type AppType = "patient" | "practitioner";

interface FhirCredentials {
  clientId?: string;
  clientSecret?: string;
}

function loadCredentials(): Record<string, FhirCredentials> {
  const raw = import.meta.env.VITE_FHIR_CREDENTIALS;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, FhirCredentials>;
  } catch {
    console.warn("VITE_FHIR_CREDENTIALS is not valid JSON");
    return {};
  }
}

const CREDENTIALS = loadCredentials();

export interface FhirServerConfig {
  iss: string;
  /** Key into VITE_FHIR_CREDENTIALS for clientId and clientSecret. */
  credentialKey: string;
  label: string;
  scope?: string;
  /** Override the OAuth2 grant type for this server. Omit to use the global default. */
  authFlow?: "code" | "backend";
  /**
   * Explicit client auth method for token exchange. Inferred if omitted:
   * "secret" when clientSecret is set, "jwt" when VITE_SMART_PRIVATE_KEY_JWK is set, else "none".
   * Set to "none" for public PKCE clients that have no secret and no registered public key.
   */
  clientAuthMethod?: "secret" | "jwt" | "none";
  /**
   * Override the `aud` claim in the JWT client assertion. Use when the authorization server
   * sits behind an API gateway and requires its own URL as the audience rather than the
   * gateway token endpoint (e.g. VA Lighthouse → Okta).
   */
  tokenAudience?: string;
  /**
   * Override the token endpoint URL for the POST request, bypassing SMART discovery.
   * Use when the EHR's Backend Services token endpoint differs from what .well-known returns
   * (e.g. VA Lighthouse system token endpoint vs the standard FHIR OAuth endpoint).
   */
  tokenEndpointOverride?: string;
  /** Defaults to "practitioner" if omitted. */
  appType?: AppType;
}

const VA_SCOPE =
  "launch patient/Patient.read patient/DocumentReference.read patient/Binary.read patient/Condition.read patient/MedicationRequest.read patient/Medication.read";

export const FHIR_SERVERS: FhirServerConfig[] = [
  {
    iss: "https://sandbox-api.va.gov/services/fhir/v0/r4",
    credentialKey: "va-patient",
    scope: VA_SCOPE,
    appType: "patient",
    label: "VA Sandbox",
  },
  {
    iss: "https://sandbox-api.va.gov/services/fhir/v0/r4",
    credentialKey: "va-practitioner",
    scope: VA_SCOPE,
    authFlow: "backend",
    tokenAudience: "https://deptva-eval.okta.com/oauth2/aus8nm1q0f7VQ0a482p7/v1/token",
    tokenEndpointOverride: "https://sandbox-api.va.gov/oauth2/health/system/v1/token",
    appType: "practitioner",
    label: "VA Sandbox (Practitioner)",
  },

  {
    iss: "https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    credentialKey: "oracle-patient",
    scope:
      "launch/patient openid profile fhirUser patient/Patient.read patient/DocumentReference.read patient/Binary.read patient/Goal.read patient/Condition.read patient/MedicationRequest.read",
    appType: "patient",
    label: "Oracle Sandbox",
  },
  {
    iss: "https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    credentialKey: "oracle-practitioner",
    appType: "practitioner",
    label: "Oracle Sandbox (Practitioner)",
  },

  {
    iss: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    credentialKey: "epic-patient",
    appType: "patient",
    label: "Epic Sandbox",
  },
  {
    iss: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    credentialKey: "epic-practitioner",
    appType: "practitioner",
    label: "Epic Sandbox (Practitioner)",
  },
  {
    iss: "https://launch.smarthealthit.org/v/r4/sim/WzMsImQ1NTI1NDU5LThmM2UtNGU2MC04ZWQyLTUxNDBkMTY1ZGI3NSIsIjk2MzMzNjUyLWVkMjgtNDFkMy1iYjYwLWQ0MzVmNDc4YzhlZCIsIkFVVE8iLDEsMSwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMSwiIl0/fhir",
    credentialKey: "smarthealthit-patient",
    clientAuthMethod: "none",
    appType: "patient",
    label: "SMART Health IT Sandbox",
  },
  {
    iss: "https://launch.smarthealthit.org/v/r4/fhir",
    credentialKey: "smarthealthit-practitioner",
    clientAuthMethod: "none",
    appType: "practitioner",
    label: "SMART Health IT Sandbox (Practitioner)",
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
  const server = findServer(iss, appType);
  return (server ? CREDENTIALS[server.credentialKey]?.clientId : undefined) ??
    import.meta.env.VITE_SMART_CLIENT_ID;
}

/** Return the client secret for a given ISS, or undefined if not configured. */
export function clientSecretForIss(iss: string, appType?: AppType): string | undefined {
  const server = findServer(iss, appType);
  return server ? CREDENTIALS[server.credentialKey]?.clientSecret : undefined;
}

/** Return the SMART scope for a given ISS, falling back to the appropriate default for the appType. */
export function scopeForIss(iss: string, appType?: AppType): string {
  const server = findServer(iss, appType);
  if (server?.scope) return server.scope;
  return (appType ?? server?.appType ?? "practitioner") === "patient"
    ? DEFAULT_PATIENT_SMART_SCOPE
    : DEFAULT_PRACTITIONER_SMART_SCOPE;
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
 *
 * Explicit clientAuthMethod config wins; otherwise inferred from clientSecret / JWK presence.
 * JWT is only inferred for explicitly configured servers — standalone launches with an
 * unknown ISS default to "none" (plain PKCE) because JWT requires a pre-registered
 * public key with the EHR, which ad-hoc servers won't have.
 */
export function clientAuthMethodForIss(iss: string, appType?: AppType): "secret" | "jwt" | "none" {
  const server = findServer(iss, appType);
  if (server?.clientAuthMethod) return server.clientAuthMethod;
  if (server && CREDENTIALS[server.credentialKey]?.clientSecret) return "secret";
  if (server && import.meta.env.VITE_SMART_PRIVATE_KEY_JWK) return "jwt";
  return "none";
}

/** Return the JWT client assertion audience for a given ISS, falling back to the token endpoint. */
export function tokenAudienceForIss(iss: string, appType?: AppType): string | undefined {
  return findServer(iss, appType)?.tokenAudience;
}

/** Return the token endpoint override for a given ISS, bypassing SMART discovery when set. */
export function tokenEndpointOverrideForIss(iss: string, appType?: AppType): string | undefined {
  return findServer(iss, appType)?.tokenEndpointOverride;
}

/**
 * Same as clientAuthMethodForIss but matches by clientId instead of appType.
 * Use this in the OAuth callback where the stored state has clientId but not appType,
 * and multiple app registrations share the same ISS (e.g. Epic patient vs practitioner).
 */
export function clientAuthMethodForClientId(iss: string, clientId: string): "secret" | "jwt" | "none" {
  const normalized = iss.replace(/\/$/, "");
  const server = FHIR_SERVERS.find(
    (s) => s.iss === normalized && CREDENTIALS[s.credentialKey]?.clientId === clientId,
  );
  if (server?.clientAuthMethod) return server.clientAuthMethod;
  if (server && CREDENTIALS[server.credentialKey]?.clientSecret) return "secret";
  if (server && import.meta.env.VITE_SMART_PRIVATE_KEY_JWK) return "jwt";
  return "none";
}
