/** Semi-circular arc gauge for WBS scores (0–10). */

interface GaugeArcProps {
  value: number;
  label?: string;
  size?: number;
}

function arcColor(value: number): string {
  if (value >= 8) return "#3d9a50";
  if (value >= 4) return "#d4820a";
  return "#d04040";
}

export function GaugeArc({ value, label, size = 100 }: GaugeArcProps) {
  const cx = 50;
  const cy = 56;
  const r = 38;
  const sw = 8;

  // Background arc: left → top → right (clockwise in SVG = sweep=1)
  const bgPath = `M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`;

  // Foreground arc: same start, ends at angle corresponding to value
  // angle = (1 - v/10) * π  →  0 at v=10 (full), π at v=0 (empty)
  const clamped = Math.max(0, Math.min(10, value));
  const angle = ((1 - clamped / 10) * Math.PI);
  const fgEndX = cx + r * Math.cos(angle);
  const fgEndY = cy - r * Math.sin(angle);
  const hasFg = clamped > 0;

  return (
    <div style={{ textAlign: "center", width: size }}>
      <svg
        viewBox="0 0 100 65"
        width={size}
        height={size * 0.65}
        aria-label={label ? `${label}: ${value} out of 10` : `${value} out of 10`}
      >
        {/* Track */}
        <path
          d={bgPath}
          fill="none"
          stroke="#d8d2c8"
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {/* Value arc */}
        {hasFg && (
          <path
            d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${fgEndX},${fgEndY}`}
            fill="none"
            stroke={arcColor(clamped)}
            strokeWidth={sw}
            strokeLinecap="round"
          />
        )}
        {/* Value label */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="22"
          fontWeight="700"
          fontFamily="var(--font-family)"
          fill="var(--color-text)"
        >
          {clamped}
        </text>
      </svg>
      {label && (
        <div
          style={{
            fontSize: 12,
            color: "var(--color-text-muted)",
            marginTop: -4,
            fontWeight: 500,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
