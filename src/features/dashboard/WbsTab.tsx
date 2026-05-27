import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { EmptyState } from "../../components/EmptyState";
import { GaugeArc } from "../../components/GaugeArc";
import { useWbsObservations, type WbsObservation } from "../../hooks/useWbsObservations";
import { useSmartClient } from "../../hooks/useSmartClient";
import { useAppStore } from "../../store/appStore";

const card: React.CSSProperties = {
  background: "var(--color-bg-card)",
  borderRadius: "var(--radius-lg)",
  border: "1px solid var(--color-border-light)",
  boxShadow: "var(--shadow-card)",
  padding: "1rem",
};

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

function HistoryRow({ obs, isFirst }: { obs: WbsObservation; isFirst: boolean }) {
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
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              <GaugeArc value={obs.satisfied} size={36} /> Satisfied
            </span>
          )}
          {obs.involved !== undefined && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              <GaugeArc value={obs.involved} size={36} /> Involved
            </span>
          )}
          {obs.functioning !== undefined && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              <GaugeArc value={obs.functioning} size={36} /> Functioning
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
        <div style={{ padding: "0.75rem 1rem 1rem", display: "flex", gap: "2rem" }}>
          {obs.satisfied !== undefined && (
            <div style={{ textAlign: "center" }}>
              <GaugeArc value={obs.satisfied} label="Satisfied" size={80} />
            </div>
          )}
          {obs.involved !== undefined && (
            <div style={{ textAlign: "center" }}>
              <GaugeArc value={obs.involved} label="Involved" size={80} />
            </div>
          )}
          {obs.functioning !== undefined && (
            <div style={{ textAlign: "center" }}>
              <GaugeArc value={obs.functioning} label="Functioning" size={80} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Build a WbsObservation from phpData.wbs (note-parsed data). */
function wbsFromStore(phpData: ReturnType<typeof useAppStore.getState>["phpData"]): WbsObservation | null {
  if (!phpData?.wbs) return null;
  const { wbs } = phpData;
  return {
    // Use the note's session date when available; fall back to today.
    date: wbs.session_date ?? new Date().toISOString().slice(0, 10),
    satisfied: wbs.satisfied,
    involved: wbs.involved,
    functioning: wbs.functioning,
    average: wbs.average,
  };
}

/**
 * Merge FHIR observations with a note-parsed observation.
 * FHIR is authoritative: if both sources share a date, the FHIR record wins.
 * Result is sorted most-recent first.
 */
function mergeObservations(
  fhirObs: WbsObservation[],
  storeObs: WbsObservation | null,
): WbsObservation[] {
  if (!storeObs) return fhirObs;
  const fhirDates = new Set(fhirObs.map((o) => o.date));
  const merged = fhirDates.has(storeObs.date)
    ? fhirObs
    : [...fhirObs, storeObs];
  return merged.sort((a, b) => b.date.localeCompare(a.date));
}

export function WbsTab() {
  const client = useSmartClient();
  const phpData = useAppStore((s) => s.phpData);
  const patientId = client?.patient?.id ?? undefined;
  const isSmartMode = !!client;

  const { data: fhirWbs, isLoading } = useWbsObservations(patientId);

  // Always merge both sources:
  //   • FHIR observations (EHR queries) — authoritative, wins on date collision
  //   • Note-parsed WBS (phpData.wbs) — from selected clinical notes
  const storeObs = wbsFromStore(phpData);
  const observations: WbsObservation[] = isSmartMode
    ? mergeObservations(fhirWbs ?? [], storeObs)
    : mergeObservations([], storeObs);

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
      {/* Sub-tabs */}
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
          Signs
        </span>
        <span style={{ color: "var(--color-text-muted)", display: "flex", alignItems: "center", marginLeft: "0.5rem" }}>
          {observations.length} assessment{observations.length !== 1 ? "s" : ""} recorded
        </span>
      </div>

      {/* Trend chart (only with 2+ data points) */}
      {chartData.length >= 2 && (
        <div style={card}>
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
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
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
          </ResponsiveContainer>
        </div>
      )}

      {/* Most recent assessment */}
      {latest && (
        <div
          style={{
            ...card,
            background: "var(--color-bg-highlight)",
            border: "1px solid var(--color-tag-green-bg)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
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
          <div style={{ display: "flex", gap: "2rem" }}>
            {latest.satisfied !== undefined && (
              <div style={{ textAlign: "center" }}>
                <GaugeArc value={latest.satisfied} label="Satisfied" size={90} />
                {prior?.satisfied !== undefined && (
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                    {latest.satisfied > prior.satisfied ? "+" : ""}{latest.satisfied - prior.satisfied} from prior
                  </div>
                )}
              </div>
            )}
            {latest.involved !== undefined && (
              <div style={{ textAlign: "center" }}>
                <GaugeArc value={latest.involved} label="Involved" size={90} />
                {prior?.involved !== undefined && (
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                    {latest.involved > prior.involved ? "+" : ""}{latest.involved - prior.involved} from prior
                  </div>
                )}
              </div>
            )}
            {latest.functioning !== undefined && (
              <div style={{ textAlign: "center" }}>
                <GaugeArc value={latest.functioning} label="Functioning" size={90} />
                {prior?.functioning !== undefined && (
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                    {latest.functioning > prior.functioning ? "+" : ""}{latest.functioning - prior.functioning} from prior
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
              <HistoryRow key={obs.date} obs={obs} isFirst={i === 0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
