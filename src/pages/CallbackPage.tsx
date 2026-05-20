import { useEffect } from "react";
import { useNavigate } from "react-router";
import { smartCallback } from "../auth/smartCallback";
import { useAppStore } from "../store/appStore";
import type { LaunchMode } from "../store/appStore";

export function CallbackPage() {
  const setSmartClient = useAppStore((s) => s.setSmartClient);
  const setLaunchMode = useAppStore((s) => s.setLaunchMode);
  const navigate = useNavigate();

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
      .catch(console.error);
  }, [navigate, setSmartClient, setLaunchMode]);

  return <div>Completing SMART authorization…</div>;
}
