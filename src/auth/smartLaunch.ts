import FHIR from "fhirclient";
import {
  type AppType,
  clientIdForIss,
  clientSecretForIss,
  scopeForIss,
} from "../config/fhirServers";

export async function smartLaunch(issOverride?: string, appType?: AppType): Promise<void> {
  const iss =
    issOverride ??
    new URLSearchParams(window.location.search).get("iss") ??
    import.meta.env.VITE_FHIR_ISS ??
    "";
  const clientSecret = clientSecretForIss(iss, appType);
  await FHIR.oauth2.authorize({
    iss,
    client_id: clientIdForIss(iss, appType),
    scope: scopeForIss(iss, appType),
    redirect_uri: `${window.location.origin}/callback`,
    ...(clientSecret ? { clientSecret } : {}),
  });
}
