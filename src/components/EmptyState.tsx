interface EmptyStateProps {
  message: string;
  detail?: string;
}

export function EmptyState({ message, detail }: EmptyStateProps) {
  return (
    <div
      style={{
        padding: "2rem 1.5rem",
        background: "var(--color-bg-card-warm)",
        borderRadius: "var(--radius-lg)",
        textAlign: "center",
        color: "var(--color-text-muted)",
        border: "1px solid var(--color-border-light)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500 }}>{message}</div>
      {detail && (
        <div style={{ fontSize: 12, marginTop: "0.4rem", opacity: 0.8 }}>{detail}</div>
      )}
    </div>
  );
}
