import type { fhirR4 } from "@smile-cdr/fhirts";
import { useQuery } from "@tanstack/react-query";
import { fhirRequest } from "../lib/fhirRequest";
import { useSmartClient } from "./useSmartClient";

interface FhirSearchBundle {
  resourceType: "Bundle";
  entry?: Array<{ resource?: fhirR4.Condition }>;
}

export function useConditions(patientId: string | undefined, activeOnly = true) {
  const client = useSmartClient();
  return useQuery({
    queryKey: ["conditions", patientId, activeOnly],
    enabled: !!client && !!patientId,
    queryFn: async (): Promise<fhirR4.Condition[]> => {
      const statusParam = activeOnly ? "&clinical-status=active" : "";
      const bundle = await fhirRequest<FhirSearchBundle>(
        client!,
        `Condition?patient=${patientId}${statusParam}&category=problem-list-item&_sort=-recorded-date`,
      );
      return (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is fhirR4.Condition => !!r)
        .filter((r) => {
          if (!activeOnly) return true;
          const status = r.clinicalStatus?.coding?.[0]?.code;
          return !!status && status !== "unknown";
        })
        .sort((a, b) => {
          const da = String(a.recordedDate ?? a.onsetDateTime ?? "");
          const db = String(b.recordedDate ?? b.onsetDateTime ?? "");
          return db.localeCompare(da);
        });
    },
    staleTime: 5 * 60 * 1000,
  });
}
