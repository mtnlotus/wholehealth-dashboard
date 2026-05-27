import type { fhirR4 } from "@smile-cdr/fhirts";
import { useEffect, useRef, useState } from "react";
import { QRCodeDisplay } from "../../components/QRCodeDisplay";
import { IssuerNotTrustedError, type CreateSHCResponse } from "../../services/shcClient";
import { useCreateSHC } from "../../hooks/useCreateSHC";

// ─── FHIR code constants (must match fhir-builder.ts) ────────────────────────
const SNOMED_SYSTEM = "http://snomed.info/sct";
const WMM_CODE = "247751003"; // Mission/Aspiration/Purpose (What Matters Most)
const WBS_SYSTEM =
  "http://mtnlotus.com/fhir/whole-health-cards/CodeSystem/well-being-signs";
const PCO_READINESS_PROFILE =
  "http://hl7.org/fhir/us/pco/StructureDefinition/pco-readiness-assessment";

// ─── Section definitions ──────────────────────────────────────────────────────
interface SectionDef {
  key: keyof SectionSelections;
  label: string;
  description: string;
  required?: boolean;
}

const SECTIONS: SectionDef[] = [
  {
    key: "patient",
    label: "Patient Information",
    description: "Name, date of birth, and identifiers",
    required: true,
  },
  {
    key: "map",
    label: "Mission, Aspiration & Purpose (MAP)",
    description: "What matters most — your personal why statement",
  },
  {
    key: "wbs",
    label: "Well-Being Signs",
    description: "VA Whole Health well-being assessment scores",
  },
  {
    key: "goals",
    label: "Whole Health Goals",
    description: "Long-term goals and desired outcomes",
  },
  {
    key: "actionSteps",
    label: "Action Steps",
    description: "Short-term commitments and next steps",
  },
  {
    key: "readiness",
    label: "Importance & Confidence",
    description: "Readiness ruler ratings for each goal",
  },
];

interface SectionSelections {
  patient: boolean;
  map: boolean;
  wbs: boolean;
  goals: boolean;
  actionSteps: boolean;
  readiness: boolean;
}

const ALL_SELECTED: SectionSelections = {
  patient: true,
  map: true,
  wbs: true,
  goals: true,
  actionSteps: true,
  readiness: true,
};

// ─── Bundle filter ────────────────────────────────────────────────────────────
function filterBundle(
  bundle: fhirR4.Bundle,
  sel: SectionSelections,
): fhirR4.Bundle {
  const keep = (entry: fhirR4.BundleEntry): boolean => {
    const r = entry.resource;
    if (!r) return false;

    switch (r.resourceType) {
      case "Patient":
        return true; // always included

      case "Goal":
        return sel.goals;

      case "ServiceRequest":
        return sel.actionSteps;

      case "Observation": {
        const obs = r as fhirR4.Observation;

        const isMap = obs.code?.coding?.some(
          (c) => c.system === SNOMED_SYSTEM && c.code === WMM_CODE,
        );
        if (isMap) return sel.map;

        const isWbs = obs.code?.coding?.some((c) => c.system === WBS_SYSTEM);
        if (isWbs) return sel.wbs;

        const isReadiness = obs.meta?.profile?.some((p) =>
          p.includes(PCO_READINESS_PROFILE),
        );
        if (isReadiness) return sel.readiness;

        // Unknown observation — include
        return true;
      }

      default:
        return true;
    }
  };

  return {
    ...bundle,
    entry: bundle.entry?.filter(keep) ?? [],
  };
}

// ─── Download helper ──────────────────────────────────────────────────────────
function downloadSHC(verifiableCredential: string[]): void {
  const blob = new Blob([JSON.stringify({ verifiableCredential }, null, 2)], {
    type: "application/smart-health-card",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "health-card.smart-health-card";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Checkbox row ─────────────────────────────────────────────────────────────
function SectionCheckbox({
  def,
  checked,
  onChange,
}: {
  def: SectionDef;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem",
        padding: "0.625rem 0",
        borderBottom: "1px solid var(--color-border-light)",
        cursor: def.required ? "default" : "pointer",
        userSelect: "none",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={def.required}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, accentColor: "var(--color-active-badge)", flexShrink: 0 }}
      />
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
          {def.label}
          {def.required && (
            <span
              style={{
                marginLeft: "0.4rem",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--color-active-badge)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Required
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
          {def.description}
        </div>
      </div>
    </label>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  fhirBundle: fhirR4.Bundle;
  onClose: () => void;
}

function SHCModal({ fhirBundle, onClose }: ModalProps) {
  const [selections, setSelections] = useState<SectionSelections>(ALL_SELECTED);
  const [shcResult, setShcResult] = useState<CreateSHCResponse | null>(null);
  const { mutate, isPending, error, reset } = useCreateSHC();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function toggle(key: keyof SectionSelections, value: boolean) {
    setSelections((prev) => ({ ...prev, [key]: value }));
    // Reset previous result when selections change
    if (shcResult) {
      setShcResult(null);
      reset();
    }
  }

  function handleGenerate() {
    const filtered = filterBundle(fhirBundle, selections);
    mutate(filtered, {
      onSuccess: (result) => setShcResult(result),
    });
  }

  const selectedCount = Object.values(selections).filter(Boolean).length;

  return (
    // Backdrop
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Generate SMART Health Card"
        style={{
          background: "var(--color-bg-card)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.25rem 1rem",
            borderBottom: "1px solid var(--color-border-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-primary)" }}>
              Generate Health Card
            </h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
              Choose which sections to include in your SMART Health Card
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: "0.25rem",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0 1.25rem" }}>
          <div style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem" }}>
            {SECTIONS.map((def) => (
              <SectionCheckbox
                key={def.key}
                def={def}
                checked={selections[def.key]}
                onChange={(v) => toggle(def.key, v)}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                background:
                  error instanceof IssuerNotTrustedError ? "#fff3cd" : "#fde8e8",
                color:
                  error instanceof IssuerNotTrustedError ? "#856404" : "#c0392b",
                fontSize: 13,
              }}
            >
              {error instanceof IssuerNotTrustedError
                ? "Health card generation is not available for this organization. Contact your administrator."
                : `Error: ${error.message}`}
            </div>
          )}

          {/* Result */}
          {shcResult && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                background: "var(--color-bg-card-warm)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              {shcResult.qrNumeric ? (
                <>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)", textAlign: "center" }}>
                    Scan this QR code with a SMART Health Card reader
                  </p>
                  <QRCodeDisplay value={shcResult.qrNumeric} />
                </>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "#856404",
                    background: "#fff3cd",
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  This health plan is too large for a single QR code. Use{" "}
                  <strong>Download</strong> to save the file.
                </p>
              )}
              <button
                type="button"
                onClick={() => downloadSHC(shcResult.verifiableCredential)}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg-card)",
                  color: "var(--color-text)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ⬇ Download .smart-health-card
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid var(--color-border-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {selectedCount} of {SECTIONS.length} section{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-card)",
                color: "var(--color-text)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: isPending ? "#6aab78" : "var(--color-active-badge)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: isPending ? "wait" : "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s",
              }}
            >
              {isPending ? "Generating…" : shcResult ? "Regenerate" : "Generate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
interface Props {
  fhirBundle: fhirR4.Bundle;
}

export function SHCSelectionModal({ fhirBundle }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.5rem 1rem",
          borderRadius: "var(--radius-md)",
          border: "none",
          background: "var(--color-active-badge)",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 15 }}>🏥</span>
        Generate Health Card
      </button>

      {open && (
        <SHCModal fhirBundle={fhirBundle} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
