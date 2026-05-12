import { importJWK, SignJWT, type JWK } from "jose";
import FHIR from "fhirclient";
import type Client from "fhirclient/lib/Client";
import { clientIdForIss, clientSecretForIss } from "../config/fhirServers";

interface SmartConfiguration {
  token_endpoint: string;
}

interface TokenEndpointResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
  patient?: string;
  [key: string]: unknown;
}

async function discoverTokenEndpoint(iss: string): Promise<string> {
  const url = `${iss.replace(/\/$/, "")}/.well-known/smart-configuration`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`SMART discovery failed ${res.status} at ${url}`);
  const config = (await res.json()) as SmartConfiguration;
  if (!config.token_endpoint) throw new Error("No token_endpoint in SMART configuration");
  return config.token_endpoint;
}

async function buildClientAssertion(clientId: string, tokenEndpoint: string): Promise<string> {
  const jwk = JSON.parse(import.meta.env.VITE_SMART_PRIVATE_KEY_JWK) as JWK;
  const alg = jwk.alg ?? "ES384";
  const privateKey = await importJWK(jwk, alg);
  const header: { alg: string; kid?: string } = { alg };
  if (jwk.kid) header.kid = jwk.kid;
  return new SignJWT({})
    .setProtectedHeader(header)
    .setIssuer(clientId)
    .setSubject(clientId)
    .setAudience(tokenEndpoint)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

/**
 * SMART Backend Services launch (Client Credentials Grant).
 * Exchanges a signed JWT client assertion for a system-level access token,
 * then returns a fhirclient Client ready to make FHIR requests.
 *
 * @param iss - FHIR server base URL (from EHR launch ?iss= param)
 * @param patientIdHint - patient ID from launch URL; used only when the EHR
 *   does not include `patient` in the token response
 */
export async function smartBackendLaunch(
  iss: string,
  patientIdHint?: string,
): Promise<Client> {
  const clientId = clientIdForIss(iss);
  const clientSecret = clientSecretForIss(iss);
  const tokenEndpoint = await discoverTokenEndpoint(iss);

  const scope =
    "system/Patient.read system/DocumentReference.read system/Binary.read system/Goal.read";

  const body = clientSecret
    ? new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, scope })
    : new URLSearchParams({
        grant_type: "client_credentials",
        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: await buildClientAssertion(clientId, tokenEndpoint),
        scope,
      });

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`SMART token request failed ${res.status}: ${JSON.stringify(err)}`);
  }

  const tokenResponse = (await res.json()) as TokenEndpointResponse;
  const patient = tokenResponse.patient ?? patientIdHint;

  // biome-ignore lint/suspicious/noExplicitAny: fhirclient TokenResponse type is narrower than real-world EHR responses
  return FHIR.client({
    serverUrl: iss,
    tokenResponse: { ...tokenResponse, ...(patient ? { patient } : {}) } as any,
  });
}
