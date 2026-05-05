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

export function processNotes(paragraphSets: string[][], sessionDate?: string): ParsedNoteResult {
  const rawNotes = paragraphSets.map((paras) => new NoteParser(paras).parse());
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
