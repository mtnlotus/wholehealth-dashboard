import type { fhirR4 } from "@smile-cdr/fhirts";
import { useState } from "react";
import { QRCodeDisplay } from "../../components/QRCodeDisplay";
import { IssuerNotTrustedError, type CreateSHCResponse } from "../../services/shcClient";
import { useCreateSHC } from "../../hooks/useCreateSHC";

interface Props {
  fhirBundle: fhirR4.Bundle;
}

function downloadSmartHealthCard(verifiableCredential: string[]): void {
  const fileContent = JSON.stringify({ verifiableCredential }, null, 2);
  const blob = new Blob([fileContent], { type: "application/smart-health-card" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "health-card.smart-health-card";
  a.click();
  URL.revokeObjectURL(url);
}

export function SmartHealthCardPanel({ fhirBundle }: Props) {
  const { mutate, isPending, error } = useCreateSHC();
  const [shcResult, setShcResult] = useState<CreateSHCResponse | null>(null);

  function handleGenerate() {
    mutate(fhirBundle, {
      onSuccess: (result) => setShcResult(result),
    });
  }

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h3>SMART Health Card</h3>
      <p>Generate a verifiable, shareable health card.</p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="button" onClick={handleGenerate} disabled={isPending}>
          {isPending ? "Generating…" : "Generate Health Card"}
        </button>
        {shcResult && (
          <button
            type="button"
            onClick={() => downloadSmartHealthCard(shcResult.verifiableCredential)}
          >
            Download .smart-health-card
          </button>
        )}
      </div>
      {error && (
        error instanceof IssuerNotTrustedError
          ? <p style={{ color: "#856404", background: "#fff3cd", padding: "0.75rem", borderRadius: "4px", margin: "1rem 0 0" }}>
              SMART Health Card generation is not available for this organization.
              Contact your administrator to enable it.
            </p>
          : <p style={{ color: "red" }}>Health card error: {String(error)}</p>
      )}
      {shcResult && (
        shcResult.qrNumeric
          ? <QRCodeDisplay value={shcResult.qrNumeric} />
          : <p style={{ color: "#856404", background: "#fff3cd", padding: "0.75rem", borderRadius: "4px", margin: "1rem 0 0" }}>
              This health plan is too large for a QR code. Use <strong>Download .smart-health-card</strong> to save it as a file.
            </p>
      )}
    </section>
  );
}
