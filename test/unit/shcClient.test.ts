import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSmartHealthCard } from "../../src/services/shcClient";
import type { fhirR4 } from "@smile-cdr/fhirts";

const mockBundle: fhirR4.Bundle = {
  resourceType: "Bundle",
  type: "collection",
  entry: [],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("createSmartHealthCard", () => {
  it("posts to the SHC endpoint and returns verifiable credentials", async () => {
    const mockResponse = { verifiableCredential: ["eyJ..."] };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 201 }),
    );

    const result = await createSmartHealthCard(mockBundle, "test-token");
    expect(result.verifiableCredential).toEqual(["eyJ..."]);

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const init = callArgs[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-token");
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
    );
    await expect(createSmartHealthCard(mockBundle, "bad-token")).rejects.toThrow("401");
  });
});
