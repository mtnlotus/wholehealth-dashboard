import { useQuery } from "@tanstack/react-query";
import type { fhirR4 } from "@smile-cdr/fhirts";
import { useSmartClient } from "./useSmartClient";
import { fhirRequest } from "../lib/fhirRequest";

interface FhirSearchBundle {
  resourceType: "Bundle";
  entry?: Array<{ resource?: fhirR4.DocumentReference }>;
}

export function useDocumentReferences(patientId: string | undefined) {
  const client = useSmartClient();
  return useQuery({
    queryKey: ["documentReferences", patientId],
    enabled: !!client && !!patientId,
    queryFn: async (): Promise<fhirR4.DocumentReference[]> => {
      const bundle = await fhirRequest<FhirSearchBundle>(
        client!,
        `DocumentReference?patient=${patientId}&category=clinical-note&status=current&_sort=-date`,
      );
      return (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is fhirR4.DocumentReference => !!r)
        .filter((r) => r.status === "current" && r.docStatus === "final")
        .sort((a, b) => {
          const dateA = String(a.context?.period?.start ?? a.date ?? "");
          const dateB = String(b.context?.period?.start ?? b.date ?? "");
          return dateB.localeCompare(dateA);
        });
    },
  });
}
