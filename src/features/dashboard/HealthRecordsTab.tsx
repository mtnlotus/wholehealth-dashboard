import type { fhirR4 } from "@smile-cdr/fhirts";
import { EmptyState } from "../../components/EmptyState";
import { useConditions } from "../../hooks/useConditions";
import { useMedications } from "../../hooks/useMedications";
import { useSmartClient } from "../../hooks/useSmartClient";

function formatDate(dateStr: string | undefined | Date): string {
  if (!dateStr) return "—";
  const s = typeof dateStr === "string" ? dateStr : dateStr.toISOString();
  try {
    return new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return s.slice(0, 10);
  }
}

function conditionName(c: fhirR4.Condition): string {
  return c.code?.text ?? c.code?.coding?.[0]?.display ?? "Unknown condition";
}

function conditionStatus(c: fhirR4.Condition): string {
  return c.clinicalStatus?.coding?.[0]?.code ?? "unknown";
}

function conditionDate(c: fhirR4.Condition): string {
  return formatDate(c.recordedDate ?? c.onsetDateTime);
}

function conditionRecordedBy(c: fhirR4.Condition): string {
  return c.recorder?.display ?? c.asserter?.display ?? "—";
}

function medName(m: fhirR4.MedicationRequest): string {
  return (
    (m.medicationCodeableConcept as fhirR4.CodeableConcept | undefined)?.text ??
    (m.medicationCodeableConcept as fhirR4.CodeableConcept | undefined)?.coding?.[0]?.display ??
    "Unknown medication"
  );
}

function medSig(m: fhirR4.MedicationRequest): string {
  return m.dosageInstruction?.[0]?.text ?? "—";
}

function medStatus(m: fhirR4.MedicationRequest): string {
  return m.status ?? "unknown";
}

function medStarted(m: fhirR4.MedicationRequest): string {
  return formatDate(m.authoredOn);
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 99,
        background: isActive ? "var(--color-bg-highlight)" : "var(--color-bg-card-warm)",
        color: isActive ? "var(--color-active-badge)" : "var(--color-text-muted)",
        border: `1px solid ${isActive ? "var(--color-tag-green-bg)" : "var(--color-border)"}`,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
  textAlign: "left",
  borderBottom: "1px solid var(--color-border)",
};

const tdStyle: React.CSSProperties = {
  padding: "0.625rem 0.75rem",
  fontSize: 13,
  borderBottom: "1px solid var(--color-border-light)",
  verticalAlign: "middle",
};

export function HealthRecordsTab() {
  const client = useSmartClient();
  const patientId = client?.patient?.id ?? undefined;
  const isSmartMode = !!client;

  const { data: conditions, isLoading: condLoading } = useConditions(patientId);
  const { data: medications, isLoading: medLoading } = useMedications(patientId);

  if (!isSmartMode) {
    return (
      <div style={{ padding: "2rem 1.25rem" }}>
        <EmptyState
          message="Health Records require a live EHR connection."
          detail="Launch this app via a SMART on FHIR link from your EHR to view conditions and medications."
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Live data banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.625rem 0.875rem",
          background: "var(--color-bg-blue-highlight)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-tag-blue-bg)",
          fontSize: 13,
        }}
      >
        <span style={{ color: "var(--color-accent-blue)", fontWeight: 600 }}>ℹ Live FHIR data.</span>
        <span style={{ color: "var(--color-text-muted)" }}>
          Conditions and Medications are queried from the EHR. Read-only view.
        </span>
      </div>

      {/* Conditions */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            Health Conditions
            {conditions && conditions.length > 0 && (
              <span style={{ marginLeft: "0.5rem", fontSize: 12, color: "var(--color-text-muted)", fontWeight: 400 }}>
                {conditions.length} records
              </span>
            )}
          </h3>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
            FHIR · Condition
          </span>
        </div>
        <div
          style={{
            background: "var(--color-bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border-light)",
            overflow: "hidden",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {condLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
              Loading conditions…
            </div>
          ) : !conditions || conditions.length === 0 ? (
            <div style={{ padding: "1.5rem" }}>
              <EmptyState message="No conditions found for this patient." />
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-bg)" }}>
                  <th style={thStyle}>Condition</th>
                  <th style={thStyle}>Recorded Date</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {conditions.map((c, i) => (
                  <tr key={c.id ?? i} style={{ background: i % 2 === 0 ? "var(--color-bg-card)" : "var(--color-bg)" }}>
                    <td style={tdStyle}>{conditionName(c)}</td>
                    <td style={{ ...tdStyle, color: "var(--color-text-muted)" }}>{conditionDate(c)}</td>
                    <td style={tdStyle}><StatusBadge status={conditionStatus(c)} /></td>
                    <td style={{ ...tdStyle, color: "var(--color-text-muted)" }}>{conditionRecordedBy(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Medications */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            Medications
            {medications && medications.length > 0 && (
              <span style={{ marginLeft: "0.5rem", fontSize: 12, color: "var(--color-text-muted)", fontWeight: 400 }}>
                {medications.length} records
              </span>
            )}
          </h3>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
            FHIR · MedicationRequest
          </span>
        </div>
        <div
          style={{
            background: "var(--color-bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border-light)",
            overflow: "hidden",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {medLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
              Loading medications…
            </div>
          ) : !medications || medications.length === 0 ? (
            <div style={{ padding: "1.5rem" }}>
              <EmptyState message="No medications found for this patient." />
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-bg)" }}>
                  <th style={thStyle}>Medication</th>
                  <th style={thStyle}>Sig (Dose / Route / Frequency)</th>
                  <th style={thStyle}>Started</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((m, i) => (
                  <tr key={m.id ?? i} style={{ background: i % 2 === 0 ? "var(--color-bg-card)" : "var(--color-bg)" }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{medName(m)}</td>
                    <td style={{ ...tdStyle, color: "var(--color-text-muted)", fontSize: 12 }}>{medSig(m)}</td>
                    <td style={{ ...tdStyle, color: "var(--color-text-muted)" }}>{medStarted(m)}</td>
                    <td style={tdStyle}><StatusBadge status={medStatus(m)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
