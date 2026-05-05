import { create } from "zustand";
import type Client from "fhirclient/lib/Client";
import type { PhpData } from "coach-notes";
import type { fhirR4 } from "@smile-cdr/fhirts";

export type LaunchMode = "smart" | "standalone" | null;

interface AppState {
  launchMode: LaunchMode;
  smartClient: Client | null;
  phpData: PhpData | null;
  fhirBundle: fhirR4.Bundle | null;
  setLaunchMode: (mode: LaunchMode) => void;
  setSmartClient: (client: Client) => void;
  setPhpData: (data: PhpData) => void;
  setFhirBundle: (bundle: fhirR4.Bundle) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  launchMode: null,
  smartClient: null,
  phpData: null,
  fhirBundle: null,
  setLaunchMode: (mode) => set({ launchMode: mode }),
  setSmartClient: (client) => set({ smartClient: client }),
  setPhpData: (data) => set({ phpData: data }),
  setFhirBundle: (bundle) => set({ fhirBundle: bundle }),
  reset: () => set({ launchMode: null, smartClient: null, phpData: null, fhirBundle: null }),
}));
