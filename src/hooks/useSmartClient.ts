import { useAppStore } from "../store/appStore";

export function useSmartClient() {
  return useAppStore((s) => s.smartClient);
}
