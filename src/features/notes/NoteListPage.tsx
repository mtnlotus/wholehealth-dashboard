import { useState } from "react";
import { useNavigate } from "react-router";
import type { fhirR4 } from "@smile-cdr/fhirts";
import { useAppStore } from "../../store/appStore";
import { useDocumentReferences } from "../../hooks/useDocumentReferences";
import { useSmartClient } from "../../hooks/useSmartClient";
import { useBinaryContent } from "../../hooks/useBinaryContent";
import { extractNoteMetadata, fetchNoteContent, selectAttachment } from "../../services/documentReferenceHelpers";
import { processNotes } from "../../lib/noteProcessingPipeline";
import { fhirRequest } from "../../lib/fhirRequest";
import { FileUploadFallback } from "./FileUploadFallback";
import { SampleBundleLoader } from "./SampleBundleLoader";

export function NoteListPage() {
  const client = useSmartClient();
  const patientId = client?.patient?.id ?? undefined;
  const { data: ehrNotes, isLoading, error } = useDocumentReferences(patientId);

  const setPhpData = useAppStore((s) => s.setPhpData);
  const setFhirBundle = useAppStore((s) => s.setFhirBundle);
  const launchMode = useAppStore((s) => s.launchMode);
  const standaloneDocRefs = useAppStore((s) => s.standaloneDocRefs);
  const binaryCache = useAppStore((s) => s.binaryCache);
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const binary = useBinaryContent();

  // Determine which list of notes to show
  const isSmartMode = launchMode === "smart" || launchMode === "patient";
  const notes: fhirR4.DocumentReference[] = isSmartMode
    ? (ehrNotes ?? [])
    : standaloneDocRefs;

  function toggleNote(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleParseSelected() {
    if (selectedIds.size === 0) return;
    setParsing(true);
    setParseError(null);
    try {
      const selectedNotes = notes.filter((dr) => selectedIds.has(dr.id ?? ""));
      const paragraphSets = await Promise.all(
        selectedNotes.map((dr) => fetchNoteContent(dr, client, binaryCache)),
      );
      // Extract YYYY-MM-DD date from each DocRef — context.period.start is preferred,
      // falling back to dr.date then attachment.creation
      const noteDates = selectedNotes.map((dr) => {
        const raw = dr.context?.period?.start ?? dr.date ?? dr.content?.[0]?.attachment?.creation;
        return raw ? String(raw).slice(0, 10) : undefined;
      });
      const today = new Date().toISOString().split("T")[0];
      const { phpData, fhirBundle } = processNotes(paragraphSets, today, noteDates);

      // In SMART mode, use the EHR Patient resource as the authoritative source
      // for patient name and birth date, overriding whatever was parsed from notes.
      if (client && patientId) {
        try {
          const pt = await fhirRequest<fhirR4.Patient>(client, `Patient/${patientId}`);
          const name = pt.name?.[0];
          if (name) {
            phpData.patient = {
              family: name.family ?? "",
              given: name.given ?? [],
              birth_date: pt.birthDate,
            };
          }
        } catch {
          // Non-fatal — parsed patient name (if any) remains
        }
      }

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

  function handleBundleLoaded() {
    setSelectedIds(new Set());
  }

  if (isSmartMode && isLoading) return <div>Loading clinical notes…</div>;
  if (isSmartMode && error) return <div>Error loading notes: {String(error)}</div>;

  const showNotes = notes.length > 0;
  const showEmpty = isSmartMode && !showNotes;

  return (
    <div style={{ padding: "1rem", maxWidth: "760px" }}>
      <h2>Clinical Notes</h2>

      {showNotes && (
        <>
          <p style={{ color: "#555" }}>
            {isSmartMode
              ? "Select coaching session notes to parse into a Personal Health Plan."
              : `${notes.length} DocumentReference${notes.length !== 1 ? "s" : ""} from loaded bundle.`}
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ccc", textAlign: "left" }}>
                <th style={{ width: "2rem" }} />
                <th style={{ padding: "0.4rem 0.5rem" }}>Title</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Date</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Type</th>
                <th style={{ padding: "0.4rem 0.5rem" }}>Content</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((dr) => {
                const meta = extractNoteMetadata(dr);
                const id = dr.id ?? "";
                const checked = selectedIds.has(id);
                const att = selectAttachment(dr);
                const attachUrl = att?.url;
                const contentKey = attachUrl ?? (att?.data && id ? `embedded:${id}` : undefined);
                const isViewVisible = contentKey ? binary.isVisible(contentKey) : false;

                return (
                  <>
                    <tr
                      key={id}
                      style={{ borderBottom: "1px solid #e0e0e0", verticalAlign: "middle" }}
                    >
                      <td style={{ padding: "0.5rem" }}>
                        <input
                          type="checkbox"
                          id={`note-${id}`}
                          checked={checked}
                          onChange={() => toggleNote(id)}
                        />
                      </td>
                      <td style={{ padding: "0.5rem", fontWeight: checked ? 600 : 400 }}>
                        <label htmlFor={`note-${id}`} style={{ cursor: "pointer" }}>
                          {meta.title}
                        </label>
                      </td>
                      <td style={{ padding: "0.5rem", color: "#666" }}>{meta.date ?? "—"}</td>
                      <td style={{ padding: "0.5rem", color: "#999", fontSize: "0.8rem" }}>
                        {meta.contentType}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        {contentKey && (
                          <button
                            style={{
                              fontSize: "0.8rem",
                              padding: "0.2rem 0.6rem",
                              cursor: "pointer",
                              background: isViewVisible ? "#e8f0fe" : "#f5f5f5",
                              border: "1px solid #ccc",
                              borderRadius: "3px",
                            }}
                            onClick={() => binary.toggle(contentKey, client, att?.data)}
                            disabled={binary.loading[contentKey]}
                          >
                            {binary.loading[contentKey]
                              ? "Loading…"
                              : isViewVisible
                                ? "Hide"
                                : "View"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {contentKey && isViewVisible && (
                      <tr key={`${id}-content`}>
                        <td
                          colSpan={5}
                          style={{ padding: "0.5rem 1rem 1rem", background: "#fafafa" }}
                        >
                          {binary.errors[contentKey] ? (
                            <span style={{ color: "red", fontSize: "0.85rem" }}>
                              {binary.errors[contentKey]}
                            </span>
                          ) : (
                            <pre
                              style={{
                                margin: 0,
                                fontSize: "0.8rem",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                maxHeight: "300px",
                                overflow: "auto",
                                background: "#fff",
                                border: "1px solid #e0e0e0",
                                padding: "0.75rem",
                                borderRadius: "4px",
                              }}
                            >
                              {binary.content[contentKey] ?? ""}
                            </pre>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={handleParseSelected}
              disabled={selectedIds.size === 0 || parsing}
            >
              {parsing
                ? "Parsing…"
                : `Parse ${selectedIds.size > 0 ? selectedIds.size : ""} Selected Note${selectedIds.size !== 1 ? "s" : ""}`}
            </button>
            {selectedIds.size === 0 && (
              <span style={{ color: "#666" }}>Select at least one note</span>
            )}
          </div>

          {parseError && <p style={{ color: "red", marginTop: "0.5rem" }}>{parseError}</p>}
        </>
      )}

      {showEmpty && <p>No coaching session notes found for this patient in the EHR.</p>}

      <div style={{ marginTop: "2rem", borderTop: "1px solid #e0e0e0", paddingTop: "1.5rem" }}>
        {!isSmartMode && (
          <>
            <h3 style={{ marginTop: 0 }}>Load FHIR Bundle</h3>
            <SampleBundleLoader onLoaded={handleBundleLoaded} />
            <div style={{ marginTop: "1.5rem", borderTop: "1px solid #e0e0e0", paddingTop: "1.5rem" }} />
          </>
        )}
        <h3 style={{ marginTop: 0 }}>Upload Notes Manually</h3>
        <FileUploadFallback onProcessed={handleUploadProcessed} />
      </div>
    </div>
  );
}
