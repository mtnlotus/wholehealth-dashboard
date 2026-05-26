import { useState } from "react";
import { QRCodeDisplay } from "../../components/QRCodeDisplay";
import { useCreateSHC } from "../../hooks/useCreateSHC";
import { useAppStore } from "../../store/appStore";
import { ActionStepList, GoalList } from "./GoalList";
import { WbsDisplay } from "./WbsDisplay";

export function PhpSummaryPage() {
  const phpData = useAppStore((s) => s.phpData);
  const fhirBundle = useAppStore((s) => s.fhirBundle);
  const createSHC = useCreateSHC();
  const [qrValue, setQrValue] = useState<string | null>(null);

  if (!phpData) return <div>No Personal Health Plan loaded.</div>;

  const name = phpData.patient
    ? `${phpData.patient.given.join(" ")} ${phpData.patient.family}`
    : "Unknown Patient";

  const birthDate = phpData.patient?.birth_date;

  function handleSHC() {
    if (!fhirBundle) return;
    createSHC.mutate(fhirBundle, {
      onSuccess: (result) => {
        const jws = result.verifiableCredential[0];
        if (jws) setQrValue(`shc:/${jws.replace(/\./g, "/")}`);
      },
    });
  }

  return (
    <div>
      <h2>Personal Health Plan — {name}</h2>
      {birthDate && (
        <p style={{ margin: "0 0 1rem", color: "#555", fontSize: "0.9rem" }}>
          Date of Birth: {birthDate}
        </p>
      )}

      {/* Action bar */}
      <div style={{ margin: "1rem 0 1.5rem" }}>
        <button
          onClick={handleSHC}
          disabled={createSHC.isPending || !fhirBundle}
          title={!fhirBundle ? "No FHIR bundle available" : undefined}
        >
          {createSHC.isPending ? "Creating…" : "⊕ SMART Health Card"}
        </button>
      </div>

      {createSHC.error && (
        <p style={{ color: "red", marginBottom: "1rem" }}>
          Health card error: {String(createSHC.error)}
        </p>
      )}
      {qrValue && (
        <section style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>SMART Health Card</h3>
          <p style={{ fontSize: "0.85rem", color: "#555", margin: "0 0 0.5rem" }}>
            Scan to share your verified Personal Health Plan.
          </p>
          <QRCodeDisplay value={qrValue} size={220} />
        </section>
      )}

      {phpData.map && (
        <section>
          <h3>Mission, Aspiration, Purpose (MAP)</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{phpData.map}</p>
        </section>
      )}

      {phpData.wbs && (
        <section>
          <h3>Well-Being Signs</h3>
          <WbsDisplay wbs={phpData.wbs} />
        </section>
      )}

      {phpData.goals.length > 0 && (
        <section>
          <h3>Long-Term Goals</h3>
          <GoalList goals={phpData.goals} />
        </section>
      )}

      {phpData.goals.some((g) => g.goal_type === "short-term") && (
        <section>
          <h3>Short-Term Goals</h3>
          <ActionStepList goals={phpData.goals} />
        </section>
      )}
    </div>
  );
}
