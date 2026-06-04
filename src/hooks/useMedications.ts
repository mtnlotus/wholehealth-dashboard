import type { fhirR4 } from "@smile-cdr/fhirts";
import { useQuery } from "@tanstack/react-query";
import { fhirRequest } from "../lib/fhirRequest";
import { useSmartClient } from "./useSmartClient";

interface FhirSearchBundle {
  resourceType: "Bundle";
  entry?: Array<{ resource?: fhirR4.MedicationRequest | fhirR4.Medication }>;
}

export function useMedications(patientId: string | undefined, activeOnly = true) {
  const client = useSmartClient();
  return useQuery({
    queryKey: ["medications", patientId, activeOnly],
    enabled: !!client && !!patientId,
    queryFn: async (): Promise<fhirR4.MedicationRequest[]> => {
      const statusParam = activeOnly ? "&status=active" : "";
      const bundle = await fhirRequest<FhirSearchBundle>(
        client!,
        `MedicationRequest?patient=${patientId}${statusParam}&_sort=-authored-on&_include=MedicationRequest:medication`,
      );

      // Build a lookup of Medication resources by id (from _include)
      const medicationById = new Map<string, fhirR4.Medication>();
      for (const entry of bundle.entry ?? []) {
        const r = entry.resource;
        if (r?.resourceType === "Medication" && r.id) {
          medicationById.set(r.id, r as fhirR4.Medication);
        }
      }

      return (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is fhirR4.MedicationRequest => r?.resourceType === "MedicationRequest")
        .filter((r) => {
          if (!activeOnly) return true;
          return !!r.status && r.status !== "unknown";
        })
        .map((r) => {
          // If no codeableConcept, resolve the reference display from the included Medication
          if (!r.medicationCodeableConcept && r.medicationReference) {
            const refId = r.medicationReference.reference?.split("/").pop();
            const med = refId ? medicationById.get(refId) : undefined;
            const display =
              med?.code?.text ??
              med?.code?.coding?.[0]?.display ??
              r.medicationReference.display ??
              "Unknown medication";
            return {
              ...r,
              medicationCodeableConcept: { text: display } as fhirR4.CodeableConcept,
            };
          }
          return r;
        })
        .sort((a, b) => String(b.authoredOn ?? "").localeCompare(String(a.authoredOn ?? "")));
    },
    staleTime: 5 * 60 * 1000,
  });
}
