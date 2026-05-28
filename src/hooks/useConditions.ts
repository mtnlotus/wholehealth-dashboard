import type { fhirR4 } from "@smile-cdr/fhirts";
import { useQuery } from "@tanstack/react-query";
import { fhirRequest } from "../lib/fhirRequest";
import { useSmartClient } from "./useSmartClient";

interface FhirSearchBundle {
  resourceType: "Bundle";
  entry?: Array<{ resource?: fhirR4.Condition }>;
}

export function useConditions(patientId: string | undefined) {
  const client = useSmartClient();
  return useQuery({
    queryKey: ["conditions", patientId],
    enabled: !!client && !!patientId,
    queryFn: async (): Promise<fhirR4.Condition[]> => {
      const bundle = await fhirRequest<FhirSearchBundle>(
        client!,
        `Condition?patient=${patientId}&_sort=-recorded-date`,
      );
      return (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is fhirR4.Condition => !!r);
    },
    staleTime: 5 * 60 * 1000,
  });
}
