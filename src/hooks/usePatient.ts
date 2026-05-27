import type { fhirR4 } from "@smile-cdr/fhirts";
import { useQuery } from "@tanstack/react-query";
import { fhirRequest } from "../lib/fhirRequest";
import { useAppStore } from "../store/appStore";
import { useSmartClient } from "./useSmartClient";

export interface PatientInfo {
  name: string;
  initials: string;
  dob: string | undefined;
  mrn: string | undefined;
  gender: string | undefined;
}

function toPatientInfo(pt: fhirR4.Patient): PatientInfo {
  const name = pt.name?.[0];
  const given = name?.given?.join(" ") ?? "";
  const family = name?.family ?? "";
  const fullName = [given, family].filter(Boolean).join(" ") || "Unknown Patient";
  const initials = [given[0], family[0]].filter(Boolean).join("").toUpperCase() || "?";

  const mrn = pt.identifier?.find(
    (id) => id.type?.coding?.some((c) => c.code === "MR") || id.use === "official",
  )?.value;

  const dob = pt.birthDate;
  const gender = pt.gender;

  return { name: fullName, initials, dob, mrn, gender };
}

/** Resolves patient info from SMART context (preferred) or parsed phpData fallback. */
export function usePatient(): PatientInfo | null {
  const client = useSmartClient();
  const phpData = useAppStore((s) => s.phpData);
  const patientId = client?.patient?.id ?? undefined;

  const { data: fhirPatient } = useQuery({
    queryKey: ["patient", patientId],
    enabled: !!client && !!patientId,
    queryFn: () => fhirRequest<fhirR4.Patient>(client!, `Patient/${patientId}`),
    staleTime: 5 * 60 * 1000,
  });

  if (fhirPatient) return toPatientInfo(fhirPatient);

  // Standalone fallback from parsed notes
  if (phpData?.patient) {
    const { given, family, birth_date } = phpData.patient;
    const fullName = [...given, family].filter(Boolean).join(" ") || "Unknown Patient";
    const initials = [(given[0] ?? "")[0], (family ?? "")[0]].filter(Boolean).join("").toUpperCase();
    return { name: fullName, initials, dob: birth_date, mrn: undefined, gender: undefined };
  }

  return null;
}
