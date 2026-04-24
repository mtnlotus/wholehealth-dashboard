import { useMutation } from "@tanstack/react-query";
import { useMsal } from "@azure/msal-react";
import type { fhirR4 } from "@smile-cdr/fhirts";
import { createSmartHealthCard } from "../services/shcClient";

export function useCreateSHC() {
  const { instance } = useMsal();
  return useMutation({
    mutationFn: async (bundle: fhirR4.Bundle) => {
      const { accessToken } = await instance.acquireTokenSilent({
        scopes: [import.meta.env.VITE_SHC_SCOPE],
      });
      return createSmartHealthCard(bundle, accessToken);
    },
  });
}
