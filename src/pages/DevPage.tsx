import { useEffect } from "react";
import { useNavigate } from "react-router";
import { FileUploadFallback } from "../features/notes/FileUploadFallback";
import { SampleBundleLoader } from "../features/notes/SampleBundleLoader";
import { useAppStore } from "../store/appStore";

/**
 * Developer / demo page for standalone testing without a live EHR.
 * Accessible at /dev — not linked from the main UI.
 */
export function DevPage() {
  const setLaunchMode = useAppStore((s) => s.setLaunchMode);
  const navigate = useNavigate();

  useEffect(() => {
    setLaunchMode("standalone");
  }, [setLaunchMode]);

  return (
    <main
      style={{
        padding: "2rem",
        maxWidth: 600,
        margin: "0 auto",
        fontFamily: "var(--font-family)",
      }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: 22 }}>Whole Health Dashboard</h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
          Developer / demo mode — not connected to an EHR
        </p>
      </div>

      <section
        style={{
          background: "var(--color-bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-light)",
          padding: "1.25rem",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ margin: "0 0 0.5rem", fontSize: 15, fontWeight: 600 }}>Upload Coaching Notes</h2>
        <p style={{ margin: "0 0 1rem", fontSize: 13, color: "var(--color-text-muted)" }}>
          Upload coaching session notes (.docx or .txt) to generate a Personal Health Plan.
        </p>
        <FileUploadFallback onProcessed={() => navigate("/app?tab=php")} />
      </section>

      <section
        style={{
          background: "var(--color-bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-light)",
          padding: "1.25rem",
        }}
      >
        <h2 style={{ margin: "0 0 0.5rem", fontSize: 15, fontWeight: 600 }}>Load FHIR Bundle (Test Data)</h2>
        <p style={{ margin: "0 0 1rem", fontSize: 13, color: "var(--color-text-muted)" }}>
          Load a FHIR Bundle JSON to browse DocumentReferences and view decoded content.
        </p>
        <SampleBundleLoader onLoaded={() => navigate("/app?tab=notes")} />
      </section>
    </main>
  );
}
