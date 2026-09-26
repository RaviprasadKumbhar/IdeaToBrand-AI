import { SharedContext } from "../types/index.js";

/**
 * Storage key for session-scoped recovery.
 * Architecture Decision: sessionStorage solely for same-tab refresh recovery.
 * No server database, no cross-session durable storage.
 */
export const SESSION_STORAGE_KEY = "foil_active_session_context";

/**
 * Creates an empty, valid SharedContext object.
 */
export function createInitialSharedContext(projectId: string = `foil_${Date.now()}`): SharedContext {
  return {
    project_id: projectId,
    user_facts: {},
    ai_assumptions: {},
    approved_decisions: {},
    stage_drafts: {},
    critic_findings: [],
    consistency_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };
}

/**
 * Interface representing storage operations (browser sessionStorage or mock/fallback).
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Safe accessor for window.sessionStorage.
 */
function getDefaultStorage(): StorageAdapter | null {
  if (typeof window !== "undefined" && window.sessionStorage) {
    return window.sessionStorage;
  }
  return null;
}

/**
 * Validates the runtime structural integrity of a loaded SharedContext.
 */
export function isValidSharedContext(obj: unknown): obj is SharedContext {
  if (!obj || typeof obj !== "object") return false;
  const c = obj as Partial<SharedContext>;
  return (
    typeof c.project_id === "string" &&
    typeof c.user_facts === "object" &&
    c.user_facts !== null &&
    typeof c.ai_assumptions === "object" &&
    c.ai_assumptions !== null &&
    typeof c.approved_decisions === "object" &&
    c.approved_decisions !== null &&
    typeof c.stage_drafts === "object" &&
    c.stage_drafts !== null &&
    Array.isArray(c.critic_findings) &&
    Array.isArray(c.scenario_overrides) &&
    Array.isArray(c.revision_log)
  );
}

/**
 * Saves current SharedContext to sessionStorage for same-tab refresh recovery.
 * Architecture Invariant: Stage drafts and approved decisions are preserved in separate fields.
 */
export function saveSessionContext(
  ctx: SharedContext,
  storage: StorageAdapter | null = getDefaultStorage()
): { success: boolean; error?: string } {
  if (!storage) {
    return { success: false, error: "Storage adapter unavailable" };
  }

  if (!isValidSharedContext(ctx)) {
    return { success: false, error: "Invalid SharedContext structure" };
  }

  try {
    const serialized = JSON.stringify(ctx);
    storage.setItem(SESSION_STORAGE_KEY, serialized);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to serialize session context";
    return { success: false, error: message };
  }
}

/**
 * Restores SharedContext from sessionStorage after a same-tab browser refresh.
 */
export function loadSessionContext(
  storage: StorageAdapter | null = getDefaultStorage()
): SharedContext | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (isValidSharedContext(parsed)) {
      return parsed;
    }
    console.warn("Corrupted SharedContext found in sessionStorage; ignoring.");
    return null;
  } catch (err) {
    console.warn("Failed to parse sessionStorage recovery context:", err);
    return null;
  }
}

/**
 * Clears active session context when session ends or project is reset.
 */
export function clearSessionContext(
  storage: StorageAdapter | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear sessionStorage:", err);
  }
}
