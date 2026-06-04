import type { fhirR4 } from "@smile-cdr/fhirts";
import { useQuery } from "@tanstack/react-query";
import { fhirRequest } from "../lib/fhirRequest";
import { useSmartClient } from "./useSmartClient";

interface FhirSearchBundle {
  resourceType: "Bundle";
  entry?: Array<{ resource?: fhirR4.Goal | fhirR4.OperationOutcome }>;
}

export function useGoals(patientId: string | undefined, activeOnly = true) {
  const client = useSmartClient();
  return useQuery({
    queryKey: ["goals", patientId, activeOnly],
    enabled: !!client && !!patientId,
    queryFn: async (): Promise<fhirR4.Goal[]> => {
      const statusParam = activeOnly ? "&lifecycle-status=active,accepted" : "";
      const bundle = await fhirRequest<FhirSearchBundle>(
        client!,
        `Goal?patient=${patientId}${statusParam}`,
      );
      const activeStatuses = new Set<string>(["active", "accepted"]);
      return (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is fhirR4.Goal => r?.resourceType === "Goal")
        .filter((r) => {
          if (!activeOnly) return true;
          return !!r.lifecycleStatus && activeStatuses.has(r.lifecycleStatus);
        })
        .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
    },
    staleTime: 5 * 60 * 1000,
  });
}
