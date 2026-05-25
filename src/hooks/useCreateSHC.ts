import type { fhirR4 } from "@smile-cdr/fhirts";
import { useMutation } from "@tanstack/react-query";
import { useAppStore } from "../store/appStore";
import { createSmartHealthCard } from "../services/shcClient";

export function useCreateSHC() {
  const smartClient = useAppStore((s) => s.smartClient);

  return useMutation({
    mutationFn: async (bundle: fhirR4.Bundle) => {
      // Use the active EHR session token — no Azure client secret needed.
      // shc-services validates this token against the EHR's published JWKS.
      const accessToken = smartClient?.getState("tokenResponse.access_token") as
        | string
        | undefined;
      if (!accessToken) {
        throw new Error(
          "No active EHR session. Launch from an EHR to generate a SMART Health Card.",
        );
      }
      return createSmartHealthCard(bundle, accessToken);
    },
  });
}
