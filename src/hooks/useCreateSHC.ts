import type { fhirR4 } from "@smile-cdr/fhirts";
import { useMutation } from "@tanstack/react-query";
import { acquireTokenClientCredentials } from "../auth/clientCredentials";
import { createSmartHealthCard } from "../services/shcClient";

export function useCreateSHC() {
  return useMutation({
    mutationFn: async (bundle: fhirR4.Bundle) => {
      const accessToken = await acquireTokenClientCredentials();
      return createSmartHealthCard(bundle, accessToken);
    },
  });
}
