import { useState } from "react";
import { useNavigate } from "react-router";
import { useAppStore } from "../../store/appStore";
import { useDocumentReferences } from "../../hooks/useDocumentReferences";
import { useSmartClient } from "../../hooks/useSmartClient";
import { extractNoteMetadata, fetchNoteContent } from "../../services/documentReferenceHelpers";
import { processNotes } from "../../lib/noteProcessingPipeline";
import { FileUploadFallback } from "./FileUploadFallback";

export function NoteListPage() {
  const client = useSmartClient();
  const patientId = client?.patient?.id ?? undefined;
  const { data: notes, isLoading, error } = useDocumentReferences(patientId);

  const setPhpData = useAppStore((s) => s.setPhpData);
  const setFhirBundle = useAppStore((s) => s.setFhirBundle);
  const launchMode = useAppStore((s) => s.launchMode);
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  function toggleNote(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleParseSelected() {
    if (!client || selectedIds.size === 0) return;
    setParsing(true);
    setParseError(null);
    try {
      const selectedNotes = (notes ?? []).filter((dr) => selectedIds.has(dr.id ?? ""));
      const paragraphSets = await Promise.all(
        selectedNotes.map((dr) => fetchNoteContent(dr, client)),
      );
      const today = new Date().toISOString().split("T")[0];
      const { phpData, fhirBundle } = processNotes(paragraphSets, today);
      setPhpData(phpData);
      setFhirBundle(fhirBundle);
      navigate("/app/php");
    } catch (err) {
      setParseError(String(err));
    } finally {
      setParsing(false);
    }
  }

  function handleUploadProcessed() {
    navigate("/app/php");
  }

  if (isLoading) return <div>Loading clinical notes…</div>;
  if (error) return <div>Error loading notes: {String(error)}</div>;

  const showEhrNotes = launchMode === "smart" && notes && notes.length > 0;
  const showEmpty = launchMode === "smart" && (!notes || notes.length === 0);

  return (
    <div style={{ padding: "1rem", maxWidth: "720px" }}>
      <h2>Clinical Notes</h2>

      {showEhrNotes && (
        <>
          <p>Select coaching session notes to parse into a Personal Health Plan.</p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {notes.map((dr) => {
              const meta = extractNoteMetadata(dr);
              const id = dr.id ?? "";
              const checked = selectedIds.has(id);
              return (
                <li
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid #e0e0e0",
                  }}
                >
                  <input
                    type="checkbox"
                    id={`note-${id}`}
                    checked={checked}
                    onChange={() => toggleNote(id)}
                  />
                  <label htmlFor={`note-${id}`} style={{ flex: 1, cursor: "pointer" }}>
                    <span style={{ fontWeight: checked ? 600 : 400 }}>{meta.title}</span>
                    {meta.date && (
                      <span style={{ marginLeft: "0.75rem", color: "#666", fontSize: "0.875rem" }}>
                        {meta.date}
                      </span>
                    )}
                    <span style={{ marginLeft: "0.75rem", color: "#999", fontSize: "0.8rem" }}>
                      {meta.contentType}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={handleParseSelected}
              disabled={selectedIds.size === 0 || parsing}
            >
              {parsing
                ? "Parsing…"
                : `Parse ${selectedIds.size > 0 ? selectedIds.size : ""} Selected Note${selectedIds.size !== 1 ? "s" : ""}`}
            </button>
            {selectedIds.size === 0 && <span style={{ color: "#666" }}>Select at least one note</span>}
          </div>

          {parseError && <p style={{ color: "red", marginTop: "0.5rem" }}>{parseError}</p>}
        </>
      )}

      {showEmpty && <p>No coaching session notes found for this patient in the EHR.</p>}

      <div style={{ marginTop: "2rem", borderTop: "1px solid #e0e0e0", paddingTop: "1.5rem" }}>
        <h3 style={{ marginTop: 0 }}>Upload Notes Manually</h3>
        <FileUploadFallback onProcessed={handleUploadProcessed} />
      </div>
    </div>
  );
}
