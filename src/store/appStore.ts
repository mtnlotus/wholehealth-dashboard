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
  setLaunchMode: (mode: LaunchMode) => void;
  setSmartClient: (client: Client) => void;
  setPhpData: (data: PhpData) => void;
  setFhirBundle: (bundle: fhirR4.Bundle) => void;
  setStandaloneBundle: (refs: fhirR4.DocumentReference[], cache: Record<string, string>) => void;
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
  setLaunchMode: (mode) => set({ launchMode: mode }),
  setSmartClient: (client) => set({ smartClient: client }),
  setPhpData: (data) => set({ phpData: data }),
  setFhirBundle: (bundle) => set({ fhirBundle: bundle }),
  setStandaloneBundle: (refs, cache) => set({ standaloneDocRefs: refs, binaryCache: cache }),
  clearPlan: () => set({ phpData: null, fhirBundle: null }),
  reset: () =>
    set({
      launchMode: null,
      smartClient: null,
      phpData: null,
      fhirBundle: null,
      standaloneDocRefs: [],
      binaryCache: {},
    }),
}));
