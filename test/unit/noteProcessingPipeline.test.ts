import { describe, it, expect } from "vitest";
import { processNotes, processSingleNote } from "../../src/lib/noteProcessingPipeline";

const SAMPLE_PARAGRAPHS = [
  "Progress Note: Wellness Coaching Session",
  "Patient: Jane Sample",
  "Session Date: 2025-01-15",
  "What Matters Most: Spending quality time with family",
  "Well-Being Signs Assessment",
  "1. Fully satisfied with life: 7",
  "2. Regularly involved in meaningful activities: 6",
  "3. Functioning at my best: 7",
  "Long-term Goal: Improve overall fitness and energy levels",
  "Importance Ruler: 8",
  "Confidence Ruler: 7",
  "Short-term Goals / Action Steps:",
  "1. Walk 20 minutes three times a week",
];

describe("processSingleNote", () => {
  it("returns PhpData and a FHIR bundle", () => {
    const result = processSingleNote(SAMPLE_PARAGRAPHS, "2025-01-15");
    expect(result.phpData).toBeDefined();
    expect(result.fhirBundle).toBeDefined();
    expect(result.fhirBundle.resourceType).toBe("Bundle");
    expect(result.fhirBundle.entry?.length).toBeGreaterThan(0);
  });
});

describe("processNotes", () => {
  it("merges multiple note sets into a FHIR bundle", () => {
    const result = processNotes([SAMPLE_PARAGRAPHS, SAMPLE_PARAGRAPHS]);
    expect(result.phpData).toBeDefined();
    expect(result.fhirBundle.resourceType).toBe("Bundle");
    expect(result.fhirBundle.entry?.length).toBeGreaterThan(0);
  });
});
