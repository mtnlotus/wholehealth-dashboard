import type { fhirR4 } from "@smile-cdr/fhirts";
import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { EmptyState } from "../../components/EmptyState";
import { useBinaryContent } from "../../hooks/useBinaryContent";
import { useDocumentReferences } from "../../hooks/useDocumentReferences";
import { useSmartClient } from "../../hooks/useSmartClient";
import { fhirRequest } from "../../lib/fhirRequest";
import { filesToDocumentReferences } from "../../lib/uploadedNoteHelpers";
import { processNotes } from "../../lib/noteProcessingPipeline";
import {
  extractNoteMetadata,
  fetchMostRecentEncounterRef,
  fetchNoteContent,
  selectAttachment,
} from "../../services/documentReferenceHelpers";
import { useAppStore } from "../../store/appStore";
import { useSmartScopes } from "../../hooks/useSmartScopes";
import { useQueryClient } from "@tanstack/react-query";
import { FileUploadFallback } from "../notes/FileUploadFallback";
import { SampleBundleLoader } from "../notes/SampleBundleLoader";

const NOTE_TYPES = ["All Types", "Progress Note", "Consult Note", "Discharge Summary"] as const;
type NoteTypeFilter = (typeof NOTE_TYPES)[number];

function getNoteType(dr: fhirR4.DocumentReference): string {
  return dr.type?.text ?? dr.type?.coding?.[0]?.display ?? "Note";
}

// LOINC codes for note types that should be auto-selected and parsed into the health plan
const HEALTH_COACHING_NOTE_CODES = [
  "96340-5", // Integrative medicine Note
];

function isHealthCoachingNote(dr: fhirR4.DocumentReference): boolean {
  return (dr.type?.coding ?? []).some((c) => c.code && HEALTH_COACHING_NOTE_CODES.includes(c.code));
}

function isCoachingByText(dr: fhirR4.DocumentReference): boolean {
  const lower = (s: string | undefined) => (s ?? "").toLowerCase();
  if (lower(dr.description).includes("coaching")) return true;
  return (dr.content ?? []).some((c) => lower(c.attachment?.title).includes("coaching"));
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
  "Integrative medicine Note": { bg: "#f3e8ff", color: "#6b21a8", border: "#d8b4fe" },
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

function getAuthor(dr: fhirR4.DocumentReference): string {
  return dr.author?.[0]?.display ?? "";
}

function toPdfDataUri(binaryString: string): string | null {
  try {
    return `data:application/pdf;base64,${btoa(binaryString)}`;
  } catch {
    return null;
  }
}

const thStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
  textAlign: "left",
  borderBottom: "1px solid var(--color-border)",
};

function NotesTable({
  notes,
  selectedIds,
  toggleNote,
  fhirVisible,
  setFhirVisible,
  binary,
  pdfLoading,
  setPdfLoading,
  client,
  onRemove,
}: {
  notes: fhirR4.DocumentReference[];
  selectedIds: Set<string>;
  toggleNote: (id: string) => void;
  fhirVisible: Set<string>;
  setFhirVisible: React.Dispatch<React.SetStateAction<Set<string>>>;
  binary: ReturnType<typeof useBinaryContent>;
  pdfLoading: Record<string, boolean>;
  setPdfLoading: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  client: ReturnType<typeof useSmartClient>;
  onRemove?: (id: string) => void;
}) {
  const colSpan = onRemove ? 8 : 7;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "var(--color-bg)" }}>
          <th style={{ width: 36, padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-border)" }} />
          <th style={thStyle}>Date</th>
          <th style={thStyle}>Type</th>
          <th style={thStyle}>Subject / Preview</th>
          <th style={thStyle}>Author</th>
          <th style={thStyle}>Content</th>
          <th style={thStyle}>FHIR Data</th>
          {onRemove && <th style={thStyle} />}
        </tr>
      </thead>
      <tbody>
        {notes.map((dr, i) => {
          const meta = extractNoteMetadata(dr);
          const id = dr.id ?? "";
          const checked = selectedIds.has(id);
          const att = selectAttachment(dr);
          const attachUrl = att?.url;
          const embeddedKey = att?.data ? `embedded:${id || i}` : undefined;
          const contentKey = attachUrl ?? embeddedKey;
          const isViewVisible = contentKey ? binary.isVisible(contentKey) : false;
          const isFhirVisible = fhirVisible.has(id);
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
                <td style={{ padding: "0.5rem 0.75rem", fontSize: 13, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                  {getAuthor(dr) || "—"}
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
                      {binary.loading[contentKey] ? "Loading…" : isViewVisible ? "Hide" : "Show"}
                    </button>
                  )}
                </td>
                <td style={{ padding: "0.5rem 0.75rem" }}>
                  <button
                    type="button"
                    style={{
                      fontSize: 12,
                      padding: "3px 10px",
                      cursor: "pointer",
                      background: isFhirVisible ? "var(--color-bg-highlight)" : "var(--color-bg-card-warm)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 99,
                      color: "var(--color-text-muted)",
                    }}
                    onClick={() =>
                      setFhirVisible((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      })
                    }
                  >
                    {isFhirVisible ? "Hide" : "Show"}
                  </button>
                </td>
                {onRemove && (
                  <td style={{ padding: "0.5rem 0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => onRemove(id)}
                      title="Remove uploaded note"
                      style={{
                        fontSize: 12,
                        padding: "3px 10px",
                        cursor: "pointer",
                        background: "transparent",
                        border: "1px solid var(--color-border)",
                        borderRadius: 99,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>

              {isFhirVisible && (
                <tr key={`${id}-fhir`}>
                  <td colSpan={colSpan} style={{ padding: "0.5rem 1rem 1rem", background: "#fafafa" }}>
                    <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 400, overflow: "auto", background: "#fff", border: "1px solid var(--color-border)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                      {JSON.stringify(dr, null, 2)}
                    </pre>
                  </td>
                </tr>
              )}

              {contentKey && isViewVisible && (
                <tr key={`${id}-content`}>
                  <td colSpan={colSpan} style={{ padding: "0.5rem 1rem 1rem", background: "#fafafa" }}>
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
  );
}

function SectionLabel({ label, count, badge }: { label: string; count: number; badge?: "amber" }) {
  const badgeBg = badge === "amber" ? "#fff3cd" : "var(--color-bg)";
  const badgeColor = badge === "amber" ? "#7a4400" : "var(--color-text-muted)";
  const badgeBorder = badge === "amber" ? "#f5c77e" : "var(--color-border)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 0.875rem", background: "var(--color-bg-card-warm)", borderBottom: "1px solid var(--color-border-light)" }}>
      <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
      <span style={{ padding: "1px 7px", borderRadius: 99, background: badgeBg, border: `1px solid ${badgeBorder}`, fontSize: 11, fontWeight: 600, color: badgeColor }}>
        {count}
      </span>
    </div>
  );
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
  const uploadedDocRefs = useAppStore((s) => s.uploadedDocRefs);
  const addUploadedDocRefs = useAppStore((s) => s.addUploadedDocRefs);
  const removeUploadedDocRef = useAppStore((s) => s.removeUploadedDocRef);
  const autoProcessedNoteIds = useAppStore((s) => s.autoProcessedNoteIds);
  const markNotesAutoProcessed = useAppStore((s) => s.markNotesAutoProcessed);
  const navigate = useNavigate();

  const selectedIds = useAppStore((s) => s.selectedNoteIds);
  const setSelectedIds = useAppStore((s) => s.setSelectedNoteIds);
  const [fhirVisible, setFhirVisible] = useState<Set<string>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
  const [typeFilter, setTypeFilter] = useState<NoteTypeFilter>("All Types");
  const [search, setSearch] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const { hasWriteScope } = useSmartScopes();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const binary = useBinaryContent();
  const isSmartMode = launchMode === "smart" || launchMode === "patient";
  const canPostToEhr = isSmartMode && hasWriteScope("DocumentReference");
  const ehrSourceNotes: fhirR4.DocumentReference[] = isSmartMode ? (ehrNotes ?? []) : standaloneDocRefs;

  // All notes pool for selection/parsing
  const allNotes = useMemo(() => [...ehrSourceNotes, ...uploadedDocRefs], [ehrSourceNotes, uploadedDocRefs]);

  const filteredEhrNotes = useMemo(() => {
    return ehrSourceNotes.filter((dr) => {
      if (!matchesTypeFilter(dr, typeFilter)) return false;
      if (search.trim()) {
        const meta = extractNoteMetadata(dr);
        const q = search.toLowerCase();
        return meta.title.toLowerCase().includes(q) || (meta.date ?? "").includes(q);
      }
      return true;
    });
  }, [ehrSourceNotes, typeFilter, search]);

  const filteredUploadedNotes = useMemo(() => {
    return uploadedDocRefs
      .filter((dr) => {
        if (search.trim()) {
          const meta = extractNoteMetadata(dr);
          const q = search.toLowerCase();
          return meta.title.toLowerCase().includes(q) || (meta.date ?? "").includes(q);
        }
        return true;
      })
      .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  }, [uploadedDocRefs, search]);

  function toggleNote(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);
    const { refs, errors } = await filesToDocumentReferences(files, client?.state.serverUrl);
    if (refs.length > 0) {
      const refsWithSubject = patientId
        ? refs.map((r) => ({ ...r, subject: { reference: `Patient/${patientId}` } }))
        : refs;
      addUploadedDocRefs(refsWithSubject);
      // Auto-select all newly uploaded refs
      const next = new Set(selectedIds);
      for (const r of refsWithSubject) if (r.id) next.add(r.id);
      setSelectedIds(next);
    }
    if (errors.length > 0) setUploadError(errors.join("; "));
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = "";
  }

  const parseNotes = useCallback(async (notes: fhirR4.DocumentReference[]) => {
    if (notes.length === 0) return;
    setParsing(true);
    setParseError(null);
    try {
      const paragraphSets = await Promise.all(
        notes.map((dr) => fetchNoteContent(dr, client, binaryCache)),
      );
      const noteDates = notes.map((dr) => {
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
      navigate("/app?tab=summary");
    } catch (err) {
      setParseError(String(err));
    } finally {
      setParsing(false);
    }
  }, [client, patientId, binaryCache, setPhpData, setFhirBundle, navigate]);

  function handleParseSelected() {
    const selectedNotes = allNotes.filter((dr) => selectedIds.has(dr.id ?? ""));
    parseNotes(selectedNotes);
  }

  async function handlePostToEhr() {
    if (!client) return;
    const toPost = uploadedDocRefs.filter((dr) => selectedIds.has(dr.id ?? ""));
    if (toPost.length === 0) return;
    setPosting(true);
    setPostError(null);
    const encounterRef = patientId ? await fetchMostRecentEncounterRef(client, patientId) : undefined;
    const fhirUser = client.getFhirUser();
    console.log("[PostToEHR] encounterRef:", encounterRef, "fhirUser:", fhirUser);
    const failed: string[] = [];
    const succeededIds: string[] = [];
    for (const dr of toPost) {
      // Strip synthetic id so the server assigns a real one; set docStatus final
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...rest } = dr;
      const body: fhirR4.DocumentReference = {
        ...rest,
        // Epic accepts a limited set of note types; map to Progress Note for EHR posting
        type: { coding: [{ system: "http://loinc.org", code: "11506-3", display: "Progress note" }], text: "Progress note" },
        description: "Health and Wellness Coaching",
        docStatus: "final" as fhirR4.DocumentReference.DocStatusEnum,
        ...(fhirUser && { author: [{ reference: fhirUser }] }),
        ...(encounterRef || rest.date
          ? {
              context: {
                ...rest.context,
                ...(encounterRef && { encounter: [{ reference: encounterRef }] }),
                ...(rest.date && { period: { start: String(rest.date), end: String(rest.date) } }),
              },
            }
          : {}),
      };
      console.log("[PostToEHR] body:", JSON.stringify(body));
      try {
        await fhirRequest(client, "DocumentReference", {
          method: "POST",
          headers: { "Content-Type": "application/fhir+json" },
          body: JSON.stringify(body),
        });
        if (dr.id) succeededIds.push(dr.id);
      } catch (err) {
        console.error("[PostToEHR] error:", err);
        const meta = extractNoteMetadata(dr);
        failed.push(`${meta.title}: ${String(err)}`);
      }
    }
    if (succeededIds.length > 0) {
      // Remove successfully posted notes from uploaded section and deselect them
      for (const id of succeededIds) removeUploadedDocRef(id);
      const next = new Set(selectedIds);
      for (const id of succeededIds) next.delete(id);
      setSelectedIds(next);
      // Refresh EHR DocumentReference query
      await queryClient.invalidateQueries({ queryKey: ["documentReferences", patientId] });
    }
    if (failed.length > 0) setPostError(failed.join("; "));
    setPosting(false);
  }

  // Auto-select and parse health coaching notes as they appear (EHR or uploaded).
  // Primary: match by LOINC code. Fallback: match by "coaching" in description or attachment title.
  useEffect(() => {
    let coachingNotes = allNotes.filter(isHealthCoachingNote);
    if (coachingNotes.length === 0) coachingNotes = allNotes.filter(isCoachingByText);

    const newNotes = coachingNotes.filter((n) => n.id && !autoProcessedNoteIds.has(n.id));
    if (newNotes.length === 0) return;

    markNotesAutoProcessed(newNotes.map((n) => n.id!));

    const next = new Set(selectedIds);
    for (const n of coachingNotes) if (n.id) next.add(n.id);
    setSelectedIds(next);

    parseNotes(coachingNotes);
  }, [allNotes, autoProcessedNoteIds, markNotesAutoProcessed, parseNotes, selectedIds, setSelectedIds]);

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

  const tableProps = { selectedIds, toggleNote, fhirVisible, setFhirVisible, binary, pdfLoading, setPdfLoading, client };

  return (
    <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Toolbar: search + type filters + upload button */}
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
          {ehrSourceNotes.length} EHR note{ehrSourceNotes.length !== 1 ? "s" : ""}
        </span>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.docx,.json"
          multiple
          style={{ display: "none" }}
          onChange={handleUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "5px 14px",
            borderRadius: 99,
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-card)",
            color: "var(--color-primary)",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          ↑ Upload Notes
        </button>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div style={{ fontSize: 12, color: "#d04040", padding: "0.5rem 0.75rem", background: "#fff5f5", borderRadius: "var(--radius-md)", border: "1px solid #fca5a5" }}>
          {uploadError}
        </div>
      )}

      {/* Parse action bar */}
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
            onClick={() => { setSelectedIds(new Set()); clearPlan(); }}
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
            {parsing ? "Processing…" : "Update Health Plan →"}
          </button>
        </div>
      )}

      {/* Uploaded Notes section */}
      {(uploadedDocRefs.length > 0 || uploadError) && (
        <div
          style={{
            background: "var(--color-bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid #f5c77e",
            overflow: "hidden",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 0.875rem", background: "var(--color-bg-card-warm)", borderBottom: "1px solid var(--color-border-light)" }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Uploaded Notes</span>
            <span style={{ padding: "1px 7px", borderRadius: 99, background: "#fff3cd", border: "1px solid #f5c77e", fontSize: 11, fontWeight: 600, color: "#7a4400" }}>
              {filteredUploadedNotes.length}
            </span>
            {canPostToEhr && uploadedDocRefs.some((dr) => selectedIds.has(dr.id ?? "")) && (
              <button
                type="button"
                onClick={handlePostToEhr}
                disabled={posting}
                style={{
                  marginLeft: "0.5rem",
                  padding: "3px 12px",
                  borderRadius: 99,
                  background: posting ? "var(--color-bg)" : "var(--color-accent-blue)",
                  color: posting ? "var(--color-text-muted)" : "#fff",
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: posting ? "not-allowed" : "pointer",
                  opacity: posting ? 0.7 : 1,
                }}
              >
                {posting ? "Posting…" : "↑ Post to EHR"}
              </button>
            )}
            {postError && (
              <span style={{ fontSize: 11, color: "#d04040", marginLeft: "0.25rem" }}>{postError}</span>
            )}
          </div>
          {filteredUploadedNotes.length === 0 ? (
            <div style={{ padding: "1.5rem" }}>
              <EmptyState message="No uploaded notes match the current search." />
            </div>
          ) : (
            <NotesTable
              notes={filteredUploadedNotes}
              {...tableProps}
              onRemove={removeUploadedDocRef}
            />
          )}
        </div>
      )}

      {/* EHR Notes section */}
      <div
        style={{
          background: "var(--color-bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-light)",
          overflow: "hidden",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <SectionLabel label="EHR Notes" count={filteredEhrNotes.length} />
        {filteredEhrNotes.length === 0 ? (
          <div style={{ padding: "1.5rem" }}>
            <EmptyState
              message={
                ehrSourceNotes.length === 0
                  ? "No clinical notes found for this patient."
                  : "No notes match the current filter."
              }
              detail={
                !isSmartMode
                  ? "Load a FHIR Bundle below to browse notes, or upload notes manually."
                  : undefined
              }
            />
          </div>
        ) : (
          <NotesTable notes={filteredEhrNotes} {...tableProps} />
        )}
      </div>

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
