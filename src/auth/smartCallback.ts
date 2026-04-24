import FHIR from "fhirclient";
import type Client from "fhirclient/lib/Client";

export async function smartCallback(): Promise<Client> {
  return FHIR.oauth2.ready();
}
