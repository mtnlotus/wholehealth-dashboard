import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readTextContent } from "../../src/lib/docxReaderBrowser";
import { processNotes, processSingleNote } from "../../src/lib/noteProcessingPipeline";

const NOTES_DIR = resolve(__dirname, "../../../coach-skills/clinical-notes/plain-text");

function loadNote(filename: string): string[] {
  const text = readFileSync(resolve(NOTES_DIR, filename), "utf-8");
  return readTextContent(text);
}

describe("note pipeline — real clinical notes", () => {
  const initial = loadNote("Initial Visit.txt");
  const middle = loadNote("Middle Visit.txt");
  const final = loadNote("Final Visit.txt");

  it("parses the initial visit — WBS present, no goals (not yet set)", () => {
    const { phpData, fhirBundle } = processSingleNote(initial);
    expect(phpData.patient).toBeDefined();
    expect(phpData.goals.length).toBe(0); // initial note explicitly states goals not set yet
    expect(phpData.wbs).toBeDefined();
    expect(fhirBundle.resourceType).toBe("Bundle");
    expect(fhirBundle.entry?.length).toBeGreaterThan(0);
  });

  it("parses the middle visit — goals present, no WBS re-assessment", () => {
    const { phpData } = processSingleNote(middle);
    expect(phpData.patient).toBeDefined();
    expect(phpData.goals.length).toBeGreaterThan(0);
    expect(phpData.wbs).toBeUndefined(); // session 5 does not repeat WBS
  });

  it("parses the final visit and marks it as final session", () => {
    const { phpData } = processSingleNote(final);
    expect(phpData.is_final_session).toBe(true);
  });

  it("merges all three visits — most-recent-wins for WBS, goals deduplicated", () => {
    const { phpData, fhirBundle } = processNotes([initial, middle, final]);
    expect(phpData.patient).toBeDefined();
    expect(phpData.wbs).toBeDefined();
    expect(phpData.goals.length).toBeGreaterThan(0);
    expect(phpData.is_final_session).toBe(true);
    expect(fhirBundle.entry?.length).toBeGreaterThan(0);
  });

  it("merged PHP has patient name from notes", () => {
    const { phpData } = processNotes([initial, middle, final]);
    expect(phpData.patient?.family).toBeTruthy();
  });

  it("FHIR bundle contains a Patient resource", () => {
    const { fhirBundle } = processNotes([initial, middle, final]);
    const patient = fhirBundle.entry?.find((e) => e.resource?.resourceType === "Patient");
    expect(patient).toBeDefined();
  });

  it("FHIR bundle contains a Goal resource", () => {
    const { fhirBundle } = processNotes([initial, middle, final]);
    const goal = fhirBundle.entry?.find((e) => e.resource?.resourceType === "Goal");
    expect(goal).toBeDefined();
  });

  it("FHIR bundle contains a WBS Observation", () => {
    const { fhirBundle } = processNotes([initial, middle, final]);
    const obs = fhirBundle.entry?.find(
      (e) =>
        e.resource?.resourceType === "Observation" &&
        (e.resource as { code?: { coding?: Array<{ code?: string }> } }).code?.coding?.some(
          (c) => c.code === "well-being-signs",
        ),
    );
    expect(obs).toBeDefined();
  });
});
