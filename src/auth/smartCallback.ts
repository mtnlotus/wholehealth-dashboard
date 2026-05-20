import FHIR from "fhirclient";
import type Client from "fhirclient/lib/Client";
import { clientAuthMethodForIss } from "../config/fhirServers";
import { buildClientAssertion } from "./smartBackendLaunch";

// fhirclient stores state with mixed conventions — handle both forms defensively
interface StoredSmartState {
  serverUrl?: string;
  clientId?: string;
  client_id?: string;
  redirectUri?: string;
  redirect_uri?: string;
  tokenUri?: string;
  codeVerifier?: string;
  [key: string]: unknown;
}

interface TokenEndpointResponse {
  access_token: string;
  patient?: string;
  [key: string]: unknown;
}

async function jwtCodeExchange(state: StoredSmartState): Promise<Client> {
  const code = new URLSearchParams(window.location.search).get("code");
  if (!code) throw new Error("No authorization code in callback URL");

  const serverUrl = state.serverUrl ?? "";
  const clientId = state.clientId ?? (state.client_id as string | undefined) ?? "";
  const redirectUri = state.redirectUri ?? (state.redirect_uri as string | undefined) ?? "";
  const tokenUri = state.tokenUri ?? "";

  console.log("[smartCallback] jwtCodeExchange state:", { serverUrl, clientId, redirectUri, tokenUri, hasCodeVerifier: !!state.codeVerifier });

  if (!tokenUri) throw new Error("No tokenUri in stored SMART state — cannot build JWT audience");
  if (!clientId) throw new Error("No clientId in stored SMART state");

  const assertion = await buildClientAssertion(clientId, tokenUri);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: assertion,
  });
  if (state.codeVerifier) body.set("code_verifier", state.codeVerifier as string);

  console.log("[smartCallback] token request body:", Object.fromEntries(body.entries()));

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Token exchange failed ${res.status}: ${JSON.stringify(err)}`);
  }

  const tokenResponse = (await res.json()) as TokenEndpointResponse;
  // biome-ignore lint/suspicious/noExplicitAny: fhirclient TokenResponse type is narrower than real-world EHR responses
  return FHIR.client({ serverUrl, tokenResponse: tokenResponse as any });
}

export async function smartCallback(): Promise<Client> {
  // fhirclient stores auth state in sessionStorage under the `state` URL param.
  const urlState = new URLSearchParams(window.location.search).get("state");
  if (urlState) {
    const stored = sessionStorage.getItem(urlState);
    if (stored) {
      const state = JSON.parse(stored) as StoredSmartState;
      console.log("[smartCallback] stored SMART state keys:", Object.keys(state));
      const serverUrl = state.serverUrl ?? "";
      if (serverUrl && clientAuthMethodForIss(serverUrl) === "jwt") {
        return jwtCodeExchange(state);
      }
    }
  }
  return FHIR.oauth2.ready();
}
