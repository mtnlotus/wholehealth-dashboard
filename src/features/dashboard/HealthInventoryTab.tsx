import { EmptyState } from "../../components/EmptyState";
import { usePhiObservations, type PhiAreaScore, type PhiAssessment } from "../../hooks/usePhiObservations";
import { useSmartClient } from "../../hooks/useSmartClient";

// PCO personal-health-inventory-temporary area codes mapped to display + emoji.
// Order follows the VA Whole Health wheel.
interface PhiAreaDef {
  code: string;
  emoji: string;
}

const PHI_AREA_DEFS: PhiAreaDef[] = [
  { code: "body", emoji: "🏃" },
  { code: "surroundings", emoji: "🌿" },
  { code: "personal-development", emoji: "📚" },
  { code: "nourishment", emoji: "🍎" },
  { code: "recharge", emoji: "😴" },
  { code: "family-friends", emoji: "👥" },
  { code: "spirit-soul", emoji: "✨" },
  { code: "mind", emoji: "🧠" },
  { code: "professional-care", emoji: "🩺" },
];

function emojiForCode(code: string): string {
  return PHI_AREA_DEFS.find((d) => d.code === code)?.emoji ?? "⭐";
}

function nowBarColor(score: number): string {
  if (score >= 4) return "#3d9a50";
  if (score >= 3) return "#d4820a";
  return "#d04040";
}

function scoreLabel(score: number): string {
  if (score >= 4) return "Doing well";
  if (score >= 3) return "Getting there";
  return "Exploring";
}

function AreaCard({ area }: { area: PhiAreaScore }) {
  const hasNow = area.nowRating !== undefined;
  const nowPct = hasNow ? (area.nowRating! / 5) * 100 : 0;
  const futurePct =
    area.futureRating !== undefined ? (area.futureRating / 5) * 100 : undefined;

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
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.625rem",
        }}
      >
        <span style={{ fontSize: 20 }}>{emojiForCode(area.code)}</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{area.display}</span>
      </div>

      {hasNow ? (
        <>
          {/* Now rating bar */}
          <div
            style={{
              height: 6,
              background: "var(--color-border)",
              borderRadius: 99,
              overflow: "hidden",
              marginBottom: "0.375rem",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${nowPct}%`,
                background: nowBarColor(area.nowRating!),
                borderRadius: 99,
              }}
            />
          </div>

          {/* Score row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12,
            }}
          >
            <span style={{ color: "var(--color-text-muted)" }}>
              {scoreLabel(area.nowRating!)}
            </span>
            <span style={{ fontWeight: 700, color: "var(--color-text)" }}>
              {area.nowRating}
              <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>/5</span>
            </span>
          </div>

          {/* Future rating indicator */}
          {futurePct !== undefined && (
            <div style={{ marginTop: "0.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  marginBottom: "0.25rem",
                }}
              >
                <span>Goal</span>
                <span style={{ fontWeight: 600 }}>{area.futureRating}/5</span>
              </div>
              <div
                style={{
                  height: 4,
                  background: "var(--color-border)",
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${futurePct}%`,
                    background: "var(--color-accent-blue)",
                    borderRadius: 99,
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          )}
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
      {assessment.areas.map((area) => (
        <AreaCard key={area.code} area={area} />
      ))}
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
      <div
        style={{
          padding: "2rem 1.25rem",
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: 13,
        }}
      >
        Loading Health Inventory…
      </div>
    );
  }

  const latest = assessments?.[0];

  if (!latest || latest.areas.length === 0) {
    return (
      <div style={{ padding: "2rem 1.25rem" }}>
        <EmptyState
          message="No Health Inventory assessments found for this patient."
          detail="PHI assessments are sourced from FHIR Observations (PCO pco-what-matters-assessment profile). No records have been recorded yet."
        />
      </div>
    );
  }

  const formattedDate = new Date(latest.date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ fontSize: 13 }}>
          <span style={{ color: "var(--color-text-muted)" }}>
            VA Personal Health Inventory · Last completed:{" "}
          </span>
          <strong>{formattedDate}</strong>
          {latest.overall !== undefined && (
            <span style={{ color: "var(--color-text-muted)", marginLeft: "0.75rem" }}>
              Overall avg:{" "}
              <strong style={{ color: "var(--color-text)" }}>
                {latest.overall.toFixed(1)}/5
              </strong>
            </span>
          )}
        </div>

        {/* Prior assessment dates */}
        {assessments && assessments.length > 1 && (
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {assessments.slice(1, 4).map((a) => (
              <span
                key={a.date}
                style={{
                  padding: "2px 8px",
                  border: "1px solid var(--color-border)",
                  borderRadius: 99,
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                }}
              >
                {a.date.slice(0, 7)} · {a.overall?.toFixed(1) ?? "—"}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1rem", fontSize: 11, color: "var(--color-text-muted)" }}>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 4,
              borderRadius: 99,
              background: "#3d9a50",
              verticalAlign: "middle",
              marginRight: 4,
            }}
          />
          Now rating
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 4,
              borderRadius: 99,
              background: "var(--color-accent-blue)",
              opacity: 0.6,
              verticalAlign: "middle",
              marginRight: 4,
            }}
          />
          Goal rating
        </span>
      </div>

      <AssessmentGrid assessment={latest} />
    </div>
  );
}
