import FHIR from "fhirclient";

export async function smartLaunch(): Promise<void> {
  await FHIR.oauth2.authorize({
    client_id: import.meta.env.VITE_SMART_CLIENT_ID,
    scope: "launch patient/Patient.read patient/DocumentReference.read patient/Binary.read patient/Goal.read openid fhirUser",
    redirect_uri: `${window.location.origin}/callback`,
  });
}
