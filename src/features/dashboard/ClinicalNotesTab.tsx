import type { fhirR4 } from "@smile-cdr/fhirts";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { EmptyState } from "../../components/EmptyState";
import { useBinaryContent } from "../../hooks/useBinaryContent";
import { useDocumentReferences } from "../../hooks/useDocumentReferences";
import { useSmartClient } from "../../hooks/useSmartClient";
import { fhirRequest } from "../../lib/fhirRequest";
import { processNotes } from "../../lib/noteProcessingPipeline";
import {
  extractNoteMetadata,
  fetchNoteContent,
  selectAttachment,
} from "../../services/documentReferenceHelpers";
import { useAppStore } from "../../store/appStore";
import { FileUploadFallback } from "../notes/FileUploadFallback";
import { SampleBundleLoader } from "../notes/SampleBundleLoader";

// Note type from FHIR DocumentReference.type
const NOTE_TYPES = ["All Types", "Progress Note", "Consult Note", "Discharge Summary"] as const;
type NoteTypeFilter = (typeof NOTE_TYPES)[number];

function getNoteType(dr: fhirR4.DocumentReference): string {
  return dr.type?.text ?? dr.type?.coding?.[0]?.display ?? "Note";
}

function matchesTypeFilter(dr: fhirR4.DocumentReference, filter: NoteTypeFilter): boolean {
  if (filter === "All Types") return true;
  const t = getNoteType(dr).toLowerCase();
  return t.includes(filter.toLowerCase());
}

const TYPE_BADGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  "Progress Note": { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  "Consult Note": { bg: "var(--color-bg-blue-highlight)", color: "var(--color-accent-blue)", border: "var(--color-tag-blue-bg)" },
  "Discharge Summary": { bg: "var(--color-tag-amber-bg)", color: "#7a4400", border: "#f5c77e" },
};

function TypeBadge({ type }: { type: string }) {
  const colors = TYPE_BADGE_COLORS[type] ?? {
    bg: "var(--color-bg-card-warm)",
    color: "var(--color-text-muted)",
    border: "var(--color-border)",
  };
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 99,
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {type}
    </span>
  );
}

function toPdfDataUri(binaryString: string): string | null {
  try {
    return `data:application/pdf;base64,${btoa(binaryString)}`;
  } catch {
    return null;
  }
}

export function ClinicalNotesTab() {
  const client = useSmartClient();
  const patientId = client?.patient?.id ?? undefined;
  const { data: ehrNotes, isLoading, error } = useDocumentReferences(patientId);

  const setPhpData = useAppStore((s) => s.setPhpData);
  const setFhirBundle = useAppStore((s) => s.setFhirBundle);
  const clearPlan = useAppStore((s) => s.clearPlan);
  const launchMode = useAppStore((s) => s.launchMode);
  const standaloneDocRefs = useAppStore((s) => s.standaloneDocRefs);
  const binaryCache = useAppStore((s) => s.binaryCache);
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
  const [typeFilter, setTypeFilter] = useState<NoteTypeFilter>("All Types");
  const [search, setSearch] = useState("");

  const binary = useBinaryContent();
  const isSmartMode = launchMode === "smart" || launchMode === "patient";
  const allNotes: fhirR4.DocumentReference[] = isSmartMode ? (ehrNotes ?? []) : standaloneDocRefs;

  const notes = useMemo(() => {
    return allNotes.filter((dr) => {
      if (!matchesTypeFilter(dr, typeFilter)) return false;
      if (search.trim()) {
        const meta = extractNoteMetadata(dr);
        const q = search.toLowerCase();
        return meta.title.toLowerCase().includes(q) || (meta.date ?? "").includes(q);
      }
      return true;
    });
  }, [allNotes, typeFilter, search]);

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
      const selectedNotes = allNotes.filter((dr) => selectedIds.has(dr.id ?? ""));
      const paragraphSets = await Promise.all(
        selectedNotes.map((dr) => fetchNoteContent(dr, client, binaryCache)),
      );
      const noteDates = selectedNotes.map((dr) => {
        const raw = dr.context?.period?.start ?? dr.date ?? dr.content?.[0]?.attachment?.creation;
        return raw ? String(raw).slice(0, 10) : undefined;
      });
      const today = new Date().toISOString().split("T")[0];
      const { phpData, fhirBundle } = processNotes(paragraphSets, today, noteDates);

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
          // Non-fatal
        }
      }

      setPhpData(phpData);
      setFhirBundle(fhirBundle);
      navigate("/app?tab=php");
    } catch (err) {
      setParseError(String(err));
    } finally {
      setParsing(false);
    }
  }

  if (isSmartMode && isLoading) {
    return (
      <div style={{ padding: "2rem 1.25rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
        Loading clinical notes…
      </div>
    );
  }

  if (isSmartMode && error) {
    return (
      <div style={{ padding: "2rem 1.25rem" }}>
        <EmptyState message={`Error loading notes: ${String(error)}`} />
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Search + filters */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          type="search"
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 200px",
            minWidth: 160,
            padding: "0.5rem 0.75rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            fontSize: 13,
            background: "var(--color-bg-card)",
            outline: "none",
          }}
        />
        {NOTE_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            style={{
              padding: "5px 14px",
              borderRadius: 99,
              border: "1px solid var(--color-border)",
              background: typeFilter === t ? "var(--color-primary)" : "var(--color-bg-card)",
              color: typeFilter === t ? "#fff" : "var(--color-text-muted)",
              fontWeight: typeFilter === t ? 600 : 400,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-muted)" }}>
          {allNotes.length} note{allNotes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Parse action bar (when items selected) */}
      {selectedIds.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.625rem 0.875rem",
            background: "var(--color-bg-highlight)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-tag-green-bg)",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--color-primary)", fontWeight: 500, flex: 1 }}>
            {selectedIds.size} note{selectedIds.size !== 1 ? "s" : ""} selected for Personal Health Plan
          </span>
          {parseError && <span style={{ fontSize: 12, color: "#d04040" }}>{parseError}</span>}
          <button
            type="button"
            onClick={() => {
              setSelectedIds(new Set());
              clearPlan();
            }}
            style={{
              padding: "5px 14px",
              borderRadius: 99,
              background: "var(--color-bg-card)",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleParseSelected}
            disabled={parsing}
            style={{
              padding: "5px 16px",
              borderRadius: 99,
              background: "var(--color-active-badge)",
              color: "#fff",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: parsing ? "not-allowed" : "pointer",
              opacity: parsing ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            {parsing ? "Processing…" : "View in Health Plan →"}
          </button>
        </div>
      )}

      {/* Notes table */}
      {notes.length === 0 ? (
        <EmptyState
          message={
            allNotes.length === 0
              ? "No clinical notes found for this patient."
              : "No notes match the current filter."
          }
          detail={
            !isSmartMode
              ? "Load a FHIR Bundle below to browse notes, or upload notes manually."
              : undefined
          }
        />
      ) : (
        <div
          style={{
            background: "var(--color-bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border-light)",
            overflow: "hidden",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-bg)" }}>
                <th style={{ width: 36, padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-border)" }} />
                <th style={{ padding: "0.5rem 0.75rem", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>Date</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>Type</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>Subject / Preview</th>
                <th style={{ padding: "0.5rem 0.75rem", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>Content</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((dr, i) => {
                const meta = extractNoteMetadata(dr);
                const id = dr.id ?? "";
                const checked = selectedIds.has(id);
                const att = selectAttachment(dr);
                const attachUrl = att?.url;
                const contentKey = attachUrl ?? (att?.data && id ? `embedded:${id}` : undefined);
                const isViewVisible = contentKey ? binary.isVisible(contentKey) : false;
                const noteType = getNoteType(dr);

                return (
                  <>
                    <tr
                      key={id}
                      style={{
                        borderBottom: "1px solid var(--color-border-light)",
                        background: checked ? "var(--color-bg-highlight)" : i % 2 === 0 ? "var(--color-bg-card)" : "var(--color-bg)",
                        verticalAlign: "middle",
                      }}
                    >
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <input
                          type="checkbox"
                          id={`note-${id}`}
                          checked={checked}
                          onChange={() => toggleNote(id)}
                          style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--color-primary)" }}
                        />
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", fontSize: 13, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                        {meta.date ?? "—"}
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <TypeBadge type={noteType} />
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <label htmlFor={`note-${id}`} style={{ cursor: "pointer" }}>
                          <div style={{ fontWeight: checked ? 600 : 400, fontSize: 13 }}>{meta.title}</div>
                        </label>
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        {contentKey && (
                          <button
                            type="button"
                            style={{
                              fontSize: 12,
                              padding: "3px 10px",
                              cursor: "pointer",
                              background: isViewVisible ? "var(--color-bg-highlight)" : "var(--color-bg-card-warm)",
                              border: "1px solid var(--color-border)",
                              borderRadius: 99,
                              color: "var(--color-text-muted)",
                            }}
                            onClick={() => binary.toggle(contentKey, client, att?.data)}
                            disabled={binary.loading[contentKey]}
                          >
                            {binary.loading[contentKey] ? "Loading…" : isViewVisible ? "Hide" : "View"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {contentKey && isViewVisible && (
                      <tr key={`${id}-content`}>
                        <td colSpan={5} style={{ padding: "0.5rem 1rem 1rem", background: "#fafafa" }}>
                          {binary.errors[contentKey] ? (
                            <span style={{ color: "#d04040", fontSize: 12 }}>{binary.errors[contentKey]}</span>
                          ) : att?.contentType?.startsWith("text/html") ? (
                            <iframe
                              srcDoc={binary.content[contentKey] ?? ""}
                              sandbox=""
                              title={meta.title}
                              style={{ width: "100%", height: 400, border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "#fff", display: "block" }}
                            />
                          ) : att?.contentType?.startsWith("application/pdf") ? (
                            (() => {
                              const src = toPdfDataUri(binary.content[contentKey] ?? "");
                              const isRendering = pdfLoading[contentKey] !== false;
                              return src ? (
                                <div style={{ position: "relative", height: 500 }}>
                                  {isRendering && (
                                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-text-muted)", fontSize: 13, zIndex: 1 }}>
                                      Rendering PDF…
                                    </div>
                                  )}
                                  <iframe
                                    src={src}
                                    title={meta.title}
                                    onLoad={() => setPdfLoading((p) => ({ ...p, [contentKey]: false }))}
                                    style={{ width: "100%", height: 500, border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "#fff", display: "block", visibility: isRendering ? "hidden" : "visible" }}
                                  />
                                </div>
                              ) : (
                                <span style={{ color: "#d04040", fontSize: 12 }}>Unable to render PDF.</span>
                              );
                            })()
                          ) : (
                            <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 300, overflow: "auto", background: "#fff", border: "1px solid var(--color-border)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
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
        </div>
      )}

      {/* Standalone dev tools */}
      {!isSmartMode && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "var(--color-bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border-light)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <h3 style={{ margin: "0 0 0.75rem", fontSize: 14, fontWeight: 600 }}>Load FHIR Bundle</h3>
          <SampleBundleLoader onLoaded={() => setSelectedIds(new Set())} />
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border-light)" }}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: 14, fontWeight: 600 }}>Upload Notes Manually</h3>
            <FileUploadFallback onProcessed={() => navigate("/app?tab=php")} />
          </div>
        </div>
      )}
    </div>
  );
}
