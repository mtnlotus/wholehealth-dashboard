import { useAppStore } from "../../store/appStore";
import { SmartHealthCardPanel } from "./SmartHealthCardPanel";

export function SharingPage() {
  const fhirBundle = useAppStore((s) => s.fhirBundle);

  if (!fhirBundle) return <div>Generate a Personal Health Plan first.</div>;

  return (
    <div>
      <h2>Share Health Records</h2>
      <SmartHealthCardPanel fhirBundle={fhirBundle} />
    </div>
  );
}
