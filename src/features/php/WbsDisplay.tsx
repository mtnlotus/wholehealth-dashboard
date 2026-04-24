import type { WbsAssessment } from "coach-skills";

interface Props {
  wbs: WbsAssessment;
}

function ScoreBar({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  const pct = (value / 10) * 100;
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <span style={{ display: "inline-block", width: "220px" }}>{label}</span>
      <span
        style={{
          display: "inline-block",
          background: "#4a7c59",
          width: `${pct}%`,
          height: "14px",
          verticalAlign: "middle",
          borderRadius: "3px",
        }}
      />
      <span style={{ marginLeft: "0.5rem" }}>{value}/10</span>
    </div>
  );
}

export function WbsDisplay({ wbs }: Props) {
  return (
    <div>
      <ScoreBar label="Fully satisfied with life" value={wbs.satisfied} />
      <ScoreBar label="Regularly involved in activities" value={wbs.involved} />
      <ScoreBar label="Functioning at my best" value={wbs.functioning} />
      {wbs.average != null && (
        <p>
          <strong>Average: {wbs.average.toFixed(1)}/10</strong>
        </p>
      )}
    </div>
  );
}
