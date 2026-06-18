import type { fhirR4 } from "@smile-cdr/fhirts";
import { useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { useConditions } from "../../hooks/useConditions";
import { useGoals } from "../../hooks/useGoals";
import { useMedications } from "../../hooks/useMedications";
import { useSmartClient } from "../../hooks/useSmartClient";
import { useSmartScopes } from "../../hooks/useSmartScopes";

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

function conditionClinicalStatus(c: fhirR4.Condition): string {
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

function medIndication(m: fhirR4.MedicationRequest): string {
  return (
    (m.reasonCode?.[0]?.text ?? m.reasonCode?.[0]?.coding?.[0]?.display) ?? "—"
  );
}

function medPrescriber(m: fhirR4.MedicationRequest): string {
  return m.requester?.display ?? "—";
}

function goalDescription(g: fhirR4.Goal): string {
  return g.description?.text ?? g.description?.coding?.[0]?.display ?? "—";
}

function goalPriority(g: fhirR4.Goal): string {
  return g.priority?.text ?? g.priority?.coding?.[0]?.display ?? "—";
}

function goalLifecycleStatus(g: fhirR4.Goal): string {
  return g.lifecycleStatus ?? "unknown";
}

function goalAchievementStatus(g: fhirR4.Goal): string {
  return g.achievementStatus?.text ?? g.achievementStatus?.coding?.[0]?.display ?? "—";
}

function goalStartDate(g: fhirR4.Goal): string {
  return formatDate(g.startDate);
}

function goalTargetDate(g: fhirR4.Goal): string {
  const due = g.target?.[0]?.dueDate;
  return due ? formatDate(due) : "—";
}

function goalExpressedBy(g: fhirR4.Goal): string {
  return g.expressedBy?.display ?? "—";
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active" || status === "accepted";
  return (
    <span
      style={{
        padding: "2px 10px",
        borderRadius: 99,
        background: isActive ? "var(--color-bg-highlight)" : "var(--color-bg-card-warm)",
        color: isActive ? "var(--color-active-badge)" : "var(--color-text-muted)",
        border: `1px solid ${isActive ? "var(--color-tag-green-bg)" : "var(--color-border)"}`,
        fontSize: 12,
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
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
  textAlign: "left",
  borderBottom: "1px solid var(--color-border-light)",
  background: "transparent",
};

const tdStyle: React.CSSProperties = {
  padding: "0.75rem 0.75rem",
  fontSize: 13,
  borderBottom: "1px solid var(--color-border-light)",
  verticalAlign: "middle",
  background: "transparent",
};

interface SectionHeaderProps {
  title: string;
  total: number;
  activeOnly: boolean;
  onToggle: (activeOnly: boolean) => void;
}

function SectionHeader({ title, total, activeOnly, onToggle }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.875rem 1rem",
        background: "var(--color-bg-card-warm)",
        borderBottom: "1px solid var(--color-border-light)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
        <span
          style={{
            padding: "1px 8px",
            borderRadius: 99,
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-text-muted)",
          }}
        >
          {total}
        </span>
        {/* Active only / All records toggle */}
        <div
          style={{
            display: "flex",
            borderRadius: 99,
            border: "1px solid var(--color-border)",
            overflow: "hidden",
            fontSize: 12,
          }}
        >
          <button
            type="button"
            onClick={() => onToggle(true)}
            style={{
              padding: "3px 12px",
              background: activeOnly ? "var(--color-active-badge)" : "transparent",
              color: activeOnly ? "#fff" : "var(--color-text-muted)",
              border: "none",
              fontWeight: activeOnly ? 600 : 400,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Active only
          </button>
          <button
            type="button"
            onClick={() => onToggle(false)}
            style={{
              padding: "3px 12px",
              background: !activeOnly ? "var(--color-bg-highlight)" : "transparent",
              color: !activeOnly ? "var(--color-primary)" : "var(--color-text-muted)",
              border: "none",
              borderLeft: "1px solid var(--color-border)",
              fontWeight: !activeOnly ? 600 : 400,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            All records
          </button>
        </div>
      </div>
    </div>
  );
}

export function HealthRecordsTab() {
  const client = useSmartClient();
  const patientId = client?.patient?.id ?? undefined;
  const isSmartMode = !!client;

  const { hasResourceScope } = useSmartScopes();
  const goalsSupported = hasResourceScope("Goal");
  const conditionsSupported = hasResourceScope("Condition");
  const medicationsSupported = hasResourceScope("MedicationRequest");

  const [goalActiveOnly, setGoalActiveOnly] = useState(true);
  const [condActiveOnly, setCondActiveOnly] = useState(true);
  const [medActiveOnly, setMedActiveOnly] = useState(true);
  const [fhirVisible, setFhirVisible] = useState<Set<string>>(new Set());

  function toggleFhir(key: string) {
    setFhirVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const { data: goals = [], isLoading: goalsLoading } = useGoals(goalsSupported ? patientId : undefined, goalActiveOnly);
  const { data: conditions = [], isLoading: conditionsLoading } = useConditions(conditionsSupported ? patientId : undefined, condActiveOnly);
  const { data: medications = [], isLoading: medicationsLoading } = useMedications(medicationsSupported ? patientId : undefined, medActiveOnly);

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
    <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 1100 }}>

      {/* Clinical Goals */}
      {goalsSupported && <div
        style={{
          background: "var(--color-bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-light)",
          boxShadow: "var(--shadow-card)",
          overflow: "hidden",
        }}
      >
        <SectionHeader
          title="Goals"
          total={goals.length}
          activeOnly={goalActiveOnly}
          onToggle={setGoalActiveOnly}
        />
        {goalsLoading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
            Loading goals…
          </div>
        ) : goals.length === 0 ? (
          <div style={{ padding: "1.5rem" }}>
            <EmptyState message="No goals found for this patient." />
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Goal</th>
                <th style={{ ...thStyle, whiteSpace: "nowrap" }}>Start Date ↓</th>
                <th style={{ ...thStyle, whiteSpace: "nowrap" }}>Target Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Achievement</th>
                <th style={thStyle}>Expressed By</th>
                <th style={thStyle}>FHIR Data</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g, i) => {
                const key = `goal-${g.id ?? i}`;
                const visible = fhirVisible.has(key);
                return (
                  <>
                    <tr key={key}>
                      <td style={{ ...tdStyle, fontWeight: 500, maxWidth: 320 }}>{goalDescription(g)}</td>
                      <td style={{ ...tdStyle, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{goalStartDate(g)}</td>
                      <td style={{ ...tdStyle, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{goalTargetDate(g)}</td>
                      <td style={tdStyle}><StatusBadge status={goalLifecycleStatus(g)} /></td>
                      <td style={{ ...tdStyle, color: "var(--color-text-muted)" }}>{goalAchievementStatus(g)}</td>
                      <td style={{ ...tdStyle, color: "var(--color-text-muted)" }}>{goalExpressedBy(g)}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <button type="button" onClick={() => toggleFhir(key)} style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)" }}>
                          {visible ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>
                    {visible && (
                      <tr key={`${key}-fhir`}>
                        <td colSpan={7} style={{ padding: "0.5rem 1rem 1rem", background: "#fafafa" }}>
                          <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 400, overflow: "auto", background: "#fff", border: "1px solid var(--color-border)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                            {JSON.stringify(g, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>}

      {/* Conditions */}
      {conditionsSupported && <div
        style={{
          background: "var(--color-bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-light)",
          boxShadow: "var(--shadow-card)",
          overflow: "hidden",
        }}
      >
        <SectionHeader
          title="Health Conditions"
          total={conditions.length}
          activeOnly={condActiveOnly}
          onToggle={setCondActiveOnly}
        />
        {conditionsLoading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
            Loading conditions…
          </div>
        ) : conditions.length === 0 ? (
          <div style={{ padding: "1.5rem" }}>
            <EmptyState message="No conditions found for this patient." />
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Condition</th>
                <th style={{ ...thStyle, whiteSpace: "nowrap" }}>Recorded Date ↓</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Recorded By</th>
                <th style={thStyle}>FHIR Data</th>
              </tr>
            </thead>
            <tbody>
              {conditions.map((c, i) => {
                const key = `cond-${c.id ?? i}`;
                const visible = fhirVisible.has(key);
                return (
                  <>
                    <tr key={key}>
                      <td style={tdStyle}>{conditionName(c)}</td>
                      <td style={{ ...tdStyle, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{conditionDate(c)}</td>
                      <td style={tdStyle}><StatusBadge status={conditionClinicalStatus(c)} /></td>
                      <td style={{ ...tdStyle, color: "var(--color-text-muted)" }}>{conditionRecordedBy(c)}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <button type="button" onClick={() => toggleFhir(key)} style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)" }}>
                          {visible ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>
                    {visible && (
                      <tr key={`${key}-fhir`}>
                        <td colSpan={5} style={{ padding: "0.5rem 1rem 1rem", background: "#fafafa" }}>
                          <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 400, overflow: "auto", background: "#fff", border: "1px solid var(--color-border)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                            {JSON.stringify(c, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>}

      {/* Medications */}
      {medicationsSupported && <div
        style={{
          background: "var(--color-bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-light)",
          boxShadow: "var(--shadow-card)",
          overflow: "hidden",
        }}
      >
        <SectionHeader
          title="Medications"
          total={medications.length}
          activeOnly={medActiveOnly}
          onToggle={setMedActiveOnly}
        />
        {medicationsLoading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
            Loading medications…
          </div>
        ) : medications.length === 0 ? (
          <div style={{ padding: "1.5rem" }}>
            <EmptyState message="No medications found for this patient." />
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Medication</th>
                <th style={thStyle}>Sig (Dose / Route / Frequency)</th>
                <th style={{ ...thStyle, whiteSpace: "nowrap" }}>Started ↓</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Indication</th>
                <th style={thStyle}>Prescriber</th>
                <th style={thStyle}>FHIR Data</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((m, i) => {
                const key = `med-${m.id ?? i}`;
                const visible = fhirVisible.has(key);
                return (
                  <>
                    <tr key={key}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{medName(m)}</td>
                      <td style={{ ...tdStyle, color: "var(--color-text-muted)", fontSize: 12, fontFamily: "monospace" }}>{medSig(m)}</td>
                      <td style={{ ...tdStyle, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{medStarted(m)}</td>
                      <td style={tdStyle}><StatusBadge status={medStatus(m)} /></td>
                      <td style={{ ...tdStyle, color: "var(--color-text-muted)" }}>{medIndication(m)}</td>
                      <td style={{ ...tdStyle, color: "var(--color-text-muted)" }}>{medPrescriber(m)}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <button type="button" onClick={() => toggleFhir(key)} style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", color: "var(--color-text-muted)" }}>
                          {visible ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>
                    {visible && (
                      <tr key={`${key}-fhir`}>
                        <td colSpan={7} style={{ padding: "0.5rem 1rem 1rem", background: "#fafafa" }}>
                          <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 400, overflow: "auto", background: "#fff", border: "1px solid var(--color-border)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                            {JSON.stringify(m, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>}
    </div>
  );
}
