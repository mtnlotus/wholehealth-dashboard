import type { fhirR4 } from "@smile-cdr/fhirts";

export interface CreateSHCResponse {
  /** JWS compact serialization — the .smart-health-card file format */
  verifiableCredential: string[];
  /**
   * SHC numeric-encoded QR string for a single-chunk QR code, or null if the
   * bundle is too large. Chunked QR is deprecated; use the file download instead.
   */
  qrNumeric: string | null;
}

/** Thrown when shc-services rejects the token because the EHR issuer is not configured. */
export class IssuerNotTrustedError extends Error {
  constructor(public readonly iss: string) {
    super(`EHR issuer not configured for SMART Health Card generation: ${iss}`);
    this.name = "IssuerNotTrustedError";
  }
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
    const body = await res.json().catch(() => ({ error: res.statusText })) as Record<string, string>;
    if (body.error === "issuer_not_trusted") {
      throw new IssuerNotTrustedError(body.iss ?? "unknown");
    }
    throw new Error(`shc-services ${res.status}: ${JSON.stringify(body)}`);
  }
  return res.json() as Promise<CreateSHCResponse>;
}
