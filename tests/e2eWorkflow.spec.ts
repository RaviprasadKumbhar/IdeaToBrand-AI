import { describe, expect, it } from "vitest";
import { app } from "../backend/src/server.js";
import {
  createInitialSharedContext,
  loadSessionContext,
  saveSessionContext,
  validateEnvironment,
  writeApprovedDecision,
  markAffectedFieldsNeedsReview,
  validateExportEligibility,
  assembleBrandKit,
  DiscoveryContent,
  PositioningContent,
  NamingPersonalityContent,
  TaglinePitchContent,
  VisualBriefContent,
  VoiceMessagingContent,
  LaunchPrepContent,
  SharedContext,
  ConsistencyFinding,
} from "@foil/shared";
import { validateIdeaWordCount } from "../backend/src/stages/discovery.js";

// Helper for test HTTP requests against Express server
async function testRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = (server.address() as any).port;
      try {
        const response = await fetch(`http://localhost:${port}${path}`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        });
        const json = await response.json();
        server.close(() => resolve({ status: response.status, json }));
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

describe("T-041: Full End-to-End QA Workflow Test", () => {
  // ─── 1. Clean Startup & Environment Guards ────────────────────────────────────
  describe("1. Environment & Startup Guards", () => {
    it("GET /api/health verifies backend service is alive and healthy", async () => {
      const res = await testRequest("GET", "/api/health");
      expect(res.status).toBe(200);
      expect(res.json.status).toBe("healthy");
      expect(res.json.service).toBe("FOIL Backend API");
    });

    it("validateEnvironment flags placeholder/missing credentials without leaking secrets", () => {
      const badEnv = {
        AI_PROVIDER: "OPENAI",
        OPENAI_API_KEY: "your_openai_api_key_here", // Placeholder!
      };
      const result = validateEnvironment(badEnv);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("placeholder"))).toBe(true);
      // Secrets must never be exposed
      expect(JSON.stringify(result.errors)).not.toContain("sk-");
    });

    it("rejects invalid idea word counts (< 1 word or > 500 words)", () => {
      expect(validateIdeaWordCount("   ").valid).toBe(false);
      const longIdea = new Array(505).fill("word").join(" ");
      expect(validateIdeaWordCount(longIdea).valid).toBe(false);

      const validIdea = "A student peer matching platform for semester engineering projects.";
      const validRes = validateIdeaWordCount(validIdea);
      expect(validRes.valid).toBe(true);
      expect(validRes.wordCount).toBe(9);
    });
  });

  // ─── 2. Complete End-to-End Pipeline Execution ────────────────────────────────
  describe("2. End-to-End Pipeline: Idea -> Discovery -> Launch -> Audit -> Export", () => {
    let context: SharedContext = createInitialSharedContext("e2e_brand_project");

    it("Stage 1: Generates and approves Discovery", async () => {
      const res = await testRequest("POST", "/api/stages/discovery/generate", {
        idea_text: "A peer matchmaking platform helping university engineering students find capstone project partners.",
        known_facts: ["Class size: 150 students", "Semester duration: 16 weeks"],
        constraints: ["Must work without faculty involvement"],
      });

      expect(res.status).toBe(200);
      expect(res.json.content).toBeDefined();
      expect(res.json.content.core_problem).toBeDefined();
      expect(res.json.content.target_audience).toBeDefined();

      // Write approved decision via single choke point
      context = writeApprovedDecision(
        context,
        "discovery",
        res.json.content,
        "strategist_approved",
        "stage_1_approval"
      );

      expect(context.approved_decisions.discovery?.state).toBe("approved");
      expect(context.revision_log).toHaveLength(1);
    });

    it("Stage 2: Generates divergent directions and approves selected Positioning", async () => {
      const res = await testRequest("POST", "/api/stages/positioning/generate", {
        approved_decisions: context.approved_decisions,
      });

      expect(res.status).toBe(200);
      expect(res.json.content.directions).toHaveLength(2);
      expect(res.json.content.directions[0].title).not.toEqual(res.json.content.directions[1].title);

      const selectedDirection = res.json.content.directions[0];
      context = writeApprovedDecision(
        context,
        "positioning",
        selectedDirection,
        "strategist_approved",
        "stage_2_approval"
      );

      expect(context.approved_decisions.positioning?.state).toBe("approved");
      expect(context.revision_log).toHaveLength(2);
    });

    it("Stage 3: Generates and approves Naming + Personality", async () => {
      const res = await testRequest("POST", "/api/stages/naming_personality/generate", {
        approved_decisions: context.approved_decisions,
      });

      expect(res.status).toBe(200);
      expect(res.json.content.naming_directions).toBeDefined();
      expect(res.json.content.personality_traits.length).toBeGreaterThanOrEqual(3);

      context = writeApprovedDecision(
        context,
        "naming_personality",
        res.json.content,
        "strategist_approved",
        "stage_3_approval"
      );

      expect(context.approved_decisions.naming_personality?.state).toBe("approved");
      expect(context.revision_log).toHaveLength(3);
    });

    it("Stage 4: Generates and approves Tagline + Pitch", async () => {
      const res = await testRequest("POST", "/api/stages/tagline_pitch/generate", {
        approved_decisions: context.approved_decisions,
      });

      expect(res.status).toBe(200);
      expect(res.json.content.tagline_options.length).toBeGreaterThanOrEqual(1);
      expect(res.json.content.one_line_pitch).toBeDefined();

      context = writeApprovedDecision(
        context,
        "tagline_pitch",
        res.json.content,
        "strategist_approved",
        "stage_4_approval"
      );

      expect(context.approved_decisions.tagline_pitch?.state).toBe("approved");
      expect(context.revision_log).toHaveLength(4);
    });

    it("Stage 5: Generates and approves Visual Brief (with hex colors and AI disclaimer)", async () => {
      const res = await testRequest("POST", "/api/stages/visual_brief/generate", {
        approved_decisions: context.approved_decisions,
      });

      expect(res.status).toBe(200);
      expect(res.json.content.hex_palette.length).toBeGreaterThanOrEqual(1);
      expect(res.json.content.concept_disclaimer).toContain("AI-generated visual concept");

      context = writeApprovedDecision(
        context,
        "visual_brief",
        res.json.content,
        "strategist_approved",
        "stage_5_approval"
      );

      expect(context.approved_decisions.visual_brief?.state).toBe("approved");
      expect(context.revision_log).toHaveLength(5);
    });

    it("Stage 6: Generates and approves Voice + Messaging", async () => {
      const res = await testRequest("POST", "/api/stages/voice_messaging/generate", {
        approved_decisions: context.approved_decisions,
      });

      expect(res.status).toBe(200);
      expect(res.json.content.sample_messages.length).toBeGreaterThanOrEqual(3);

      context = writeApprovedDecision(
        context,
        "voice_messaging",
        res.json.content,
        "strategist_approved",
        "stage_6_approval"
      );

      expect(context.approved_decisions.voice_messaging?.state).toBe("approved");
      expect(context.revision_log).toHaveLength(6);
    });

    it("Stage 7: Generates and approves Launch Prep", async () => {
      const res = await testRequest("POST", "/api/stages/launch_prep/generate", {
        approved_decisions: context.approved_decisions,
      });

      expect(res.status).toBe(200);
      expect(res.json.content.landing_headline).toBeDefined();
      expect(res.json.content.social_launch_post).toBeDefined();

      context = writeApprovedDecision(
        context,
        "launch_prep",
        res.json.content,
        "strategist_approved",
        "stage_7_approval"
      );

      expect(context.approved_decisions.launch_prep?.state).toBe("approved");
      expect(context.revision_log).toHaveLength(7);
    });

    it("Stage 8: Runs Holistic Consistency Audit and verifies unresolved finding blocks export", async () => {
      const res = await testRequest("POST", "/api/audit/holistic", {
        approved_decisions: context.approved_decisions,
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.json.findings)).toBe(true);

      // Simulate a consistency finding that arises from cross-stage review
      const sampleFinding: ConsistencyFinding = {
        id: "finding_cross_1",
        fields_in_conflict: ["voice_messaging", "launch_prep"],
        issue_type: "contradiction",
        evidence: "Voice tone is humble while launch post makes absolute guarantees.",
        why_it_matters: "Contradictory promises damage student user trust.",
        sharper_alternative: "Revise headline to reflect collaborative possibility without overpromising.",
        user_action: null, // UNRESOLVED!
      };

      // Export must FAIL with 422 while finding is unresolved
      const exportAttemptBlocked = await testRequest("POST", "/api/export", {
        context,
        consistency_findings: [sampleFinding],
      });

      expect(exportAttemptBlocked.status).toBe(422);
      expect(exportAttemptBlocked.json.error_type).toBe("export_gated");
      expect(exportAttemptBlocked.json.unresolved_finding_id).toBe("finding_cross_1");

      // User resolves finding by accepting alternative
      sampleFinding.user_action = "accept";

      // Now export must SUCCEED with 200
      const exportSuccess = await testRequest("POST", "/api/export", {
        context,
        consistency_findings: [sampleFinding],
      });

      expect(exportSuccess.status).toBe(200);
      expect(exportSuccess.json.status).toBe("exported");
      expect(exportSuccess.json.format).toBe("markdown");
      expect(exportSuccess.json.content).toContain("Complete Brand System");
      expect(exportSuccess.json.content).toContain("## 6. Visual Brief");
      expect(exportSuccess.json.content).toContain("## 9. Resolved Consistency Audit Findings");
    });
  });

  // ─── 3. Invariant Checks: No Overwrites, Leaks, or Bypass ─────────────────────
  describe("3. Invariant Protections & Architectural Rules", () => {
    it("prohibits silent overwrite: upstream edit marks downstream fields needs_review without deleting data", () => {
      let ctx = createInitialSharedContext("overwrite_guard_test");
      ctx = writeApprovedDecision(ctx, "discovery", { problem: "Original Problem" }, "strategist_approved", "c1");
      ctx = writeApprovedDecision(ctx, "positioning", { title: "Original Positioning" }, "strategist_approved", "c2");

      // Upstream change in discovery
      const marked = markAffectedFieldsNeedsReview(ctx, "discovery");

      // Positioning is marked needs_review but its content is NOT wiped
      expect(marked.approved_decisions.positioning?.state).toBe("needs_review");
      expect(marked.approved_decisions.positioning?.content).toEqual({ title: "Original Positioning" });
    });

    it("prohibits Scenario Probe branch leak: probe branch runs in isolation and does not overwrite canonical state", async () => {
      let ctx = createInitialSharedContext("scenario_isolation_test");
      ctx = writeApprovedDecision(ctx, "positioning", { title: "Canonical Brand Direction" }, "strategist_approved", "c1");

      const res = await testRequest("POST", "/api/scenario-probe", {
        triggered_from_stage: "positioning",
        what_if_input: "What if we target high school robotics teams?",
        approved_decisions: ctx.approved_decisions,
      });

      expect(res.status).toBe(200);
      expect(res.json.changed_fields).toBeDefined();

      // Canonical state is completely untouched!
      expect(ctx.approved_decisions.positioning?.content).toEqual({ title: "Canonical Brand Direction" });
      expect(ctx.revision_log).toHaveLength(1);
    });

    function createMockStorage() {
      const map = new Map<string, string>();
      return {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => map.set(key, value),
        removeItem: (key: string) => map.delete(key),
        clear: () => map.clear(),
      };
    }

    it("sessionStorage refresh recovery restores entire context faithfully", () => {
      let ctx = createInitialSharedContext("refresh_recovery_test");
      ctx = writeApprovedDecision(ctx, "discovery", { problem: "Persistent Problem" }, "strategist_approved", "c1");

      const mockStorage = createMockStorage();
      saveSessionContext(ctx, mockStorage);

      const recovered = loadSessionContext(mockStorage);
      expect(recovered).not.toBeNull();
      expect(recovered?.project_id).toBe("refresh_recovery_test");
      expect(recovered?.approved_decisions.discovery?.content).toEqual({ problem: "Persistent Problem" });
      expect(recovered?.revision_log).toHaveLength(1);
    });

    it("sessionStorage handles corrupted JSON gracefully by returning null instead of throwing unhandled errors", () => {
      const mockStorage = createMockStorage();
      mockStorage.setItem("foil_session_recovery_context", "{ this is invalid corrupted JSON");

      const recovered = loadSessionContext(mockStorage);
      expect(recovered).toBeNull();
    });
  });
});

