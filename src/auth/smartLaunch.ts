import FHIR from "fhirclient";
import { clientIdForIss, clientSecretForIss, scopeForIss } from "../config/fhirServers";

export async function smartLaunch(issOverride?: string): Promise<void> {
  const iss =
    issOverride ??
    new URLSearchParams(window.location.search).get("iss") ??
    import.meta.env.VITE_FHIR_ISS ??
    "";
  const clientSecret = clientSecretForIss(iss);
  await FHIR.oauth2.authorize({
    iss,
    client_id: clientIdForIss(iss),
    scope: scopeForIss(iss),
    redirect_uri: `${window.location.origin}/callback`,
    ...(clientSecret ? { clientSecret } : {}),
  });
}
