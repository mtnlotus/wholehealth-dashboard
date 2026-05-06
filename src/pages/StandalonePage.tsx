import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAppStore } from "../store/appStore";
import { FileUploadFallback } from "../features/notes/FileUploadFallback";
import { SampleBundleLoader } from "../features/notes/SampleBundleLoader";

export function StandalonePage() {
  const setLaunchMode = useAppStore((s) => s.setLaunchMode);
  const navigate = useNavigate();

  useEffect(() => {
    setLaunchMode("standalone");
  }, [setLaunchMode]);

  function handleProcessed() {
    navigate("/app/php");
  }

  function handleBundleLoaded() {
    navigate("/app");
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Whole Health Dashboard</h1>

      <section>
        <h2 style={{ fontSize: "1.1rem" }}>Upload Coaching Notes</h2>
        <p style={{ color: "#555", marginTop: 0 }}>
          Upload coaching session notes (.docx or .txt) to generate a Personal Health Plan.
        </p>
        <FileUploadFallback onProcessed={handleProcessed} />
      </section>

      <hr style={{ margin: "2rem 0", borderColor: "#e0e0e0" }} />

      <section>
        <h2 style={{ fontSize: "1.1rem" }}>Load FHIR Bundle (Test Data)</h2>
        <p style={{ color: "#555", marginTop: 0 }}>
          Load a FHIR Bundle JSON to browse DocumentReferences and view decoded Binary content.
        </p>
        <SampleBundleLoader onLoaded={handleBundleLoaded} />
      </section>
    </main>
  );
}
