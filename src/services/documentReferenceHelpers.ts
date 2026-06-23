import type { fhirR4 } from "@smile-cdr/fhirts";
import type Client from "fhirclient/lib/Client";
import { readAttachment, readTextContent } from "../lib/docxReaderBrowser";
import { fhirRequest } from "../lib/fhirRequest";

export interface NoteMetadata {
  id: string;
  date: string | undefined;
  title: string;
  contentType: string;
  /** Inline base64 data is available without a network fetch */
  hasInlineData: boolean;
}

const CONTENT_TYPE_PRIORITY = [
  "text/plain",
  "text/html",
  "text/rtf",
  "application/xml",
  "application/pdf",
];

/**
 * Select the best content item from a DocumentReference based on preferred
 * content type order. Falls back to the first item if none match.
 */
export function selectAttachment(dr: fhirR4.DocumentReference): fhirR4.Attachment | undefined {
  const items = dr.content ?? [];
  if (items.length === 0) return undefined;
  for (const preferred of CONTENT_TYPE_PRIORITY) {
    const match = items.find((c) => c.attachment?.contentType?.startsWith(preferred));
    if (match) return match.attachment;
  }
  return items[0].attachment;
}

function toDateString(value: string | Date | undefined): string | undefined {
  if (!value) return undefined;
  const s = typeof value === "string" ? value : value.toISOString();
  return s.slice(0, 10);
}

export function extractNoteMetadata(dr: fhirR4.DocumentReference): NoteMetadata {
  const attachment = selectAttachment(dr);
  const date =
    toDateString(dr.context?.period?.start) ??
    toDateString(dr.date) ??
    toDateString(attachment?.creation);
  const title = attachment?.title ?? dr.description ?? (date ? `Note — ${date}` : "Untitled Note");

  return {
    id: dr.id ?? "",
    date,
    title,
    contentType: attachment?.contentType ?? "text/plain",
    hasInlineData: !!attachment?.data,
  };
}

export async function fetchNoteContent(
  dr: fhirR4.DocumentReference,
  client: Client | null,
  binaryCache?: Record<string, string>,
): Promise<string[]> {
  const attachment = selectAttachment(dr);
  if (!attachment) return [];

  const contentType = attachment.contentType ?? "text/plain";

  // Inline base64 content — decode without a network request
  if (attachment.data) {
    const decoded = atob(attachment.data);
    if (isDocx(contentType)) {
      const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
      return readAttachment(contentType, bytes.buffer);
    }
    return readTextContent(decoded);
  }

  // URL-referenced content — check local cache first, then fetch via FHIR client
  if (attachment.url) {
    const cached = binaryCache?.[attachment.url];
    if (cached !== undefined) return readTextContent(cached);
    if (!client) throw new Error("FHIR client required to fetch URL-referenced content");
    if (isDocx(contentType)) {
      const buffer = await fhirRequest<ArrayBuffer>(client, attachment.url);
      return readAttachment(contentType, buffer);
    }
    const response = await fhirRequest<string | { data?: string }>(client, attachment.url);
    const text = typeof response === "string" ? response : response.data ? atob(response.data) : "";
    return readTextContent(text);
  }

  return [];
}

/**
 * Query for the most recent Encounter for a patient and return a FHIR reference string,
 * e.g. "Encounter/abc123". Returns undefined if none found or query fails.
 * Used to populate DocumentReference.context.encounter before posting, which is required
 * by some EHRs (e.g. Epic).
 */
export async function fetchMostRecentEncounterRef(
  client: Client,
  patientId: string,
): Promise<string | undefined> {
  try {
    const bundle = await fhirRequest<{
      entry?: Array<{ resource?: { resourceType: string; id?: string; period?: { start?: string }; date?: string } }>;
    }>(client, `Encounter?patient=${patientId}`);
    console.log("[fetchMostRecentEncounterRef] bundle:", JSON.stringify(bundle).slice(0, 1000));
    const encounters = (bundle.entry ?? [])
      .map((e) => e.resource)
      .filter((r): r is NonNullable<typeof r> => !!r && r.resourceType === "Encounter");
    encounters.sort((a, b) =>
      String(b.period?.start ?? b.date ?? "").localeCompare(String(a.period?.start ?? a.date ?? "")),
    );
    const enc = encounters[0];
    if (enc?.id) return `Encounter/${enc.id}`;
  } catch {
    // Ignore — posting without encounter context is attempted as fallback
  }
  return undefined;
}

/** Fetch a Binary resource by URL and return its text content. */
export async function fetchBinaryText(url: string, client: Client): Promise<string> {
  const response = await fhirRequest<string | { data?: string }>(client, url);
  if (typeof response === "string") return response;
  if (response.data) return atob(response.data);
  throw new Error("Binary resource has no data");
}

function isDocx(contentType: string): boolean {
  return (
    contentType.includes("wordprocessingml") ||
    contentType.includes("vnd.openxmlformats") ||
    contentType.endsWith(".docx")
  );
}
