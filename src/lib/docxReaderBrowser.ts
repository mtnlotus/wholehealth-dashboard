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
    isArray: (name) => name === "w:p" || name === "w:r",
  });

  const doc = parser.parse(xml) as WmlDoc;
  const body = doc["w:document"]?.["w:body"];
  if (!body) return [];

  const paragraphs = body["w:p"] ?? [];
  const paras = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
  return paras.map(extractParagraphText);
}

export function readTextContent(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim());
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
  return readTextContent(text);
}
