import { useRef } from "react";
import { readFileInput } from "../../lib/docxReaderBrowser";
import { processNotes } from "../../lib/noteProcessingPipeline";
import { useAppStore } from "../../store/appStore";

interface Props {
  onProcessed?: () => void;
}

export function FileUploadFallback({ onProcessed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setPhpData = useAppStore((s) => s.setPhpData);
  const setFhirBundle = useAppStore((s) => s.setFhirBundle);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const paragraphSets = await Promise.all(files.map(readFileInput));
    const today = new Date().toISOString().split("T")[0];
    const { phpData, fhirBundle } = processNotes(paragraphSets, today);

    setPhpData(phpData);
    setFhirBundle(fhirBundle);
    onProcessed?.();
  }

  return (
    <div>
      <label htmlFor="note-upload">
        <strong>Upload session notes</strong> (.docx or .txt, select multiple for multi-session)
      </label>
      <br />
      <input
        id="note-upload"
        ref={inputRef}
        type="file"
        accept=".docx,.txt"
        multiple
        onChange={handleChange}
        style={{ marginTop: "0.5rem" }}
      />
    </div>
  );
}
