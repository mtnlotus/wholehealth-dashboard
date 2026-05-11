import { useMutation } from "@tanstack/react-query";
import type { fhirR4 } from "@smile-cdr/fhirts";
import { createSmartHealthCard } from "../services/shcClient";
import { acquireTokenClientCredentials } from "../auth/clientCredentials";

export function useCreateSHC() {
  return useMutation({
    mutationFn: async (bundle: fhirR4.Bundle) => {
      const accessToken = await acquireTokenClientCredentials();
      return createSmartHealthCard(bundle, accessToken);
    },
  });
}
