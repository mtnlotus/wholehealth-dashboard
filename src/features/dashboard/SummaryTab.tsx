import { useMemo } from "react";
import type { fhirR4 } from "@smile-cdr/fhirts";
import type { Goal } from "coach-notes";
import type { TabId } from "../../components/PatientHeader";
import { EmptyState } from "../../components/EmptyState";
import { GaugeArc } from "../../components/GaugeArc";
import { ReadinessBar } from "../../components/ScoreBar";
import { useAppStore } from "../../store/appStore";

// SNOMED code for "What Matters Most" / MAP observation (must match fhir-builder.ts)
const SNOMED_SYSTEM = "http://snomed.info/sct";
const WHAT_MATTERS_CODE = "247751003";

// ─── Goal date formatting ────────────────────────────────────────────────────
function formatGoalDate(d: string | undefined): string {
  if (!d) return "";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

// ─── Status badge ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { border: string; color: string }> = {
  active:    { border: "var(--color-active-badge)", color: "var(--color-active-badge)" },
  "on-hold": { border: "#d4820a",                   color: "#d4820a" },
  completed: { border: "var(--color-accent-blue)",  color: "var(--color-accent-blue)" },
  cancelled: { border: "var(--color-text-muted)",   color: "var(--color-text-muted)" },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.active;
  return (
    <span
      style={{
        padding: "2px 9px",
        borderRadius: 99,
        border: `1px solid ${c.border}`,
        color: c.color,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
    </span>
  );
}

// ─── Goal row (side-by-side readiness bars + dates) ──────────────────────────
function GoalRow({ goal }: { goal: Goal }) {
  const status = goal.lifecycle_status ?? "active";
  const hasReadiness = goal.importance !== undefined || goal.confidence !== undefined;

  const startLabel = goal.start_date ? `Started ${formatGoalDate(goal.start_date)}` : null;
  const endLabel   = goal.end_date   ? `Target ${formatGoalDate(goal.end_date)}`   : null;
  const dateStr    = [startLabel, endLabel].filter(Boolean).join("  ·  ");

  return (
    <div>
      {/* Goal text */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.4rem" }}>
        <span style={{ color: "var(--color-active-badge)", fontSize: 17, lineHeight: 1.1, flexShrink: 0 }}>◉</span>
        <span style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.5 }}>{goal.text}</span>
      </div>

      {/* Readiness row */}
      {hasReadiness && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            fontSize: 12,
            color: "var(--color-text-muted)",
            flexWrap: "wrap",
            marginLeft: "1.5rem",
          }}
        >
          {goal.importance !== undefined && (
            <>
              <span style={{ flexShrink: 0 }}>Importance</span>
              <ReadinessBar value={goal.importance} />
              <span style={{ fontWeight: 700, color: "var(--color-text)", flexShrink: 0 }}>
                {goal.importance}
              </span>
            </>
          )}
          {goal.confidence !== undefined && (
            <>
              <span style={{ flexShrink: 0 }}>Confidence</span>
              <ReadinessBar value={goal.confidence} />
              <span style={{ fontWeight: 700, color: "var(--color-text)", flexShrink: 0 }}>
                {goal.confidence}
              </span>
            </>
          )}
          <StatusBadge status={status} />
        </div>
      )}

      {/* Dates */}
      {dateStr && (
        <div
          style={{
            marginLeft: "1.5rem",
            marginTop: "0.3rem",
            fontSize: 11,
            color: "var(--color-text-muted)",
          }}
        >
          {dateStr}
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "var(--color-bg-card)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--color-border-light)",
  boxShadow: "var(--shadow-card)",
  padding: "1rem",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "var(--color-primary)",
  textTransform: "uppercase",
  marginBottom: "0.75rem",
};

interface Props {
  onTabChange: (tab: TabId) => void;
}

export function SummaryTab({ onTabChange }: Props) {
  const phpData = useAppStore((s) => s.phpData);
  const fhirBundle = useAppStore((s) => s.fhirBundle);

  // Extract the most recent MAP observation date from the generated FHIR bundle.
  const mapDate = useMemo((): string | undefined => {
    const entries = fhirBundle?.entry ?? [];
    const dates = entries
      .map((e) => e.resource as fhirR4.Observation)
      .filter(
        (r) =>
          r?.resourceType === "Observation" &&
          (r.code?.coding ?? []).some(
            (c) => c.system === SNOMED_SYSTEM && c.code === WHAT_MATTERS_CODE,
          ),
      )
      .map((r) => r.effectiveDateTime?.slice(0, 10))
      .filter((d): d is string => !!d)
      .sort()
      .reverse();
    return dates[0] ?? phpData?.session_date;
  }, [fhirBundle, phpData?.session_date]);

  if (!phpData) {
    return (
      <div style={{ padding: "2rem 1.25rem" }}>
        <EmptyState
          message="No Personal Health Plan loaded."
          detail="Upload coaching notes or load a FHIR Bundle to get started."
        />
      </div>
    );
  }

  const longTermGoals = phpData.goals.filter((g) => g.goal_type === "long-term");
  const shortTermGoals = phpData.goals.filter((g) => g.goal_type === "short-term");
  const wbs = phpData.wbs;

  return (
    <div style={{ padding: "1rem 1.25rem", display: "grid", gap: "1rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1rem" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* MAP */}
          <div style={card}>
            <div style={sectionLabel}>Mission, Aspiration, Purpose (MAP)</div>
            {phpData.map ? (
              <>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "0 0 0.5rem", fontStyle: "italic" }}>
                  What matters most to you in your life right now?
                </p>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{phpData.map}</p>
                {mapDate && (
                  <p style={{ margin: "0.5rem 0 0", fontSize: 11, color: "var(--color-text-muted)" }}>
                    Recorded {formatGoalDate(mapDate)}
                  </p>
                )}
              </>
            ) : (
              <EmptyState message="No MAP recorded." />
            )}
          </div>

          {/* WBS */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={sectionLabel}>Well-Being Signs</div>
              <button
                type="button"
                onClick={() => onTabChange("wbs")}
                style={{ fontSize: 12, color: "var(--color-accent-blue)", background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 500 }}
              >
                History →
              </button>
            </div>
            {wbs ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  {wbs.satisfied !== undefined && (
                    <GaugeArc value={wbs.satisfied} label="Satisfied" size={80} />
                  )}
                  {wbs.involved !== undefined && (
                    <GaugeArc value={wbs.involved} label="Involved" size={80} />
                  )}
                  {wbs.functioning !== undefined && (
                    <GaugeArc value={wbs.functioning} label="Functioning" size={80} />
                  )}
                </div>
                {wbs.session_date && (
                  <p style={{ margin: "0.5rem 0 0", fontSize: 11, color: "var(--color-text-muted)" }}>
                    Recorded {formatGoalDate(wbs.session_date)}
                  </p>
                )}
              </>
            ) : (
              <EmptyState message="No Well-Being Signs recorded." />
            )}
          </div>

          {/* Strengths & Values */}
          {phpData.strengths && phpData.strengths.length > 0 && (
            <div style={card}>
              <div style={sectionLabel}>Strengths & Values</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {phpData.strengths.map((s, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 99,
                      background: "var(--color-bg-highlight)",
                      fontSize: 12,
                      color: "var(--color-primary)",
                      border: "1px solid var(--color-tag-green-bg)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Long-term goals */}
          <div style={{ ...card, border: "1.5px solid var(--color-accent-blue)" }}>
            <div style={{ ...sectionLabel, color: "var(--color-accent-blue)" }}>
              Long-Term Whole Health Goals
            </div>
            {longTermGoals.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {longTermGoals.map((goal, i) => (
                  <div key={i}>
                    {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--color-border-light)", margin: "0.875rem 0 0" }} />}
                    <GoalRow goal={goal} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No long-term goals recorded." />
            )}
          </div>

          {/* Short-term goals */}
          <div style={card}>
            <div style={sectionLabel}>Short-Term Goals (Action Steps)</div>
            {shortTermGoals.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {shortTermGoals.map((goal, i) => (
                  <div key={i}>
                    {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--color-border-light)", margin: "0.875rem 0 0" }} />}
                    <GoalRow goal={goal} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No action steps recorded." />
            )}
          </div>

          {/* MAP Alignment */}
          {phpData.discharge_plan && (
            <div style={{ ...card, background: "var(--color-bg-blue-highlight)", border: "1px solid var(--color-tag-blue-bg)" }}>
              <div style={{ ...sectionLabel, color: "var(--color-accent-blue)" }}>MAP Alignment</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{phpData.discharge_plan}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
