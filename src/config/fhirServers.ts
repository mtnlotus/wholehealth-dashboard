export const DEFAULT_SMART_SCOPE =
  "launch openid fhirUser patient/Patient.read patient/DocumentReference.read patient/Binary.read patient/Goal.read patient/Condition.read patient/MedicationRequest.read";

export interface FhirServerConfig {
  iss: string;
  clientId: string;
  label: string;
  clientSecret?: string;
  scope?: string;
}

export const FHIR_SERVERS: FhirServerConfig[] = [
  {
    iss: "https://sandbox-api.va.gov/services/fhir/v0/r4",
    clientId: "0oa1b48zszuAMvJhd2p8",
    clientSecret: "REDACTED-ROTATED-SECRET",
    scope: "launch/patient openid profile fhirUser patient/Patient.read patient/DocumentReference.read patient/Binary.read patient/Condition.read patient/MedicationRequest.read",
    label: "VA Sandbox",
  },
  // {"error":"invalid_request","error_description":"The redirect URI specified by the application does not match any of the registered redirect URIs. Erroneous redirect URI: https://proud-river-0fba33d1e.7.azurestaticapps.net/callback"}
  // {
  //   iss: "https://sandbox-api.va.gov/services/fhir/v0/r4",
  //   clientId: "0oa1b43cyc1mp4Br52p8",
  //   scope: "launch openid profile fhirUser user/Patient.read user/Practitioner.read user/DocumentReference.read user/Binary.read user/Condition.read user/MedicationRequest.read",
  //   label: "VA Sandbox",
  // },
  {
    iss: "https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    clientId: "e5164fcc-f986-46ee-b923-9e21a92b88f9",
    label: "Oracle Sandbox",
  },
  // Epic patient app
  {
    iss: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    clientId: "06f080fa-155c-40a9-b2bd-e4ccb9987b1a",
    clientSecret: "REDACTED-ROTATED-SECRET",
    label: "Epic Sandbox",
  },
  // Epic practitioner app
  // {
  //   iss: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
  //   clientId: "79d0d7ce-949c-4b31-a962-9bc083a9197d",
  //   clientSecret: "REDACTED-ROTATED-SECRET",
  //   label: "Epic Sandbox",
  // },
];

/** Return the client ID for a given ISS, falling back to the env default. */
export function clientIdForIss(iss: string): string {
  const normalized = iss.replace(/\/$/, "");
  const match = FHIR_SERVERS.find((s) => s.iss === normalized);
  return match?.clientId ?? import.meta.env.VITE_SMART_CLIENT_ID;
}

/** Return the client secret for a given ISS, or undefined if not configured. */
export function clientSecretForIss(iss: string): string | undefined {
  const normalized = iss.replace(/\/$/, "");
  return FHIR_SERVERS.find((s) => s.iss === normalized)?.clientSecret;
}

/** Return the SMART scope for a given ISS, falling back to DEFAULT_SMART_SCOPE. */
export function scopeForIss(iss: string): string {
  const normalized = iss.replace(/\/$/, "");
  return FHIR_SERVERS.find((s) => s.iss === normalized)?.scope ?? DEFAULT_SMART_SCOPE;
}
