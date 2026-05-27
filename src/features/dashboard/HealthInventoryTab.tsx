import { EmptyState } from "../../components/EmptyState";
import { usePhiObservations, type PhiAssessment } from "../../hooks/usePhiObservations";
import { useSmartClient } from "../../hooks/useSmartClient";

interface PhiAreaDef {
  code: string;
  display: string;
  emoji: string;
}

const PHI_AREAS: PhiAreaDef[] = [
  { code: "moving-the-body", display: "Moving the Body", emoji: "🏃" },
  { code: "surroundings", display: "Surroundings", emoji: "🌿" },
  { code: "personal-development", display: "Personal Development", emoji: "📚" },
  { code: "food-and-drink", display: "Food & Drink", emoji: "🍎" },
  { code: "recharge", display: "Recharge", emoji: "😴" },
  { code: "family-friends-coworkers", display: "Family, Friends & Co-Workers", emoji: "👥" },
  { code: "spirit-and-soul", display: "Spirit & Soul", emoji: "✨" },
  { code: "power-of-the-mind", display: "Power of the Mind", emoji: "🧠" },
  { code: "professional-care", display: "Professional Care", emoji: "🩺" },
];

function barColor(score: number): string {
  if (score >= 4) return "#3d9a50";
  if (score >= 3) return "#d4820a";
  return "#d04040";
}

function scoreLabel(score: number): string {
  if (score >= 4) return "Doing well";
  if (score >= 3) return "Getting there";
  return "Exploring";
}

function AreaCard({
  def,
  score,
}: {
  def: PhiAreaDef;
  score: number | undefined;
}) {
  const hasScore = score !== undefined;
  const pct = hasScore ? (score / 5) * 100 : 0;

  return (
    <div
      style={{
        background: "var(--color-bg-card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-light)",
        padding: "0.875rem",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
        <span style={{ fontSize: 20 }}>{def.emoji}</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{def.display}</span>
      </div>
      {hasScore ? (
        <>
          <div
            style={{
              height: 6,
              background: "var(--color-border)",
              borderRadius: 99,
              overflow: "hidden",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: barColor(score),
                borderRadius: 99,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "var(--color-text-muted)" }}>{scoreLabel(score)}</span>
            <span style={{ fontWeight: 700, color: "var(--color-text)" }}>
              {score}<span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>/5</span>
            </span>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontStyle: "italic" }}>
          Not assessed
        </div>
      )}
    </div>
  );
}

function AssessmentGrid({ assessment }: { assessment: PhiAssessment }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "0.75rem",
      }}
    >
      {PHI_AREAS.map((def) => {
        const area = assessment.areas.find((a) => a.code === def.code);
        return <AreaCard key={def.code} def={def} score={area?.score} />;
      })}
    </div>
  );
}

export function HealthInventoryTab() {
  const client = useSmartClient();
  const patientId = client?.patient?.id ?? undefined;
  const isSmartMode = !!client;

  const { data: assessments, isLoading } = usePhiObservations(patientId);

  if (!isSmartMode) {
    return (
      <div style={{ padding: "2rem 1.25rem" }}>
        <EmptyState
          message="Health Inventory requires a live EHR connection."
          detail="Launch this app via a SMART on FHIR link from your EHR to view PHI assessment data."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: "2rem 1.25rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
        Loading Health Inventory…
      </div>
    );
  }

  const latest = assessments?.[0];

  if (!latest) {
    return (
      <div style={{ padding: "2rem 1.25rem" }}>
        <EmptyState
          message="No Health Inventory assessments found for this patient."
          detail="PHI assessment data is sourced from FHIR Observations. No records have been recorded yet."
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Summary bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            VA Personal Health Inventory · Last completed:{" "}
          </span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {new Date(latest.date + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {latest.overall !== undefined && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: "0.75rem" }}>
              Overall avg: <strong>{latest.overall.toFixed(1)}/5</strong>
            </span>
          )}
        </div>
        {assessments && assessments.length > 1 && (
          <div style={{ display: "flex", gap: "0.5rem", fontSize: 12, color: "var(--color-text-muted)" }}>
            {assessments.slice(1, 4).map((a) => (
              <span key={a.date} style={{ padding: "2px 8px", border: "1px solid var(--color-border)", borderRadius: 99 }}>
                {a.date.slice(0, 7)} · {a.overall?.toFixed(1) ?? "—"}
              </span>
            ))}
          </div>
        )}
      </div>

      <AssessmentGrid assessment={latest} />
    </div>
  );
}
