import { describe, expect, it } from "vitest";
import {
  IllegalStateTransitionError,
  transition,
} from "../shared/src/store/approvalStateMachine.js";

describe("T-009: Approval State Machine (docs/architecture.md Section 15)", () => {
  it("transitions legal happy path: draft -> critic_review -> approved", () => {
    let state = transition("draft", { type: "SUBMIT_CRITIC" });
    expect(state).toBe("critic_review");

    state = transition(state, { type: "CRITIC_NO_FINDINGS" });
    expect(state).toBe("approved");
  });

  it("handles critic findings cycle: critic_review -> needs_revision -> draft", () => {
    let state = transition("critic_review", { type: "CRITIC_FINDINGS_DETECTED" });
    expect(state).toBe("needs_revision");

    state = transition(state, { type: "REQUEST_REGENERATION" });
    expect(state).toBe("draft");
  });

  it("permits explicit user approval from needs_revision (accept despite findings)", () => {
    const state = transition("needs_revision", { type: "USER_ACCEPT_DRAFT" });
    expect(state).toBe("approved");
  });

  it("transitions approved -> needs_review when upstream field changes", () => {
    const state = transition("approved", { type: "UPSTREAM_CHANGED" });
    expect(state).toBe("needs_review");
  });

  it("handles needs_review re-verification via Critic recheck", () => {
    let state = transition("needs_review", { type: "RECHECK_CRITIC" });
    expect(state).toBe("critic_review");

    state = transition(state, { type: "CRITIC_NO_FINDINGS" });
    expect(state).toBe("approved");
  });

  it("permits explicit user re-affirmation from needs_review without regeneration", () => {
    const state = transition("needs_review", { type: "USER_ACCEPT_DRAFT" });
    expect(state).toBe("approved");
  });

  it("transitions to failed on validation failure and recovers via explicit user retry", () => {
    let state = transition("draft", { type: "VALIDATION_FAILED" });
    expect(state).toBe("failed");

    state = transition(state, { type: "REQUEST_REGENERATION" });
    expect(state).toBe("draft");
  });

  it("REJECTS illegal transitions and throws IllegalStateTransitionError", () => {
    // Cannot jump directly from draft to approved without Critic review or explicit user approval
    expect(() => transition("draft", { type: "CRITIC_NO_FINDINGS" })).toThrowError(
      IllegalStateTransitionError
    );

    // Cannot transition approved to needs_revision directly without critic review
    expect(() => transition("approved", { type: "CRITIC_FINDINGS_DETECTED" })).toThrowError(
      IllegalStateTransitionError
    );

    // Cannot jump from critic_review to needs_review
    expect(() => transition("critic_review", { type: "UPSTREAM_CHANGED" })).toThrowError(
      IllegalStateTransitionError
    );
  });
});
