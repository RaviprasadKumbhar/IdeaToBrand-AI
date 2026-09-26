import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSessionContext,
  createInitialSharedContext,
  loadSessionContext,
  saveSessionContext,
  StorageAdapter,
} from "../shared/src/store/sessionStorage.js";
import { SharedContext } from "../shared/src/types/index.js";

class MockSessionStorage implements StorageAdapter {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe("T-008: Project Persistence (sessionStorage Refresh Recovery)", () => {
  let mockStorage: MockSessionStorage;

  beforeEach(() => {
    mockStorage = new MockSessionStorage();
  });

  it("persists and restores full SharedContext across a simulated same-tab refresh", () => {
    const initial = createInitialSharedContext("project_test_123");
    initial.user_facts = { domain: "student collaboration" };
    initial.ai_assumptions = { market_need: { value: "peer discovery", rationale: "interviews" } };
    initial.stage_drafts = {
      discovery: {
        stage: "discovery",
        content: { problem: "Hard to find project teammates" },
        generated_at: new Date().toISOString(),
        attempt: 1,
      },
    };
    initial.approved_decisions = {
      positioning: {
        stage: "positioning",
        content: { strategic_frame: "Merit-based project matching" },
        approved_at: new Date().toISOString(),
        state: "approved",
        source: "strategist_approved",
      },
    };
    initial.critic_findings = [
      {
        id: "finding_1",
        stage: "discovery",
        target_field: "problem",
        issue_type: "cliche",
        evidence: "Too generic",
        explanation: "Focus on semester sprint deadlines",
        sharper_alternative: "Students scramble in week 2 for capstone teams",
        user_action: null,
      },
    ];

    // Save to session storage
    const saveResult = saveSessionContext(initial, mockStorage);
    expect(saveResult.success).toBe(true);

    // Simulate same-tab refresh by loading back
    const restored = loadSessionContext(mockStorage);
    expect(restored).not.toBeNull();
    expect(restored?.project_id).toBe("project_test_123");
    expect(restored?.user_facts.domain).toBe("student collaboration");
    expect(restored?.stage_drafts.discovery?.content.problem).toBe("Hard to find project teammates");
    expect(restored?.approved_decisions.positioning?.content.strategic_frame).toBe("Merit-based project matching");
    expect(restored?.critic_findings).toHaveLength(1);
  });

  it("ensures drafts and approved decisions are preserved in separate fields", () => {
    const ctx = createInitialSharedContext("test_separation");
    ctx.stage_drafts.discovery = {
      stage: "discovery",
      content: { problem: "Draft Problem" },
      generated_at: "2026-09-26T00:00:00Z",
      attempt: 1,
    };
    ctx.approved_decisions.discovery = {
      stage: "discovery",
      content: { problem: "Approved Final Problem" },
      approved_at: "2026-09-26T01:00:00Z",
      state: "approved",
      source: "user_edit",
    };

    saveSessionContext(ctx, mockStorage);
    const restored = loadSessionContext(mockStorage);

    expect(restored?.stage_drafts.discovery?.content.problem).toBe("Draft Problem");
    expect(restored?.approved_decisions.discovery?.content.problem).toBe("Approved Final Problem");
  });

  it("handles corrupted or malformed session storage gracefully without throwing unhandled exceptions", () => {
    mockStorage.setItem("foil_active_session_context", "{ invalid json corrupt");
    const restored = loadSessionContext(mockStorage);
    expect(restored).toBeNull();
  });

  it("clears session storage when requested", () => {
    const ctx = createInitialSharedContext("test_clear");
    saveSessionContext(ctx, mockStorage);
    expect(loadSessionContext(mockStorage)).not.toBeNull();

    clearSessionContext(mockStorage);
    expect(loadSessionContext(mockStorage)).toBeNull();
  });
});
