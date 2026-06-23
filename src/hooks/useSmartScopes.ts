import { useMemo } from "react";
import { useSmartClient } from "./useSmartClient";

/**
 * Parses the granted scopes from the SMART on FHIR access token and returns
 * a helper to check whether a given FHIR resource type is covered.
 *
 * Scope formats handled (SMART v1 and v2):
 *   patient/Goal.read   patient/Goal.*   patient/Goal.rs
 *   user/Goal.read      system/Goal.read
 *   patient/*.read      patient/*.*
 *
 * If no token / scope string is present (e.g. standalone dev mode with no
 * auth), the helper returns true for all resource types so the UI still works.
 */
export function useSmartScopes() {
  const client = useSmartClient();

  return useMemo(() => {
    const scopeStr: string | undefined =
      client?.state?.tokenResponse?.scope ?? client?.state?.scope;

    // No auth context → treat everything as allowed
    if (!scopeStr) {
      return {
        hasResourceScope: (_resourceType: string) => true,
        hasWriteScope: (_resourceType: string) => true,
        scopes: [],
      };
    }

    const scopes = scopeStr.split(/\s+/).filter(Boolean);

    function hasResourceScope(resourceType: string): boolean {
      for (const scope of scopes) {
        // e.g. "patient/Goal.read", "user/Goal.*", "system/*.read"
        const match = scope.match(/^(?:patient|user|system)\/([^.]+)\./);
        if (!match) continue;
        const resource = match[1];
        if (resource === "*" || resource === resourceType) return true;
      }
      return false;
    }

    // Check write/create permission: operation part must be "*", "write", "crus", "cu", or "c"
    const WRITE_OPS = new Set(["*", "write", "crus", "cu", "c", "cru"]);
    function hasWriteScope(resourceType: string): boolean {
      for (const scope of scopes) {
        const match = scope.match(/^(?:patient|user|system)\/([^.]+)\.(.+)$/);
        if (!match) continue;
        const resource = match[1];
        const op = match[2];
        if ((resource === "*" || resource === resourceType) && WRITE_OPS.has(op)) return true;
      }
      return false;
    }

    return { hasResourceScope, hasWriteScope, scopes };
  }, [client]);
}
