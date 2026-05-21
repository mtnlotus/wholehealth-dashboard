import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { smartCallback } from "../auth/smartCallback";
import { useAppStore } from "../store/appStore";
import type { LaunchMode } from "../store/appStore";

export function CallbackPage() {
  const setSmartClient = useAppStore((s) => s.setSmartClient);
  const setLaunchMode = useAppStore((s) => s.setLaunchMode);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    smartCallback()
      .then((client) => {
        setSmartClient(client);
        // Standalone patient launch stores the iss in sessionStorage without a
        // launch token — detect by absence of the "launch" param in the stored state.
        const state = sessionStorage.getItem("SMART_KEY");
        let mode: LaunchMode = "smart";
        try {
          const parsed = state ? JSON.parse(state) : null;
          if (parsed && !parsed.launch) mode = "patient";
        } catch {
          /* ignore */
        }
        setLaunchMode(mode);
        navigate("/app");
      })
      .catch((err: unknown) => setError(String(err)));
  }, [navigate, setSmartClient, setLaunchMode]);

  if (error) return <div style={{ color: "red", padding: "2rem" }}>Launch error: {error}</div>;
  return <div>Completing SMART authorization…</div>;
}
