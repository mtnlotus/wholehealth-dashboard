import type Client from "fhirclient/lib/Client";
import type { fhirR4 } from "@smile-cdr/fhirts";
import { readAttachment, readTextContent } from "../lib/docxReaderBrowser";

export interface NoteMetadata {
  id: string;
  date: string | undefined;
  title: string;
  contentType: string;
  /** Inline base64 data is available without a network fetch */
  hasInlineData: boolean;
}

function toDateString(value: string | Date | undefined): string | undefined {
  if (!value) return undefined;
  const s = typeof value === "string" ? value : value.toISOString();
  return s.slice(0, 10);
}

export function extractNoteMetadata(dr: fhirR4.DocumentReference): NoteMetadata {
  const attachment = dr.content?.[0]?.attachment;
  const date =
    toDateString(dr.date) ?? toDateString(dr.content?.[0]?.attachment?.creation);
  const title =
    attachment?.title ??
    dr.description ??
    (date ? `Note — ${date}` : "Untitled Note");

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
  const attachment = dr.content?.[0]?.attachment;
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
      const buffer = await client.request<ArrayBuffer>(attachment.url);
      return readAttachment(contentType, buffer);
    }
    const text = await client.request<string>(attachment.url);
    return readTextContent(text);
  }

  return [];
}

/** Fetch a Binary resource by URL and return its text content. */
export async function fetchBinaryText(url: string, client: Client): Promise<string> {
  return client.request<string>(url);
}

function isDocx(contentType: string): boolean {
  return (
    contentType.includes("wordprocessingml") ||
    contentType.includes("vnd.openxmlformats") ||
    contentType.endsWith(".docx")
  );
}
