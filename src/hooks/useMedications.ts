import type { fhirR4 } from "@smile-cdr/fhirts";
import { useQuery } from "@tanstack/react-query";
import { fhirRequest } from "../lib/fhirRequest";
import { useSmartClient } from "./useSmartClient";

interface FhirSearchBundle {
  resourceType: "Bundle";
  entry?: Array<{ resource?: fhirR4.MedicationRequest }>;
}

export function useMedications(patientId: string | undefined) {
  const client = useSmartClient();
  return useQuery({
    queryKey: ["medications", patientId],
    enabled: !!client && !!patientId,
    queryFn: async (): Promise<fhirR4.MedicationRequest[]> => {
      const bundle = await fhirRequest<FhirSearchBundle>(
        client!,
        `MedicationRequest?patient=${patientId}&_sort=-authored-on`,
      );
      return (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is fhirR4.MedicationRequest => !!r);
    },
    staleTime: 5 * 60 * 1000,
  });
}
