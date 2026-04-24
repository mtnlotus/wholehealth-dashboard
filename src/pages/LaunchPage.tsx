import { useEffect } from "react";
import { smartLaunch } from "../auth/smartLaunch";

export function LaunchPage() {
  useEffect(() => {
    smartLaunch().catch(console.error);
  }, []);
  return <div>Launching SMART on FHIR session…</div>;
}
