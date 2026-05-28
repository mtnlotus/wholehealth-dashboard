import type { fhirR4 } from "@smile-cdr/fhirts";
import {
  NoteParser,
  buildBundle,
  buildBundleFromNotes,
  mergeNotes,
  rawNoteToPhpData,
  sortNotes,
} from "coach-notes";
import type { PhpData } from "coach-notes";

export interface ParsedNoteResult {
  phpData: PhpData;
  fhirBundle: fhirR4.Bundle;
}

export function processNotes(
  paragraphSets: string[][],
  sessionDate?: string,
  noteDates?: (string | undefined)[],
): ParsedNoteResult {
  const rawNotes = paragraphSets.map((paras, i) => {
    const note = new NoteParser(paras).parse();
    // Per-note date from DocRef metadata takes priority over date parsed from note body
    const externalDate = noteDates?.[i];
    if (externalDate) note.session_date = externalDate;
    return note;
  });
  const sorted = sortNotes(rawNotes);
  const phpNotes = sorted.map(rawNoteToPhpData);
  const phpData = mergeNotes(sorted);
  const fhirBundle = buildBundleFromNotes(phpNotes, sessionDate) as fhirR4.Bundle;

  // Backfill start_date on merged goals from the per-note data.
  // sorted is oldest-first, so the first note a goal appears in is its start date —
  // matching the logic buildBundleFromNotes uses for Goal.startDate.
  const goalFirstDate = new Map<string, string>();
  for (const note of phpNotes) {
    const noteDate = note.session_date ?? note.wbs?.session_date;
    if (!noteDate) continue;
    for (const goal of note.goals) {
      const key = goal.text.slice(0, 60);
      if (!goalFirstDate.has(key)) goalFirstDate.set(key, noteDate);
    }
  }
  phpData.goals = phpData.goals.map((goal) => {
    if (goal.start_date) return goal; // already set (e.g. from FHIR source)
    const key = goal.text.slice(0, 60);
    const startDate = goalFirstDate.get(key);
    return startDate ? { ...goal, start_date: startDate } : goal;
  });

  return { phpData, fhirBundle };
}

export function processSingleNote(paragraphs: string[], sessionDate?: string): ParsedNoteResult {
  const rawNote = new NoteParser(paragraphs).parse();
  const phpData = rawNoteToPhpData(rawNote);
  const fhirBundle = buildBundle(phpData, sessionDate) as fhirR4.Bundle;
  return { phpData, fhirBundle };
}
