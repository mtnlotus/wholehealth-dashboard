import FHIR from "fhirclient";
import { clientIdForIss } from "../config/fhirServers";

export async function smartPatientLaunch(iss: string): Promise<void> {
  await FHIR.oauth2.authorize({
    client_id: clientIdForIss(iss),
    iss,
    scope: "launch/patient patient/Patient.read patient/DocumentReference.read patient/Binary.read patient/Goal.read openid fhirUser",
    redirect_uri: `${window.location.origin}/callback`,
  });
}
