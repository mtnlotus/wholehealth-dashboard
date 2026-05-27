import type { TabId } from "../../components/PatientHeader";
import { EmptyState } from "../../components/EmptyState";
import { GaugeArc } from "../../components/GaugeArc";
import { ScoreBar } from "../../components/ScoreBar";
import { useAppStore } from "../../store/appStore";

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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={sectionLabel}>Mission, Aspiration, Purpose (MAP)</div>
              <button
                type="button"
                onClick={() => onTabChange("php")}
                style={{ fontSize: 12, color: "var(--color-accent-blue)", background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 500 }}
              >
                Edit
              </button>
            </div>
            {phpData.map ? (
              <>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "0 0 0.5rem", fontStyle: "italic" }}>
                  What matters most to you in your life right now?
                </p>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{phpData.map}</p>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ ...sectionLabel, color: "var(--color-accent-blue)" }}>
                Long-Term Whole Health Goals
              </div>
              <button
                type="button"
                onClick={() => onTabChange("php")}
                style={{ fontSize: 12, color: "var(--color-accent-blue)", background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 500 }}
              >
                + Add
              </button>
            </div>
            {longTermGoals.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {longTermGoals.map((goal, i) => (
                  <div key={i}>
                    {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--color-border-light)", margin: "0.75rem 0" }} />}
                    <div style={{ fontWeight: 500, fontSize: 14, marginBottom: "0.5rem" }}>{goal.text}</div>
                    {goal.importance !== undefined && (
                      <ScoreBar label="Importance" value={goal.importance} />
                    )}
                    {goal.confidence !== undefined && (
                      <div style={{ marginTop: "0.25rem" }}>
                        <ScoreBar label="Confidence" value={goal.confidence} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No long-term goals recorded." />
            )}
          </div>

          {/* Short-term goals */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={sectionLabel}>Short-Term Goals (Action Steps)</div>
              <button
                type="button"
                onClick={() => onTabChange("php")}
                style={{ fontSize: 12, color: "var(--color-accent-blue)", background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 500 }}
              >
                + Add
              </button>
            </div>
            {shortTermGoals.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {shortTermGoals.map((goal, i) => (
                  <div key={i}>
                    {i > 0 && <hr style={{ border: "none", borderTop: "1px solid var(--color-border-light)", margin: "0.75rem 0" }} />}
                    <div style={{ fontWeight: 500, fontSize: 14, marginBottom: "0.5rem" }}>{goal.text}</div>
                    {goal.importance !== undefined && (
                      <ScoreBar label="Importance" value={goal.importance} />
                    )}
                    {goal.confidence !== undefined && (
                      <div style={{ marginTop: "0.25rem" }}>
                        <ScoreBar label="Confidence" value={goal.confidence} />
                      </div>
                    )}
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
