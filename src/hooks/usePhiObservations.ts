import type { fhirR4 } from "@smile-cdr/fhirts";
import { useQuery } from "@tanstack/react-query";
import { fhirRequest } from "../lib/fhirRequest";
import { useSmartClient } from "./useSmartClient";

export interface PhiArea {
  code: string;
  display: string;
  score: number;
  label: string; // e.g. "Getting there"
}

export interface PhiAssessment {
  date: string;
  overall: number | undefined;
  areas: PhiArea[];
}

interface FhirSearchBundle {
  resourceType: "Bundle";
  entry?: Array<{ resource?: fhirR4.Observation }>;
}

// VA PHI panel code — Mountain Lotus temporary system pending official LOINC assignment
const PHI_PANEL_CODE = "phi-panel";
const ML_SYSTEM = "https://mtnlotus.com/fhir/CodeSystem/phi";

const SCORE_LABELS: Record<number, string> = {
  1: "Exploring",
  2: "Exploring",
  3: "Getting there",
  4: "Doing well",
  5: "Doing well",
};

function scoreLabel(v: number): string {
  return SCORE_LABELS[Math.round(v)] ?? "Getting there";
}

function toPhiAssessment(obs: fhirR4.Observation): PhiAssessment {
  const date = String(obs.effectiveDateTime ?? obs.issued ?? "").slice(0, 10);
  const areas: PhiArea[] = (obs.component ?? [])
    .map((comp) => {
      const coding = comp.code?.coding?.[0];
      const score = comp.valueQuantity?.value ?? (comp.valueInteger as number | undefined);
      if (!coding || score === undefined) return null;
      return {
        code: coding.code ?? "",
        display: coding.display ?? coding.code ?? "",
        score,
        label: scoreLabel(score),
      };
    })
    .filter((a): a is PhiArea => a !== null);

  const scores = areas.map((a) => a.score);
  const overall =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;

  return { date, overall, areas };
}

export function usePhiObservations(patientId: string | undefined) {
  const client = useSmartClient();
  return useQuery({
    queryKey: ["phiObservations", patientId],
    enabled: !!client && !!patientId,
    queryFn: async (): Promise<PhiAssessment[]> => {
      const bundle = await fhirRequest<FhirSearchBundle>(
        client!,
        `Observation?patient=${patientId}&code=${ML_SYSTEM}|${PHI_PANEL_CODE}&_sort=-date`,
      );
      return (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is fhirR4.Observation => !!r)
        .map(toPhiAssessment)
        .filter((o) => o.date);
    },
    staleTime: 5 * 60 * 1000,
  });
}
