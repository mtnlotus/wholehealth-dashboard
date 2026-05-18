import FHIR from "fhirclient";
import { clientIdForIss, scopeForIss } from "../config/fhirServers";

export async function smartPatientLaunch(iss: string): Promise<void> {
  await FHIR.oauth2.authorize({
    client_id: clientIdForIss(iss),
    iss,
    scope: scopeForIss(iss),
    redirect_uri: `${window.location.origin}/callback`,
  });
}
