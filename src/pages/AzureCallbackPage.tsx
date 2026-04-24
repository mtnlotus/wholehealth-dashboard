import { useEffect } from "react";
import { useNavigate } from "react-router";
import { msalInstance } from "../auth/msalConfig";

export function AzureCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    msalInstance
      .handleRedirectPromise()
      .then(() => navigate(-1))
      .catch(console.error);
  }, [navigate]);

  return <div>Completing Azure authorization…</div>;
}
