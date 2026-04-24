import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAppStore } from "../store/appStore";
import { FileUploadFallback } from "../features/notes/FileUploadFallback";

export function StandalonePage() {
  const setLaunchMode = useAppStore((s) => s.setLaunchMode);
  const navigate = useNavigate();

  useEffect(() => {
    setLaunchMode("standalone");
  }, [setLaunchMode]);

  function handleProcessed() {
    navigate("/app/php");
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Whole Health Dashboard</h1>
      <p>Upload coaching session notes to generate a Personal Health Plan.</p>
      <FileUploadFallback onProcessed={handleProcessed} />
    </main>
  );
}
