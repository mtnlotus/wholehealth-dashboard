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
      // Prefer the ID token over the access token for shc-services auth.
      // ID tokens are OIDC-signed with published keys and have a standard HTTP iss
      // (e.g. https://fhir.epic.com/interconnect-fhir-oauth/oauth2) that supports
      // JWKS discovery. Access tokens from some EHRs (e.g. Epic) use unpublished keys.
      const idToken = smartClient?.getState("tokenResponse.id_token") as string | undefined;
      const accessToken = smartClient?.getState("tokenResponse.access_token") as
        | string
        | undefined;
      const token = idToken ?? accessToken;

      if (!token) {
        throw new Error(
          "No active EHR session. Launch from an EHR to generate a SMART Health Card.",
        );
      }

      return createSmartHealthCard(bundle, token);
    },
  });
}
