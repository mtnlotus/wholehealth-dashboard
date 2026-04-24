import { useState } from "react";
import type { fhirR4 } from "@smile-cdr/fhirts";
import { useCreateSHC } from "../../hooks/useCreateSHC";
import { QRCodeDisplay } from "../../components/QRCodeDisplay";

interface Props {
  fhirBundle: fhirR4.Bundle;
}

export function SmartHealthCardPanel({ fhirBundle }: Props) {
  const { mutate, data, isPending, error } = useCreateSHC();
  const [qrValue, setQrValue] = useState<string | null>(null);

  function handleGenerate() {
    mutate(fhirBundle, {
      onSuccess: (result) => {
        if (result.verifiableCredential[0]) {
          setQrValue(`shc:/${result.verifiableCredential[0].replace(/\./g, "/")}`);
        }
      },
    });
  }

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h3>SMART Health Card</h3>
      <p>Generate a verifiable, shareable health card QR code.</p>
      <button onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Generating…" : "Generate Health Card"}
      </button>
      {error && <p style={{ color: "red" }}>Error: {String(error)}</p>}
      {qrValue && <QRCodeDisplay value={qrValue} />}
    </section>
  );
}
