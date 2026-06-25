import type { fhirR4 } from "@smile-cdr/fhirts";
import { NoteParser } from "coach-notes";
import { readDocxBuffer, readTextContent } from "./docxReaderBrowser";

const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function syntheticId(): string {
  return `uploaded-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Extract session_date from note paragraphs via NoteParser, fallback to today. */
function extractNoteDate(paragraphs: string[]): string {
  try {
    const parsed = new NoteParser(paragraphs).parse();
    if (parsed.session_date) return parsed.session_date; // YYYY-MM-DD
  } catch {
    // Non-fatal — fall through to today
  }
  return new Date().toISOString().slice(0, 10);
}

function makeDocRef(
  id: string,
  filename: string,
  contentType: string,
  data: string,
  noteDate: string, // YYYY-MM-DD
): fhirR4.DocumentReference {
  return {
    resourceType: "DocumentReference",
    id,
    status: "current" as fhirR4.DocumentReference.StatusEnum,
    type: {
      coding: [{ system: "http://loinc.org", code: "96340-5", display: "Integrative medicine Note" }],
      text: "Integrative medicine Note",
    },
    category: [
      {
        coding: [
          {
            system: "http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category",
            code: "clinical-note",
            display: "Clinical Note",
          },
        ],
        text: "Clinical Note",
      },
    ],
    date: `${noteDate}T00:00:00.000Z`,
    description: filename,
    content: [
      {
        attachment: {
          contentType,
          data,
          title: "Health and Wellness Coaching",
          creation: `${noteDate}T00:00:00.000Z`,
        },
      },
    ],
  };
}

async function processFile(file: File): Promise<fhirR4.DocumentReference[]> {
  const id = syntheticId();
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`${file.name}: invalid JSON`);
    }
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error(`${file.name}: JSON is not a FHIR resource`);
    }
    const resourceType = (parsed as { resourceType?: string }).resourceType;

    // FHIR Bundle — extract all DocumentReference entries
    if (resourceType === "Bundle") {
      const bundle = parsed as fhirR4.Bundle;
      const refs = (bundle.entry ?? [])
        .map((e) => e.resource)
        .filter((r): r is fhirR4.DocumentReference => r?.resourceType === "DocumentReference")
        .map((dr) => ({ ...dr, id: dr.id ?? syntheticId() }));
      if (refs.length === 0) throw new Error(`${file.name}: Bundle contains no DocumentReference entries`);
      return refs;
    }

    // Single DocumentReference
    if (resourceType === "DocumentReference") {
      const dr = parsed as fhirR4.DocumentReference;
      return [{ ...dr, id: dr.id ?? id }];
    }

    throw new Error(`${file.name}: JSON resourceType "${resourceType}" is not supported (expected DocumentReference or Bundle)`);
  }

  if (ext === "docx") {
    const buffer = await file.arrayBuffer();
    const paragraphs = await readDocxBuffer(buffer);
    const noteDate = extractNoteDate(paragraphs);
    return [makeDocRef(id, file.name, DOCX_CONTENT_TYPE, toBase64(buffer), noteDate)];
  }

  // Plain text (.txt or anything else)
  const text = await file.text();
  const paragraphs = readTextContent(text);
  const noteDate = extractNoteDate(paragraphs);
  return [makeDocRef(id, file.name, "text/plain", btoa(unescape(encodeURIComponent(text))), noteDate)];
}

export async function filesToDocumentReferences(
  files: FileList | File[],
): Promise<{ refs: fhirR4.DocumentReference[]; errors: string[] }> {
  const results = await Promise.allSettled(Array.from(files).map(processFile));
  const refs: fhirR4.DocumentReference[] = [];
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") refs.push(...r.value);
    else errors.push(String(r.reason));
  }
  return { refs, errors };
}
