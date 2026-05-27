import { useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { GaugeArc } from "../../components/GaugeArc";
import { ScoreBar } from "../../components/ScoreBar";
import { SHCSelectionModal } from "../sharing/SHCSelectionModal";
import { useAppStore } from "../../store/appStore";

const card: React.CSSProperties = {
  background: "var(--color-bg-card)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--color-border-light)",
  boxShadow: "var(--shadow-card)",
  overflow: "hidden",
};

const accordionHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0.875rem 1rem",
  cursor: "pointer",
  userSelect: "none",
  background: "none",
  border: "none",
  width: "100%",
  textAlign: "left",
};

const STATUS_COLORS: Record<string, string> = {
  active: "var(--color-active-badge)",
  "on-hold": "#d4820a",
  completed: "var(--color-accent-blue)",
  cancelled: "#6b6b6b",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 99,
        border: `1px solid ${STATUS_COLORS[status] ?? "var(--color-border)"}`,
        color: STATUS_COLORS[status] ?? "var(--color-text-muted)",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
    </span>
  );
}

function AccordionSection({
  title,
  badge,
  children,
  defaultOpen = true,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={card}>
      <button
        type="button"
        style={{
          ...accordionHeader,
          background: open ? "var(--color-bg-highlight)" : "none",
        }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: 15,
            color: open ? "var(--color-primary)" : "var(--color-text)",
          }}
        >
          {title}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {badge}
          <span
            style={{
              fontSize: 14,
              color: open ? "var(--color-primary)" : "var(--color-text-muted)",
              fontWeight: open ? 600 : 400,
            }}
          >
            {open ? "∧" : "∨"}
          </span>
        </div>
      </button>
      {open && (
        <div
          style={{
            padding: "0 1rem 1rem",
            borderTop: "1px solid var(--color-border-light)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function PhpTab() {
  const phpData = useAppStore((s) => s.phpData);
  const fhirBundle = useAppStore((s) => s.fhirBundle);

  if (!phpData) {
    return (
      <div style={{ padding: "2rem 1.25rem" }}>
        <EmptyState
          message="No Personal Health Plan loaded."
          detail="Upload coaching notes or load a FHIR Bundle from the Clinical Notes tab."
        />
      </div>
    );
  }

  const longTermGoals = phpData.goals.filter((g) => g.goal_type === "long-term");
  const shortTermGoals = phpData.goals.filter((g) => g.goal_type === "short-term");
  const activeCount = (goals: typeof longTermGoals) =>
    goals.filter((g) => g.lifecycle_status === "active" || !g.lifecycle_status).length;

  return (
    <div style={{ padding: "1rem 1.25rem", maxWidth: 820, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Personal Health Plan</h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
            {phpData.patient
              ? `${phpData.patient.given.join(" ")} ${phpData.patient.family}`
              : ""}
          </p>
        </div>
        {fhirBundle && <SHCSelectionModal fhirBundle={fhirBundle} />}
      </div>

      {/* MAP */}
      <AccordionSection title="Mission, Aspiration, Purpose (MAP)">
        {phpData.map ? (
          <div style={{ paddingTop: "0.75rem" }}>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", fontStyle: "italic", margin: "0 0 0.75rem" }}>
              What matters most to you in your life right now?
            </p>
            <div
              style={{
                background: "var(--color-bg-card-warm)",
                borderRadius: "var(--radius-md)",
                padding: "0.875rem",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              {phpData.map}
            </div>
          </div>
        ) : (
          <div style={{ paddingTop: "0.75rem" }}>
            <EmptyState message="No MAP recorded." />
          </div>
        )}
      </AccordionSection>

      {/* Long-term goals */}
      <AccordionSection
        title="Long-Term Whole Health Goals"
        badge={
          longTermGoals.length > 0 ? (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {activeCount(longTermGoals)} Active · {longTermGoals.length} Total
            </span>
          ) : undefined
        }
      >
        {longTermGoals.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingTop: "0.75rem" }}>
            {longTermGoals.map((goal, i) => (
              <div
                key={i}
                style={{
                  background: "var(--color-bg-card-warm)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.875rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.5 }}>{goal.text}</div>
                  <StatusBadge status={goal.lifecycle_status ?? "active"} />
                </div>
                {(goal.importance !== undefined || goal.confidence !== undefined) && (
                  <div style={{ display: "flex", gap: "2rem", marginTop: "0.75rem" }}>
                    {goal.importance !== undefined && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                        <GaugeArc value={goal.importance} size={64} />
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Importance</span>
                      </div>
                    )}
                    {goal.confidence !== undefined && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                        <GaugeArc value={goal.confidence} size={64} />
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Confidence</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ paddingTop: "0.75rem" }}>
            <EmptyState message="No long-term goals recorded." />
          </div>
        )}
      </AccordionSection>

      {/* Short-term goals */}
      <AccordionSection
        title="Short-Term Goals (Action Steps)"
        badge={
          shortTermGoals.length > 0 ? (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {activeCount(shortTermGoals)} Active · {shortTermGoals.length} Total
            </span>
          ) : undefined
        }
        defaultOpen={false}
      >
        {shortTermGoals.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingTop: "0.75rem" }}>
            {shortTermGoals.map((goal, i) => (
              <div
                key={i}
                style={{
                  background: "var(--color-bg-card-warm)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.875rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.5 }}>{goal.text}</div>
                  <StatusBadge status={goal.lifecycle_status ?? "active"} />
                </div>
                {goal.importance !== undefined && (
                  <ScoreBar label="Importance" value={goal.importance} />
                )}
                {goal.confidence !== undefined && (
                  <div style={{ marginTop: "0.35rem" }}>
                    <ScoreBar label="Confidence" value={goal.confidence} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ paddingTop: "0.75rem" }}>
            <EmptyState message="No action steps recorded." />
          </div>
        )}
      </AccordionSection>

      {/* Strengths & Values */}
      {phpData.strengths && phpData.strengths.length > 0 && (
        <AccordionSection
          title="Strengths & Values"
          badge={
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {phpData.strengths.length}
            </span>
          }
          defaultOpen={false}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", paddingTop: "0.75rem" }}>
            {phpData.strengths.map((s, i) => (
              <span
                key={i}
                style={{
                  padding: "4px 12px",
                  borderRadius: 99,
                  background: "var(--color-bg-highlight)",
                  fontSize: 13,
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-tag-green-bg)",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* MAP Alignment / Discharge Plan */}
      {phpData.discharge_plan && (
        <AccordionSection title="MAP Alignment" defaultOpen={false}>
          <p style={{ margin: "0.75rem 0 0", fontSize: 13, lineHeight: 1.7 }}>
            {phpData.discharge_plan}
          </p>
        </AccordionSection>
      )}
    </div>
  );
}
