/** Colored horizontal progress bar for importance / confidence scores (0–10). */

interface ScoreBarProps {
  label: string;
  value: number;
}

function barColor(value: number): string {
  if (value >= 8) return "#3d9a50";
  if (value >= 6) return "#8bc34a";
  if (value >= 4) return "#d4820a";
  return "#d04040";
}

export function ScoreBar({ label, value }: ScoreBarProps) {
  const pct = Math.max(0, Math.min(10, value)) * 10;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: 12,
        color: "var(--color-text-muted)",
      }}
    >
      <span style={{ width: 80, flexShrink: 0 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "var(--color-border)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: barColor(value),
            borderRadius: 99,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span style={{ width: 14, textAlign: "right", fontWeight: 600, color: "var(--color-text)" }}>
        {value}
      </span>
    </div>
  );
}
