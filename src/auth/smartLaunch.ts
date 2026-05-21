import FHIR from "fhirclient";
import {
  type AppType,
  clientIdForIss,
  clientSecretForIss,
  scopeForIss,
} from "../config/fhirServers";

export async function smartLaunch(issOverride?: string, appType?: AppType): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const iss = issOverride ?? params.get("iss") ?? import.meta.env.VITE_FHIR_ISS ?? "";
  const launch = params.get("launch") ?? undefined;
  const clientSecret = clientSecretForIss(iss, appType);
  const resolvedClientId = clientIdForIss(iss, appType);
  console.log("[smartLaunch]", { iss, appType, launch, resolvedClientId });
  await FHIR.oauth2.authorize({
    iss,
    client_id: clientIdForIss(iss, appType),
    scope: scopeForIss(iss, appType),
    redirect_uri: `${window.location.origin}/callback`,
    ...(launch ? { launch } : {}),
    ...(clientSecret ? { clientSecret } : {}),
  });
}
