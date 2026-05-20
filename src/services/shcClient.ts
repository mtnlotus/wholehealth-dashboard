import type { fhirR4 } from "@smile-cdr/fhirts";

export interface CreateSHCResponse {
  verifiableCredential: string[];
}

export async function createSmartHealthCard(
  fhirBundle: fhirR4.Bundle,
  azureBearerToken: string,
): Promise<CreateSHCResponse> {
  const url = `${import.meta.env.VITE_SHC_CREATE_URL}/shc`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${azureBearerToken}`,
    },
    body: JSON.stringify({ fhirBundle }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`shc-create ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json() as Promise<CreateSHCResponse>;
}
