import { XMLParser } from "fast-xml-parser";
import PizZip from "pizzip";

const WORD_NAMESPACE = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

interface WmlDoc {
  "w:document"?: {
    "w:body"?: {
      "w:p"?: WmlParagraph | WmlParagraph[];
    };
  };
}

interface WmlParagraph {
  "w:r"?: WmlRun | WmlRun[];
}

interface WmlRun {
  "w:t"?: string | { "#text"?: string };
}

function extractRunText(run: WmlRun): string {
  if (!run["w:t"]) return "";
  const t = run["w:t"];
  return typeof t === "string" ? t : (t["#text"] ?? "");
}

function extractParagraphText(para: WmlParagraph): string {
  if (!para["w:r"]) return "";
  const runs = Array.isArray(para["w:r"]) ? para["w:r"] : [para["w:r"]];
  return runs.map(extractRunText).join("");
}

export async function readDocxBuffer(buffer: ArrayBuffer): Promise<string[]> {
  const zip = new PizZip(buffer);
  const xml = zip.file("word/document.xml")?.asText();
  if (!xml) throw new Error("word/document.xml not found in DOCX");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
    textNodeName: "#text",
    trimValues: false,     // preserve leading/trailing spaces inside <w:t> nodes (e.g. xml:space="preserve")
    parseTagValue: false,  // keep all text content as strings; prevents number coercion
    isArray: (name) => name === "w:p" || name === "w:r",
  });

  const doc = parser.parse(xml) as WmlDoc;
  const body = doc["w:document"]?.["w:body"];
  if (!body) return [];

  const paragraphs = body["w:p"] ?? [];
  const paras = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
  return paras.map((p) => extractParagraphText(p).trim());
}

export function readTextContent(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim());
}

/**
 * Extract plain-text lines from Epic's HTML note format.
 * Each <div data-paragraph="N"> maps to one line; text is extracted from
 * nested <span> elements. Falls back to innerText splitting when no
 * data-paragraph divs are found.
 */
export function readHtmlContent(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const paragraphDivs = doc.querySelectorAll("div[data-paragraph]");
  if (paragraphDivs.length > 0) {
    return Array.from(paragraphDivs).map((div) =>
      // Replace non-breaking spaces, collapse whitespace, trim
      (div.textContent ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim(),
    );
  }
  // Fallback: treat each line of innerText as a paragraph
  return (doc.body.innerText ?? doc.body.textContent ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim());
}

export async function readFileInput(file: File): Promise<string[]> {
  if (file.name.endsWith(".docx")) {
    return readDocxBuffer(await file.arrayBuffer());
  }
  return readTextContent(await file.text());
}

export async function readAttachment(
  contentType: string,
  data: ArrayBuffer | string,
): Promise<string[]> {
  if (contentType.includes("wordprocessingml") || contentType.includes("docx")) {
    const buffer =
      typeof data === "string" ? Uint8Array.from(atob(data), (c) => c.charCodeAt(0)).buffer : data;
    return readDocxBuffer(buffer);
  }
  const text = typeof data === "string" ? data : new TextDecoder().decode(data);
  if (contentType.includes("html")) return readHtmlContent(text);
  return readTextContent(text);
}
