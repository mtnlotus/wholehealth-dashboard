import type { fhirR4 } from "@smile-cdr/fhirts";
import { useQuery } from "@tanstack/react-query";
import { fhirRequest } from "../lib/fhirRequest";
import { useSmartClient } from "./useSmartClient";

export interface WbsObservation {
  date: string;
  satisfied: number | undefined;
  involved: number | undefined;
  functioning: number | undefined;
  average: number | undefined;
}

interface FhirSearchBundle {
  resourceType: "Bundle";
  entry?: Array<{ resource?: fhirR4.Observation }>;
}

// Mountain Lotus WBS code system — must match fhir-builder.ts constants.
export const WBS_SYSTEM = "http://mtnlotus.com/fhir/whole-health-cards/CodeSystem/well-being-signs";
export const WBS_PANEL_CODE = "well-being-signs";

function extractScore(obs: fhirR4.Observation, componentCode: string): number | undefined {
  // Try as a panel with components
  const comp = obs.component?.find((c) =>
    c.code?.coding?.some((cd) => cd.code === componentCode),
  );
  const raw = comp?.valueQuantity?.value ?? (comp?.valueInteger as number | undefined);
  if (raw !== undefined) return raw;
  // Try as a single observation
  if (obs.code?.coding?.some((c) => c.code === componentCode)) {
    return obs.valueQuantity?.value ?? (obs.valueInteger as number | undefined);
  }
  return undefined;
}

export function toWbsObs(obs: fhirR4.Observation): WbsObservation {
  const date = String(obs.effectiveDateTime ?? obs.issued ?? "").slice(0, 10);
  const satisfied = extractScore(obs, "satisfied");
  const involved = extractScore(obs, "involved");
  const functioning = extractScore(obs, "functioning");
  const scores = [satisfied, involved, functioning].filter((v): v is number => v !== undefined);
  const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
  return { date, satisfied, involved, functioning, average };
}

/**
 * Extract all WBS Observations from a FHIR Bundle (e.g. generated from clinical notes).
 * Returns an array sorted most-recent-first, ready to merge with EHR query results.
 */
export function wbsObservationsFromBundle(bundle: fhirR4.Bundle | null): WbsObservation[] {
  if (!bundle?.entry) return [];
  return (bundle.entry ?? [])
    .map((e) => e.resource as fhirR4.Observation)
    .filter(
      (r): r is fhirR4.Observation =>
        !!r &&
        r.resourceType === "Observation" &&
        (r.code?.coding ?? []).some((c) => c.system === WBS_SYSTEM && c.code === WBS_PANEL_CODE),
    )
    .map(toWbsObs)
    .filter((o) => !!o.date)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function useWbsObservations(patientId: string | undefined) {
  const client = useSmartClient();
  return useQuery({
    queryKey: ["wbsObservations", patientId],
    enabled: !!client && !!patientId,
    queryFn: async (): Promise<WbsObservation[]> => {
      const bundle = await fhirRequest<FhirSearchBundle>(
        client!,
        `Observation?patient=${patientId}&category=survey`,
      );
      return (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter(
          (r): r is fhirR4.Observation =>
            !!r &&
            r.resourceType === "Observation" &&
            (r.code?.coding ?? []).some((c) => c.system === WBS_SYSTEM && c.code === WBS_PANEL_CODE),
        )
        .map(toWbsObs)
        .filter((o) => o.date)
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    staleTime: 5 * 60 * 1000,
  });
}
