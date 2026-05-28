/** Colored horizontal progress bar for importance / confidence scores (0–10).
 *  Uses a red→orange→green gradient track; the portion past the value is masked gray.
 */

interface ScoreBarProps {
  label: string;
  value: number;
}

function gradientBar(pct: number): string {
  // Layer 1 (top): transparent up to pct%, then --color-border to hide gradient
  // Layer 2 (bottom): full red→amber→green gradient
  return [
    `linear-gradient(to right, transparent ${pct}%, var(--color-border) ${pct}%)`,
    "linear-gradient(to right, #d04040, #d4820a 50%, #3d9a50)",
  ].join(", ");
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
          borderRadius: 99,
          background: gradientBar(pct),
        }}
      />
      <span style={{ width: 14, textAlign: "right", fontWeight: 600, color: "var(--color-text)" }}>
        {value}
      </span>
    </div>
  );
}

/** Compact fixed-width gradient bar — used in side-by-side readiness rows. */
export function ReadinessBar({ value, width = 120 }: { value: number; width?: number }) {
  const pct = Math.max(0, Math.min(10, value)) * 10;
  return (
    <div
      style={{
        width,
        height: 6,
        borderRadius: 99,
        flexShrink: 0,
        background: gradientBar(pct),
      }}
    />
  );
}
