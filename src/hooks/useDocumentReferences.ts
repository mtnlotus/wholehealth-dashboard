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
        .filter((r): r is fhirR4.DocumentReference => !!r);
    },
  });
}
