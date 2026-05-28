import type { fhirR4 } from "@smile-cdr/fhirts";
import { useQuery } from "@tanstack/react-query";
import { fhirRequest } from "../lib/fhirRequest";
import { useSmartClient } from "./useSmartClient";

// PCO IG FHIR systems (temporary codes pending official LOINC assignment)
const PHI_CATEGORY_SYSTEM = "http://hl7.org/fhir/us/pco/CodeSystem/pco-concepts-temporary";
const PHI_CATEGORY_CODE = "what-matters";
const WHAT_MATTERS_COMPONENT_SYSTEM =
  "http://hl7.org/fhir/us/pco/CodeSystem/what-matters-concepts-temporary";

export interface PhiAreaScore {
  /** PHI area code from personal-health-inventory-temporary, e.g. "body", "nourishment" */
  code: string;
  /** Human-readable display name from the observation coding */
  display: string;
  /** Current (now) rating — 1–5 scale */
  nowRating: number | undefined;
  /** Future (goal) rating — 1–5 scale */
  futureRating: number | undefined;
}

export interface PhiAssessment {
  /** ISO date string YYYY-MM-DD (derived from effectiveDateTime) */
  date: string;
  areas: PhiAreaScore[];
  /** Mean of all nowRating values for this assessment date */
  overall: number | undefined;
}

interface FhirSearchBundle {
  resourceType: "Bundle";
  entry?: Array<{ resource?: fhirR4.Observation }>;
}

function componentValue(
  obs: fhirR4.Observation,
  componentCode: string,
): number | undefined {
  const comp = obs.component?.find((c) =>
    c.code?.coding?.some(
      (cd) => cd.system === WHAT_MATTERS_COMPONENT_SYSTEM && cd.code === componentCode,
    ),
  );
  return comp?.valueInteger ?? comp?.valueQuantity?.value;
}

function toPhiAreaScore(obs: fhirR4.Observation): PhiAreaScore {
  const coding = obs.code?.coding?.[0];
  return {
    code: coding?.code ?? "",
    display: coding?.display ?? coding?.code ?? "Unknown area",
    nowRating: componentValue(obs, "now-rating"),
    futureRating: componentValue(obs, "future-rating"),
  };
}

/** Groups a flat list of PHI observations by assessment date (effectiveDateTime date). */
function groupByDate(observations: fhirR4.Observation[]): PhiAssessment[] {
  const byDate = new Map<string, PhiAreaScore[]>();

  for (const obs of observations) {
    const date = String(obs.effectiveDateTime ?? obs.issued ?? "").slice(0, 10);
    if (!date) continue;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(toPhiAreaScore(obs));
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // most recent first
    .map(([date, areas]) => {
      const scores = areas.map((a) => a.nowRating).filter((v): v is number => v !== undefined);
      const overall = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
      return { date, areas, overall };
    });
}

/**
 * Fetches PHI (Personal Health Inventory) "What Matters" assessments for a patient.
 * Each PHI area is a separate Observation following the PCO FHIR IG
 * pco-what-matters-assessment profile.
 */
export function usePhiObservations(patientId: string | undefined) {
  const client = useSmartClient();
  return useQuery({
    queryKey: ["phiObservations", patientId],
    enabled: !!client && !!patientId,
    queryFn: async (): Promise<PhiAssessment[]> => {
      const bundle = await fhirRequest<FhirSearchBundle>(
        client!,
        `Observation?patient=${patientId}&category=${PHI_CATEGORY_SYSTEM}|${PHI_CATEGORY_CODE}&_sort=-date`,
      );
      const observations = (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is fhirR4.Observation => !!r);
      return groupByDate(observations);
    },
    staleTime: 5 * 60 * 1000,
  });
}
