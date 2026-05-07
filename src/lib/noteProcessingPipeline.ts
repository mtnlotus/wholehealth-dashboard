import {
  NoteParser,
  mergeNotes,
  sortNotes,
  rawNoteToPhpData,
  buildBundle,
  buildBundleFromNotes,
} from "coach-notes";
import type { PhpData } from "coach-notes";
import type { fhirR4 } from "@smile-cdr/fhirts";

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
  return { phpData, fhirBundle };
}

export function processSingleNote(paragraphs: string[], sessionDate?: string): ParsedNoteResult {
  const rawNote = new NoteParser(paragraphs).parse();
  const phpData = rawNoteToPhpData(rawNote);
  const fhirBundle = buildBundle(phpData, sessionDate) as fhirR4.Bundle;
  return { phpData, fhirBundle };
}
