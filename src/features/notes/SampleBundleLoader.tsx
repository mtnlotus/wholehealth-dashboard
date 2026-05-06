import type { fhirR4 } from "@smile-cdr/fhirts";
import { useAppStore } from "../../store/appStore";

interface Props {
  onLoaded?: () => void;
}

export function SampleBundleLoader({ onLoaded }: Props) {
  const setStandaloneBundle = useAppStore((s) => s.setStandaloneBundle);
  const setLaunchMode = useAppStore((s) => s.setLaunchMode);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const bundle = JSON.parse(text) as fhirR4.Bundle;
    const entries = bundle.entry ?? [];

    const docRefs = entries
      .map((e) => e.resource)
      .filter((r): r is fhirR4.DocumentReference => r?.resourceType === "DocumentReference");

    const binaryCache: Record<string, string> = {};

    // Binary resources — keyed by the full URL used in DocumentReference attachment.url
    for (const entry of entries) {
      const r = entry.resource;
      if (r?.resourceType === "Binary") {
        const binary = r as fhirR4.Binary & { data?: string };
        if (binary.id && binary.data) {
          const docRef = docRefs.find((dr) =>
            dr.content?.some((c) => c.attachment?.url?.endsWith(`/Binary/${binary.id}`)),
          );
          const key = docRef?.content?.[0]?.attachment?.url ?? `Binary/${binary.id}`;
          binaryCache[key] = atob(binary.data);
        }
      }
    }

    // DocumentReferences with embedded inline data — keyed as "embedded:{id}"
    for (const dr of docRefs) {
      const att = dr.content?.[0]?.attachment;
      if (att?.data && !att.url && dr.id) {
        binaryCache[`embedded:${dr.id}`] = atob(att.data);
      }
    }

    setLaunchMode("standalone");
    setStandaloneBundle(docRefs, binaryCache);
    onLoaded?.();
  }

  return (
    <div>
      <label htmlFor="bundle-upload">
        <strong>Load FHIR Bundle</strong> (.json) — lists DocumentReferences with Binary content
      </label>
      <br />
      <input
        id="bundle-upload"
        type="file"
        accept=".json"
        onChange={handleFile}
        style={{ marginTop: "0.5rem" }}
      />
    </div>
  );
}
