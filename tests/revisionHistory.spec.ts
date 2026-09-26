import { describe, expect, it } from "vitest";
import { createInitialSharedContext } from "../shared/src/store/sessionStorage.js";
import {
  acceptScenarioBranch,
  writeApprovedDecision,
} from "../shared/src/store/revisionHistory.js";
import { ScenarioOverride } from "../shared/src/types/index.js";

describe("T-010: Revision History (docs/architecture.md Section 7)", () => {
  it("appends exactly one RevisionLogEntry whenever writeApprovedDecision is invoked", () => {
    let ctx = createInitialSharedContext("project_rev_test");
    expect(ctx.revision_log).toHaveLength(0);

    const discoveryContent = { problem: "Validated problem statement" };
    ctx = writeApprovedDecision(
      ctx,
      "discovery",
      discoveryContent,
      "strategist_approved",
      "stage_1_run"
    );

    expect(ctx.revision_log).toHaveLength(1);
    const entry = ctx.revision_log[0];
    expect(entry.changed_field).toBe("discovery");
    expect(entry.previous_value).toBeNull();
    expect(entry.new_value).toEqual(discoveryContent);
    expect(entry.cause).toBe("strategist_approved");
    expect(entry.cause_id).toBe("stage_1_run");
    expect(entry.id).toMatch(/^rev_/);
    expect(entry.timestamp).toBeDefined();

    // Verify approved_decisions was updated
    expect(ctx.approved_decisions.discovery?.content).toEqual(discoveryContent);
    expect(ctx.approved_decisions.discovery?.state).toBe("approved");
    expect(ctx.approved_decisions.discovery?.source).toBe("strategist_approved");
  });

  it("captures previous_value when an approved decision is updated via user edit", () => {
    let ctx = createInitialSharedContext("project_edit_test");
    const v1 = { problem: "Initial Problem" };
    const v2 = { problem: "Sharper Edited Problem" };

    ctx = writeApprovedDecision(ctx, "discovery", v1, "strategist_approved", "call_1");
    ctx = writeApprovedDecision(ctx, "discovery", v2, "user_edit", "edit_action_1");

    expect(ctx.revision_log).toHaveLength(2);
    const secondEntry = ctx.revision_log[1];
    expect(secondEntry.changed_field).toBe("discovery");
    expect(secondEntry.previous_value).toEqual(v1);
    expect(secondEntry.new_value).toEqual(v2);
    expect(secondEntry.cause).toBe("user_edit");
    expect(ctx.approved_decisions.discovery?.source).toBe("user_edit");
  });

  it("clears working stage_draft for that stage once approved", () => {
    let ctx = createInitialSharedContext("draft_clear_test");
    ctx.stage_drafts.positioning = {
      stage: "positioning",
      content: { frame: "Working draft" },
      generated_at: "2026-09-26T00:00:00Z",
      attempt: 1,
    };

    ctx = writeApprovedDecision(
      ctx,
      "positioning",
      { frame: "Final approved frame" },
      "strategist_approved",
      "run_pos"
    );

    expect(ctx.stage_drafts.positioning).toBeUndefined();
    expect(ctx.approved_decisions.positioning?.content).toEqual({ frame: "Final approved frame" });
  });

  it("applies Scenario Probe branch and logs revision history for all affected fields", () => {
    let ctx = createInitialSharedContext("scenario_test");

    // Seed approved positioning and naming
    ctx = writeApprovedDecision(
      ctx,
      "positioning",
      { direction: "Original enterprise direction" },
      "strategist_approved",
      "pos_init"
    );
    ctx = writeApprovedDecision(
      ctx,
      "naming_personality",
      { name: "EnterpriseBrand" },
      "strategist_approved",
      "name_init"
    );
    expect(ctx.revision_log).toHaveLength(2);

    // Setup a ScenarioOverride with branch drafts for positioning and naming
    const scenario: ScenarioOverride = {
      id: "scen_123",
      triggered_from_stage: "positioning",
      what_if_input: "What if we target high school students instead?",
      affected_fields: ["naming_personality"],
      branch_drafts: [
        {
          stage: "positioning",
          content: { direction: "Youth and student peer network" },
          generated_at: "2026-09-26T02:00:00Z",
          attempt: 1,
        },
        {
          stage: "naming_personality",
          content: { name: "PeerSync" },
          generated_at: "2026-09-26T02:05:00Z",
          attempt: 1,
        },
      ],
      decision: null,
      created_at: "2026-09-26T02:00:00Z",
    };
    ctx.scenario_overrides.push(scenario);

    // Accept scenario branch
    const updated = acceptScenarioBranch(ctx, "scen_123");

    // Exactly 2 new revision entries should be created (total 4)
    expect(updated.revision_log).toHaveLength(4);

    const posRev = updated.revision_log[2];
    expect(posRev.changed_field).toBe("positioning");
    expect(posRev.cause).toBe("scenario_accept");
    expect(posRev.cause_id).toBe("scen_123");
    expect(posRev.new_value).toEqual({ direction: "Youth and student peer network" });

    const nameRev = updated.revision_log[3];
    expect(nameRev.changed_field).toBe("naming_personality");
    expect(nameRev.cause).toBe("scenario_accept");
    expect(nameRev.cause_id).toBe("scen_123");
    expect(nameRev.new_value).toEqual({ name: "PeerSync" });

    // Verify scenario decision status was updated
    expect(updated.scenario_overrides[0].decision).toBe("accept_branch");
    // Verify approved decisions were updated
    expect(updated.approved_decisions.positioning?.content).toEqual({
      direction: "Youth and student peer network",
    });
    expect(updated.approved_decisions.naming_personality?.content).toEqual({
      name: "PeerSync",
    });
  });

  it("preserves immutability: returns new object and does not mutate previous context", () => {
    const original = createInitialSharedContext("immutability_test");
    const updated = writeApprovedDecision(
      original,
      "discovery",
      { problem: "New problem" },
      "strategist_approved",
      "test"
    );

    expect(original.revision_log).toHaveLength(0);
    expect(original.approved_decisions.discovery).toBeUndefined();
    expect(updated.revision_log).toHaveLength(1);
    expect(updated.approved_decisions.discovery).toBeDefined();
  });
});
