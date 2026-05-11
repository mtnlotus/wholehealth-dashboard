import FHIR from "fhirclient";
import { clientIdForIss } from "../config/fhirServers";

export async function smartLaunch(): Promise<void> {
  const iss =
    new URLSearchParams(window.location.search).get("iss") ??
    import.meta.env.VITE_FHIR_ISS ??
    "";
  await FHIR.oauth2.authorize({
    client_id: clientIdForIss(iss),
    scope: "launch patient/Patient.read patient/DocumentReference.read patient/Binary.read patient/Goal.read openid fhirUser",
    redirect_uri: `${window.location.origin}/callback`,
  });
}
