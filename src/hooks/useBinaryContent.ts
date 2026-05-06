import { useState } from "react";
import type Client from "fhirclient/lib/Client";
import { fetchBinaryText } from "../services/documentReferenceHelpers";
import { useAppStore } from "../store/appStore";

interface BinaryState {
  content: Record<string, string>;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
  fetchContent: (key: string, client: Client | null, inlineData?: string) => Promise<void>;
  toggle: (key: string, client: Client | null, inlineData?: string) => Promise<void>;
  isVisible: (key: string) => boolean;
}

export function useBinaryContent(): BinaryState {
  const binaryCache = useAppStore((s) => s.binaryCache);
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  async function fetchContent(key: string, client: Client | null, inlineData?: string): Promise<void> {
    if (content[key] !== undefined) return;

    // Inline base64 data provided directly (embedded attachment or sample bundle cache)
    if (inlineData) {
      setContent((prev) => ({ ...prev, [key]: atob(inlineData) }));
      return;
    }

    // Cache populated from sample bundle
    if (binaryCache[key]) {
      setContent((prev) => ({ ...prev, [key]: binaryCache[key] }));
      return;
    }

    if (!client) {
      setErrors((prev) => ({ ...prev, [key]: "No FHIR client — cannot fetch Binary" }));
      return;
    }

    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const text = await fetchBinaryText(key, client);
      setContent((prev) => ({ ...prev, [key]: text }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [key]: String(err) }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function toggle(key: string, client: Client | null, inlineData?: string): Promise<void> {
    const nowVisible = !visible[key];
    setVisible((prev) => ({ ...prev, [key]: nowVisible }));
    if (nowVisible) await fetchContent(key, client, inlineData);
  }

  function isVisible(key: string): boolean {
    return !!visible[key];
  }

  return { content, loading, errors, fetchContent, toggle, isVisible };
}
