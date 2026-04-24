import { useEffect } from "react";
import { useNavigate } from "react-router";
import { smartCallback } from "../auth/smartCallback";
import { useAppStore } from "../store/appStore";

export function CallbackPage() {
  const setSmartClient = useAppStore((s) => s.setSmartClient);
  const setLaunchMode = useAppStore((s) => s.setLaunchMode);
  const navigate = useNavigate();

  useEffect(() => {
    smartCallback()
      .then((client) => {
        setSmartClient(client);
        setLaunchMode("smart");
        navigate("/app");
      })
      .catch(console.error);
  }, [navigate, setSmartClient, setLaunchMode]);

  return <div>Completing SMART authorization…</div>;
}
