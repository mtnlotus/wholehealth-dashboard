import { usePatient } from "../hooks/usePatient";

export type TabId = "summary" | "php" | "records" | "inventory" | "wbs" | "notes";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "notes", label: "Clinical Notes" },
  { id: "summary", label: "Summary" },
  { id: "php", label: "Personal Health Plan" },
  { id: "records", label: "Health Records" },
  { id: "wbs", label: "Well-Being Signs" },
  { id: "inventory", label: "Health Inventory" },
];

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

function formatDob(dob: string | undefined): string {
  if (!dob) return "";
  try {
    return new Date(dob + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dob;
  }
}

function genderAbbr(gender: string | undefined): string {
  if (!gender) return "";
  return gender.charAt(0).toUpperCase();
}

export function PatientHeader({ activeTab, onTabChange }: Props) {
  const patient = usePatient();
  return (
    <header
      style={{
        background: "var(--color-bg-card)",
        borderBottom: "1px solid var(--color-border)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Patient bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.625rem 1.25rem",
          borderBottom: "1px solid var(--color-border-light)",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "var(--color-primary)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {patient?.initials ?? "?"}
        </div>

        {/* Name + demographics */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
            {patient?.name ?? "Loading…"}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
            {[
              patient?.dob ? `DOB: ${formatDob(patient.dob)}` : null,
              patient?.gender ? genderAbbr(patient.gender) : null,
              patient?.mrn ? `MRN: ${patient.mrn}` : null,
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </div>
        </div>

      </div>

      {/* Tab navigation */}
      <nav
        style={{
          display: "flex",
          gap: 0,
          padding: "0 1.25rem",
          overflowX: "auto",
        }}
        aria-label="Dashboard sections"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: "0.625rem 1rem",
                background: "none",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--color-primary)"
                  : "2px solid transparent",
                color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.15s, border-color 0.15s",
              }}
              aria-selected={isActive}
              role="tab"
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
