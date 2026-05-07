import type Client from "fhirclient/lib/Client";

const FHIR_HEADERS = { Accept: "application/json+fhir" };

/** Wrapper around fhirclient's request that injects required FHIR headers. */
export function fhirRequest<T>(
  client: Client,
  url: string,
  options?: RequestInit,
): Promise<T> {
  return client.request<T>({
    url,
    headers: { ...FHIR_HEADERS, ...options?.headers },
  });
}
