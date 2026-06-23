import type { fhirR4 } from "@smile-cdr/fhirts";
import type { PhpData } from "coach-notes";
import type Client from "fhirclient/lib/Client";
import { create } from "zustand";

export type LaunchMode = "smart" | "patient" | "standalone" | null;

interface AppState {
  launchMode: LaunchMode;
  smartClient: Client | null;
  phpData: PhpData | null;
  fhirBundle: fhirR4.Bundle | null;
  // DocumentReferences loaded from a sample bundle in standalone mode
  standaloneDocRefs: fhirR4.DocumentReference[];
  // Binary URL → decoded text, populated when loading a sample bundle
  binaryCache: Record<string, string>;
  // DocumentReferences uploaded manually by the user (all launch modes)
  uploadedDocRefs: fhirR4.DocumentReference[];
  // IDs of notes that have already been auto-parsed (persists across tab navigation)
  autoProcessedNoteIds: Set<string>;
  setLaunchMode: (mode: LaunchMode) => void;
  setSmartClient: (client: Client) => void;
  setPhpData: (data: PhpData) => void;
  setFhirBundle: (bundle: fhirR4.Bundle) => void;
  setStandaloneBundle: (refs: fhirR4.DocumentReference[], cache: Record<string, string>) => void;
  addUploadedDocRefs: (refs: fhirR4.DocumentReference[]) => void;
  removeUploadedDocRef: (id: string) => void;
  markNotesAutoProcessed: (ids: string[]) => void;
  selectedNoteIds: Set<string>;
  setSelectedNoteIds: (ids: Set<string>) => void;
  /** Clear only the derived health plan data; preserves session and EHR state. */
  clearPlan: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  launchMode: null,
  smartClient: null,
  phpData: null,
  fhirBundle: null,
  standaloneDocRefs: [],
  binaryCache: {},
  uploadedDocRefs: [],
  autoProcessedNoteIds: new Set(),
  selectedNoteIds: new Set(),
  setSelectedNoteIds: (ids) => set({ selectedNoteIds: ids }),
  setLaunchMode: (mode) => set({ launchMode: mode }),
  setSmartClient: (client) => set({ smartClient: client }),
  setPhpData: (data) => set({ phpData: data }),
  setFhirBundle: (bundle) => set({ fhirBundle: bundle }),
  setStandaloneBundle: (refs, cache) => set({ standaloneDocRefs: refs, binaryCache: cache }),
  addUploadedDocRefs: (refs) =>
    set((s) => ({ uploadedDocRefs: [...s.uploadedDocRefs, ...refs] })),
  removeUploadedDocRef: (id) =>
    set((s) => ({
      uploadedDocRefs: s.uploadedDocRefs.filter((r) => r.id !== id),
      selectedNoteIds: new Set([...s.selectedNoteIds].filter((sid) => sid !== id)),
    })),
  markNotesAutoProcessed: (ids) =>
    set((s) => ({ autoProcessedNoteIds: new Set([...s.autoProcessedNoteIds, ...ids]) })),
  clearPlan: () => set({ phpData: null, fhirBundle: null, selectedNoteIds: new Set() }),
  reset: () =>
    set({
      launchMode: null,
      smartClient: null,
      phpData: null,
      fhirBundle: null,
      standaloneDocRefs: [],
      binaryCache: {},
      uploadedDocRefs: [],
      autoProcessedNoteIds: new Set(),
      selectedNoteIds: new Set(),
    }),
}));
