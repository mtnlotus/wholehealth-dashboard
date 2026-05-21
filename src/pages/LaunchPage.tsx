import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { smartBackendLaunch } from "../auth/smartBackendLaunch";
import { smartLaunch } from "../auth/smartLaunch";
import { authFlowForIss } from "../config/fhirServers";
import { useAppStore } from "../store/appStore";

export function LaunchPage() {
  const setSmartClient = useAppStore((s) => s.setSmartClient);
  const setLaunchMode = useAppStore((s) => s.setLaunchMode);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const iss = params.get("iss") ?? import.meta.env.VITE_FHIR_ISS ?? "";

    if (authFlowForIss(iss, "practitioner") === "code") {
      // Authorization Code flow — fhirclient reads iss/launch from the URL and
      // redirects to the EHR; CallbackPage handles the rest.
      smartLaunch(undefined, "practitioner").catch((err: unknown) => setError(String(err)));
      return;
    }

    // Client Credentials (SMART Backend Services) — token exchange happens
    // in-page; no EHR redirect needed.
    if (!iss) {
      setError("Missing iss parameter in launch URL.");
      return;
    }
    const patientIdHint = params.get("patient") ?? undefined;
    smartBackendLaunch(iss, patientIdHint, "practitioner")
      .then((client) => {
        setSmartClient(client);
        setLaunchMode("smart");
        navigate("/app");
      })
      .catch((err: unknown) => setError(String(err)));
  }, [navigate, setSmartClient, setLaunchMode]);

  if (error) return <div style={{ color: "red", padding: "2rem" }}>Launch error: {error}</div>;
  return <div>Launching SMART on FHIR session…</div>;
}
