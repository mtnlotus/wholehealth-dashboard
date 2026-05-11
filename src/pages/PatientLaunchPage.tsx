import { useState } from "react";
import { smartPatientLaunch } from "../auth/smartPatientLaunch";
import { FHIR_SERVERS } from "../config/fhirServers";

const params = new URLSearchParams(window.location.search);
const DEFAULT_ISS = params.get("iss") ?? import.meta.env.VITE_FHIR_ISS ?? "";

export function PatientLaunchPage() {
  const [iss, setIss] = useState(DEFAULT_ISS);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLaunch() {
    const trimmed = iss.trim();
    if (!trimmed) {
      setError("Please enter a FHIR server URL.");
      return;
    }
    setError(null);
    setLaunching(true);
    try {
      await smartPatientLaunch(trimmed);
    } catch (err) {
      setError(String(err));
      setLaunching(false);
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
      <h1>Whole Health Dashboard</h1>
      <p style={{ color: "#555" }}>
        Sign in with your health system to access your Personal Health Plan.
      </p>

      {FHIR_SERVERS.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Select your health system:</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {FHIR_SERVERS.map((server) => (
              <li key={server.iss} style={{ marginBottom: "0.5rem" }}>
                <button
                  style={{
                    width: "100%",
                    padding: "0.6rem 1rem",
                    textAlign: "left",
                    background: iss === server.iss ? "#e8f0fe" : "#f5f5f5",
                    border: `1px solid ${iss === server.iss ? "#4a7c59" : "#ccc"}`,
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: iss === server.iss ? 600 : 400,
                  }}
                  onClick={() => setIss(server.iss)}
                >
                  {server.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="fhir-iss" style={{ display: "block", fontWeight: 600, marginBottom: "0.3rem" }}>
          FHIR Server URL
        </label>
        <input
          id="fhir-iss"
          type="url"
          value={iss}
          onChange={(e) => setIss(e.target.value)}
          placeholder="https://fhir.example.org/R4"
          style={{ width: "100%", padding: "0.5rem", fontSize: "0.95rem", boxSizing: "border-box" }}
        />
      </div>

      {error && <p style={{ color: "red", margin: "0.5rem 0" }}>{error}</p>}

      <button
        onClick={handleLaunch}
        disabled={launching || !iss.trim()}
        style={{ padding: "0.6rem 1.5rem", fontSize: "1rem" }}
      >
        {launching ? "Redirecting…" : "Sign In"}
      </button>
    </main>
  );
}
