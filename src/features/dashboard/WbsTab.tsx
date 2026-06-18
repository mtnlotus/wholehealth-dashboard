import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { EmptyState } from "../../components/EmptyState";
import { GaugeArc } from "../../components/GaugeArc";
import { useWbsObservations, wbsObservationsFromBundle, type WbsObservation } from "../../hooks/useWbsObservations";
import { useSmartClient } from "../../hooks/useSmartClient";
import { useAppStore } from "../../store/appStore";

const card: React.CSSProperties = {
  background: "var(--color-bg-card)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--color-border-light)",
  boxShadow: "var(--shadow-card)",
  padding: "1rem",
};

const WBS_QUESTIONS = [
  {
    key: "satisfied" as const,
    bold: "Fully satisfied",
    rest: "with how these things are going?",
  },
  {
    key: "involved" as const,
    bold: "Regularly involved",
    rest: "in things that are important to you?",
  },
  {
    key: "functioning" as const,
    bold: "Functioning your best",
    rest: "in the most important things you do?",
  },
];

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function chartWidth(pointCount: number): number {
  if (pointCount <= 3) return 300;
  if (pointCount <= 6) return 420;
  return 560;
}

function ScoreRow({
  value,
  prior,
  bold,
  rest,
  gaugeSize,
  compact,
}: {
  value: number | undefined;
  prior?: number;
  bold: string;
  rest: string;
  gaugeSize: number;
  compact?: boolean;
}) {
  if (value === undefined) return null;
  const delta = prior !== undefined ? value - prior : undefined;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
      <div style={{ flexShrink: 0 }}>
        <GaugeArc value={value} size={gaugeSize} />
      </div>
      <div>
        {compact ? (
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            <strong style={{ color: "var(--color-primary)" }}>{bold}</strong> {rest}
          </span>
        ) : (
          <span style={{ fontSize: 14, lineHeight: 1.4 }}>
            <strong>{bold}</strong> {rest}
          </span>
        )}
        {delta !== undefined && (
          <div style={{ fontSize: 11, color: delta >= 0 ? "var(--color-active-badge)" : "#d04040", marginTop: 2 }}>
            {delta > 0 ? "+" : ""}{delta} from prior
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ obs, prior, isFirst }: { obs: WbsObservation; prior?: WbsObservation; isFirst: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const avg = obs.average?.toFixed(1);

  return (
    <div style={{ borderBottom: "1px solid var(--color-border-light)" }}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          width: "100%",
          padding: "0.75rem 1rem",
          background: isFirst ? "var(--color-bg-highlight)" : "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, width: 110, flexShrink: 0 }}>
          {formatDate(obs.date)}
        </span>
        <div style={{ display: "flex", gap: "1.5rem", flex: 1 }}>
          {obs.satisfied !== undefined && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <GaugeArc value={obs.satisfied} size={52} /> Satisfied
            </span>
          )}
          {obs.involved !== undefined && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <GaugeArc value={obs.involved} size={52} /> Involved
            </span>
          )}
          {obs.functioning !== undefined && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <GaugeArc value={obs.functioning} size={52} /> Functioning
            </span>
          )}
        </div>
        {avg && (
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-primary)" }}>
            {avg} avg
          </span>
        )}
        <span style={{ color: "var(--color-text-muted)", fontSize: 16 }}>
          {expanded ? "∧" : "∨"}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: "0.5rem 1rem 1rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontStyle: "italic", marginBottom: "0.25rem" }}>
            Over the past month, on average how often have you been:
          </div>
          {WBS_QUESTIONS.map((q) => (
            <ScoreRow
              key={q.key}
              value={obs[q.key]}
              prior={prior?.[q.key]}
              bold={q.bold}
              rest={q.rest}
              gaugeSize={56}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Merge two WbsObservation arrays. `primary` is authoritative: on a date
 * collision the primary record wins. Result is sorted most-recent-first.
 */
function mergeObservations(
  primary: WbsObservation[],
  secondary: WbsObservation[],
): WbsObservation[] {
  const primaryDates = new Set(primary.map((o) => o.date));
  const extras = secondary.filter((o) => !primaryDates.has(o.date));
  return [...primary, ...extras].sort((a, b) => b.date.localeCompare(a.date));
}

export function WbsTab() {
  const client = useSmartClient();
  const fhirBundle = useAppStore((s) => s.fhirBundle);
  const patientId = client?.patient?.id ?? undefined;
  const isSmartMode = !!client;

  const { data: fhirWbs, isLoading } = useWbsObservations(patientId);

  const bundleObs = wbsObservationsFromBundle(fhirBundle);

  const observations: WbsObservation[] = isSmartMode
    ? mergeObservations(fhirWbs ?? [], bundleObs)
    : bundleObs;

  const latest = observations[0];
  const prior = observations[1];

  const avgDiff =
    latest?.average !== undefined && prior?.average !== undefined
      ? latest.average - prior.average
      : undefined;

  const chartData = [...observations]
    .reverse()
    .map((o) => ({
      date: formatShortDate(o.date),
      Satisfied: o.satisfied,
      Involved: o.involved,
      Functioning: o.functioning,
    }));

  const showChart = chartData.length >= 2;
  const cWidth = chartWidth(chartData.length);

  if (isLoading) {
    return (
      <div style={{ padding: "2rem 1.25rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
        Loading Well-Being Signs…
      </div>
    );
  }

  if (observations.length === 0) {
    return (
      <div style={{ padding: "2rem 1.25rem" }}>
        <EmptyState
          message="No Well-Being Signs assessments found for this patient."
          detail={
            isSmartMode
              ? "WBS data is sourced from FHIR Observations. No records have been recorded yet."
              : "Upload coaching notes that include WBS scores to see them here."
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Sub-tabs / count */}
      <div style={{ display: "flex", gap: "0.5rem", fontSize: 13 }}>
        <span
          style={{
            padding: "4px 16px",
            borderRadius: 99,
            background: "var(--color-primary)",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          Well-Being Signs
        </span>
        <span style={{ color: "var(--color-text-muted)", display: "flex", alignItems: "center", marginLeft: "0.5rem" }}>
          {observations.length} assessment{observations.length !== 1 ? "s" : ""} recorded
        </span>
      </div>

      {/* Trend chart + Most recent — side by side */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "stretch", flexWrap: "wrap" }}>
        {/* Trend chart */}
        {showChart && (
          <div style={{ ...card, flexShrink: 0, width: cWidth }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-primary)",
                marginBottom: "0.75rem",
              }}
            >
              Trend Over Time
            </div>
            <LineChart width={cWidth - 32} height={240} data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-card)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Satisfied" stroke="#3d6b40" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Involved" stroke="#1a5fa8" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Functioning" stroke="#d4820a" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </div>
        )}

        {/* Most recent assessment */}
        {latest && (
          <div
            style={{
              ...card,
              background: "var(--color-bg-highlight)",
              border: "1px solid var(--color-tag-green-bg)",
              flex: 1,
              minWidth: 260,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.625rem" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Most Recent Assessment</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                  {formatDate(latest.date)}
                </div>
              </div>
              {avgDiff !== undefined && (
                <span style={{ fontWeight: 600, fontSize: 13, color: avgDiff >= 0 ? "var(--color-active-badge)" : "#d04040" }}>
                  {avgDiff >= 0 ? "↑" : "↓"} {Math.abs(avgDiff).toFixed(1)} avg vs prior
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", fontStyle: "italic", marginBottom: "0.875rem" }}>
              Over the past month, on average how often have you been:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {WBS_QUESTIONS.map((q) => (
                <ScoreRow
                  key={q.key}
                  value={latest[q.key]}
                  prior={prior?.[q.key]}
                  bold={q.bold}
                  rest={q.rest}
                  gaugeSize={72}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Assessment history */}
      {observations.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-primary)",
              marginBottom: "0.5rem",
            }}
          >
            Assessment History
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
            {observations.map((obs, i) => (
              <HistoryRow key={obs.date} obs={obs} prior={observations[i + 1]} isFirst={i === 0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
