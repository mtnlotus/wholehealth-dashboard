import FHIR from "fhirclient";
import { clientIdForIss, clientSecretForIss, scopeForIss } from "../config/fhirServers";

export async function smartPatientLaunch(iss: string): Promise<void> {
  await FHIR.oauth2.authorize({
    clientId: clientIdForIss(iss),
    clientSecret: clientSecretForIss(iss),
    iss,
    scope: scopeForIss(iss),
    redirectUri: `${window.location.origin}/callback`,
  });
}
