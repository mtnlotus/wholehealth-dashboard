import FHIR from "fhirclient";
import { clientIdForIss, scopeForIss } from "../config/fhirServers";

export async function smartLaunch(): Promise<void> {
  const iss =
    new URLSearchParams(window.location.search).get("iss") ??
    import.meta.env.VITE_FHIR_ISS ??
    "";
  await FHIR.oauth2.authorize({
    client_id: clientIdForIss(iss),
    scope: scopeForIss(iss),
    redirect_uri: `${window.location.origin}/callback`,
  });
}
