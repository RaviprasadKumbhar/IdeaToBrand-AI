import { describe, it, expect } from "vitest";
import { app } from "../backend/src/server.js";
import {
  createInitialSharedContext,
  writeApprovedDecision,
  acceptScenarioBranch,
  type SharedContext,
  type StageName,
} from "@foil/shared";
import { ScenarioProbeService } from "../backend/src/stages/scenarioProbe.js";
import { MockAIProvider } from "../backend/src/ai/providers/mock.js";

// Helper for HTTP requests against Express server
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

describe("FOIL — Deep AI Intelligence, Contextual Generation & Scenario Probe Verification", () => {
  // ─── PART 1: DOMAIN DIFFERENTIATION & CONTEXTUAL GROUNDING (TESTS A, B, C) ─
  describe("Section 33 & 34: Output Differentiation & Domain Grounding", () => {
    it("TEST A — FARMER: generates farmer-grounded Discovery, Positioning, and Brand System", async () => {
      const farmerIdea = "Platform helping farmers sell vegetables directly to local customers.";

      // 1. Discovery
      const discRes = await testRequest("POST", "/api/stages/discovery/generate", {
        idea_text: farmerIdea,
      });
      expect(discRes.status).toBe(200);
      const disc = discRes.json.content;

      // Semantic checks (NOT just string inequality)
      expect(disc.core_problem.toLowerCase()).toMatch(/farmer|middlemen|produce|harvest|distribution/);
      expect(disc.target_audience.toLowerCase()).toMatch(/farmer|household|grower|produce|customer/);
      expect(disc.constraints.toLowerCase()).toMatch(/harvest|delivery|freshness|price/);

      // 2. Positioning
      const posRes = await testRequest("POST", "/api/stages/positioning/generate", {
        approved_decisions: {
          discovery: { stage: "discovery", content: disc, state: "approved" },
        },
      });
      expect(posRes.status).toBe(200);
      const pos = posRes.json.content;
      expect(pos.directions.length).toBeGreaterThanOrEqual(2);

      // Verify divergence between Direction 1 and 2
      const [d1, d2] = pos.directions;
      expect(d1.title).not.toEqual(d2.title);
      expect(d1.category).not.toEqual(d2.category);
      expect(d1.value_proposition.toLowerCase()).toMatch(/farm|soil|table|produce|harvest/);

      // 3. Naming
      const nameRes = await testRequest("POST", "/api/stages/naming_personality/generate", {
        approved_decisions: {
          discovery: { stage: "discovery", content: disc, state: "approved" },
          positioning: { stage: "positioning", content: pos, state: "approved" },
        },
      });
      expect(nameRes.status).toBe(200);
      const name = nameRes.json.content;
      expect(name.naming_directions[0].proposed_name).toBe("HarvestDirect");
      expect(name.personality_traits.some((t: any) => /grounded|transparent|nourishing/i.test(t.trait))).toBe(true);

      // 4. Tagline
      const tagRes = await testRequest("POST", "/api/stages/tagline_pitch/generate", {
        approved_decisions: {
          positioning: { stage: "positioning", content: pos, state: "approved" },
          naming_personality: { stage: "naming_personality", content: name, state: "approved" },
        },
      });
      expect(tagRes.status).toBe(200);
      const tag = tagRes.json.content;
      expect(tag.one_line_pitch.toLowerCase()).toMatch(/farmer|harvest|middlemen|produce/);
    });

    it("TEST B — EDUCATION: generates student-grounded Discovery, Positioning, and Brand System", async () => {
      const eduIdea = "AI tutor for engineering students preparing for university exams.";

      // 1. Discovery
      const discRes = await testRequest("POST", "/api/stages/discovery/generate", {
        idea_text: eduIdea,
      });
      expect(discRes.status).toBe(200);
      const disc = discRes.json.content;

      expect(disc.core_problem.toLowerCase()).toMatch(/engineering|problem set|socratic|coursework|exam/);
      expect(disc.target_audience.toLowerCase()).toMatch(/student|stem|engineering/);
      expect(disc.value_desired_outcome.toLowerCase()).toMatch(/mastery|grade|problem|study/);

      // 2. Positioning
      const posRes = await testRequest("POST", "/api/stages/positioning/generate", {
        approved_decisions: {
          discovery: { stage: "discovery", content: disc, state: "approved" },
        },
      });
      expect(posRes.status).toBe(200);
      const pos = posRes.json.content;
      expect(pos.directions[0].category.toLowerCase()).toMatch(/stem|learning|socratic|engineering/);
      expect(pos.directions[0].differentiator.toLowerCase()).toMatch(/socratic|reasoning|step-by-step/);

      // 3. Naming
      const nameRes = await testRequest("POST", "/api/stages/naming_personality/generate", {
        approved_decisions: {
          discovery: { stage: "discovery", content: disc, state: "approved" },
          positioning: { stage: "positioning", content: pos, state: "approved" },
        },
      });
      expect(nameRes.status).toBe(200);
      const name = nameRes.json.content;
      expect(name.naming_directions[0].proposed_name).toBe("StudyEngine");
      expect(name.personality_traits.some((t: any) => /analytical|precise|encouraging/i.test(t.trait))).toBe(true);
    });

    it("TEST C — RESTAURANT: generates dedicated restaurant reservation strategy, NOT salon/clinic scheduling", async () => {
      const restaurantIdea = "Software helping local restaurants manage reservations and customer appointments.";

      // 1. Discovery
      const discRes = await testRequest("POST", "/api/stages/discovery/generate", {
        idea_text: restaurantIdea,
      });
      expect(discRes.status).toBe(200);
      const disc = discRes.json.content;

      // Invariant: MUST speak directly to restaurant, dining, table seating, no-shows, covers
      expect(disc.core_problem.toLowerCase()).toMatch(/restaurant|seating|no-show|commission|reservation/);
      expect(disc.target_audience.toLowerCase()).toMatch(/restaurant|bistro|dining|chef/);
      expect(disc.core_problem.toLowerCase()).not.toContain("salon");
      expect(disc.core_problem.toLowerCase()).not.toContain("doctor");

      // 2. Positioning
      const posRes = await testRequest("POST", "/api/stages/positioning/generate", {
        approved_decisions: {
          discovery: { stage: "discovery", content: disc, state: "approved" },
        },
      });
      expect(posRes.status).toBe(200);
      const pos = posRes.json.content;
      expect(pos.directions[0].title).toBe("The Direct-to-Table Platform");
      expect(pos.directions[0].category.toLowerCase()).toMatch(/restaurant|dining|table/);
      expect(pos.directions[0].value_proposition.toLowerCase()).toMatch(/table|cover|commission/);

      // 3. Naming
      const nameRes = await testRequest("POST", "/api/stages/naming_personality/generate", {
        approved_decisions: {
          discovery: { stage: "discovery", content: disc, state: "approved" },
          positioning: { stage: "positioning", content: pos, state: "approved" },
        },
      });
      expect(nameRes.status).toBe(200);
      const name = nameRes.json.content;
      expect(name.naming_directions[0].proposed_name).toBe("TableFlow");
      expect(name.personality_traits.some((t: any) => /hospitable|uncompromising|discreet/i.test(t.trait))).toBe(true);

      // 4. Visual Brief
      const visRes = await testRequest("POST", "/api/stages/visual_brief/generate", {
        approved_decisions: {
          positioning: { stage: "positioning", content: pos, state: "approved" },
          naming_personality: { stage: "naming_personality", content: name, state: "approved" },
        },
      });
      expect(visRes.status).toBe(200);
      const vis = visRes.json.content;
      expect(vis.color_mood.toLowerCase()).toMatch(/burgundy|bistro|brass|linen/);
      expect(vis.symbol_language.toLowerCase()).toMatch(/stemware|table|candlelight|reservation/);
    });

    it("Section 34: Meaningful semantic divergence across Farmer, Education, and Restaurant domains", async () => {
      const [resA, resB, resC] = await Promise.all([
        testRequest("POST", "/api/stages/discovery/generate", { idea_text: "Platform helping farmers sell vegetables directly." }),
        testRequest("POST", "/api/stages/discovery/generate", { idea_text: "AI tutor for engineering students preparing for exams." }),
        testRequest("POST", "/api/stages/discovery/generate", { idea_text: "Software helping local restaurants manage reservations." }),
      ]);

      const a = resA.json.content;
      const b = resB.json.content;
      const c = resC.json.content;

      // Disjoint semantic domains
      expect(a.target_audience).not.toEqual(b.target_audience);
      expect(b.target_audience).not.toEqual(c.target_audience);
      expect(a.core_problem).not.toEqual(b.core_problem);
      expect(b.core_problem).not.toEqual(c.core_problem);

      // Domain-specific keyword isolation
      expect(a.target_audience.toLowerCase()).toContain("farmer");
      expect(b.target_audience.toLowerCase()).toContain("student");
      expect(c.target_audience.toLowerCase()).toContain("restaurant");
    });
  });

  // ─── PART 2: CRITIC ADVERSARIAL EVALUATION (SECTION 19 & 20) ──────────────
  describe("Section 19 & 20: Critic Adversarial Evaluation & Schema Invariants", () => {
    it("Critic evaluates drafts and produces structured findings with valid issue types and sharper alternatives", async () => {
      const posRes = await testRequest("POST", "/api/stages/positioning/generate", {
        approved_decisions: {
          discovery: {
            stage: "discovery",
            content: { core_problem: "Local distribution costs are high" },
            state: "approved",
          },
        },
      });
      expect(posRes.status).toBe(200);
      expect(Array.isArray(posRes.json.findings)).toBe(true);

      const findings = posRes.json.findings;
      expect(findings.length).toBeGreaterThan(0);

      // Invariants for each finding
      for (const f of findings) {
        expect(f.id).toBeDefined();
        expect(["cliche", "audience_mismatch", "contradiction", "vague", "bias"]).toContain(f.issue_type);
        expect(f.target_field).toBeDefined();
        expect(f.evidence.length).toBeGreaterThan(0);
        expect(f.explanation.length).toBeGreaterThan(0);
        expect(f.sharper_alternative.length).toBeGreaterThan(0);
        expect(f.user_action).toBeNull();
      }
    });

    it("Critic rejects findings missing a sharper_alternative", async () => {
      const invalidFinding = [
        {
          id: "crit-bad",
          stage: "positioning",
          target_field: "differentiator",
          issue_type: "cliche",
          evidence: "Bad evidence",
          explanation: "Bad explanation",
          sharper_alternative: "", // PROHIBITED!
          user_action: null,
        },
      ];

      const customProvider = new MockAIProvider({
        mockResponseGenerator: () => JSON.stringify(invalidFinding),
      });

      const { CriticEngine } = await import("../backend/src/critic/index.js");
      const critic = new CriticEngine();

      await expect(
        critic.critiqueStage(
          "positioning",
          { differentiator: "All in one" },
          { approved_decisions: {} },
          customProvider
        )
      ).rejects.toMatchObject({
        error_type: "schema_validation_failed",
      });
    });
  });

  // ─── PART 3: SCENARIO PROBE (TESTS E, F, G, SECTION 21–25) ─────────────────
  describe("Section 21–25 & 33: Scenario Probe Branching, Isolation & Revision Cycle", () => {
    it("TEST E — SCENARIO: pivots engineering students to working software engineers and regenerates downstream fields", async () => {
      // Step 1: Establish canonical approved context for Engineering Students
      let ctx = createInitialSharedContext("proj_scenario_e");
      ctx = writeApprovedDecision(
        ctx,
        "discovery",
        {
          core_problem: "Engineering students struggle with late-night coursework problem sets",
          target_audience: "Undergraduate engineering students",
        },
        "strategist_approved",
        "init"
      );
      ctx = writeApprovedDecision(
        ctx,
        "positioning",
        {
          title: "The Socratic Problem Solver",
          category: "AI STEM Learning / Problem Solver",
          target_audience: "Undergraduate engineering students",
          value_proposition: "Master complex engineering problem sets with instant Socratic guidance 24/7",
        },
        "strategist_approved",
        "p1"
      );

      // Step 2: Run Scenario Probe on positioning
      const res = await testRequest("POST", "/api/scenario-probe/run", {
        context: ctx,
        triggered_from_stage: "positioning",
        what_if_input: "Now imagine the product is for working software engineers instead.",
      });

      expect(res.status).toBe(200);
      expect(res.json.scenario_id).toBeDefined();
      expect(res.json.affected_stages).toEqual([
        "naming_personality",
        "tagline_pitch",
        "visual_brief",
        "voice_messaging",
        "launch_prep",
      ]);

      // Step 3: Verify downstream fields adapted to WORKING SOFTWARE ENGINEERS
      const namingComp = res.json.comparisons.find((c: any) => c.stage === "naming_personality");
      expect(namingComp).toBeDefined();
      expect(namingComp.branch_draft.content.naming_directions[0].proposed_name).toBe("DevEngine");
      expect(namingComp.branch_draft.content.personality_traits.some((t: any) => /authoritative|robust|efficient/i.test(t.trait))).toBe(true);

      const taglineComp = res.json.comparisons.find((c: any) => c.stage === "tagline_pitch");
      expect(taglineComp).toBeDefined();
      expect(taglineComp.branch_draft.content.one_line_pitch.toLowerCase()).toMatch(/software engineer|codebase|architectural|refactor/);

      const visualComp = res.json.comparisons.find((c: any) => c.stage === "visual_brief");
      expect(visualComp).toBeDefined();
      expect(visualComp.branch_draft.content.color_mood.toLowerCase()).toMatch(/terminal|charcoal|cyan/);

      // Verify changed fields were extracted
      expect(res.json.changed_fields.length).toBeGreaterThan(0);
      expect(Array.isArray(res.json.branch_critic_findings)).toBe(true);

      // Hard Invariant: Original context was 100% UNTOUCHED
      expect(ctx.approved_decisions.positioning?.content.title).toBe("The Socratic Problem Solver");
      expect(ctx.approved_decisions.naming_personality).toBeUndefined();
      expect(ctx.scenario_overrides).toHaveLength(0);
    });

    it("TEST F — SCENARIO REJECTION: Keep Original leaves approved_decisions completely untouched", async () => {
      let ctx = createInitialSharedContext("proj_scenario_f");
      ctx = writeApprovedDecision(
        ctx,
        "positioning",
        { title: "Canonical Brand Direction" },
        "strategist_approved",
        "p1"
      );

      // Create branch via service
      const service = new ScenarioProbeService();
      const probeResult = await service.createScenarioBranch(
        ctx,
        "positioning",
        "Pivot from DTC to enterprise B2B sales",
        new MockAIProvider()
      );

      const scenarioId = probeResult.scenario_override.id;

      // Call Keep Original
      const keepRes = await testRequest("POST", "/api/scenario-probe/keep", {
        context: probeResult.updated_context,
        scenario_id: scenarioId,
      });

      expect(keepRes.status).toBe(200);
      const updatedCtx = keepRes.json.context;

      // Canonical state is untouched!
      expect(updatedCtx.approved_decisions.positioning.content.title).toBe("Canonical Brand Direction");
      expect(updatedCtx.approved_decisions.naming_personality).toBeUndefined();
      // Scenario is marked 'keep_original'
      const override = updatedCtx.scenario_overrides.find((s: any) => s.id === scenarioId);
      expect(override.decision).toBe("keep_original");
    });

    it("TEST G — SCENARIO ACCEPTANCE: Accept Branch applies branch drafts through writeApprovedDecision with revision log", async () => {
      let ctx = createInitialSharedContext("proj_scenario_g");
      ctx = writeApprovedDecision(
        ctx,
        "positioning",
        { title: "Initial Consumer Positioning" },
        "strategist_approved",
        "p1"
      );

      // Create branch
      const service = new ScenarioProbeService();
      const probeResult = await service.createScenarioBranch(
        ctx,
        "positioning",
        "Pivot to B2B enterprise procurement",
        new MockAIProvider()
      );

      const scenarioId = probeResult.scenario_override.id;

      // Accept branch over API
      const acceptRes = await testRequest("POST", "/api/scenario-probe/accept", {
        context: probeResult.updated_context,
        scenario_id: scenarioId,
      });

      expect(acceptRes.status).toBe(200);
      const updatedCtx = acceptRes.json.context;

      // Accepted branch draft for naming_personality is now in approved_decisions!
      expect(updatedCtx.approved_decisions.naming_personality).toBeDefined();
      expect(updatedCtx.approved_decisions.naming_personality.state).toBe("approved");
      expect(updatedCtx.approved_decisions.naming_personality.source).toBe("scenario_accept");

      // Revision log has entries with cause 'scenario_accept'
      const revision = updatedCtx.revision_log.find((r: any) => r.cause === "scenario_accept");
      expect(revision).toBeDefined();
      expect(revision.changed_field).toBe("naming_personality");
    });
  });

  // ─── PART 4: RELIABILITY, OBSERVABILITY & ERROR HANDLING (TEST H, I, J) ────
  describe("Section 33 & 36: Failure Visibility, Refresh Recovery & Multi-Tenant Isolation", () => {
    it("TEST H — AI FAILURE: provider failure returns structured error, never fake success or cached old state", async () => {
      const failingProvider = new MockAIProvider({ simulateError: true });
      const { PositioningStageService } = await import("../backend/src/stages/positioning.js");
      const service = new PositioningStageService();

      await expect(
        service.generatePositioningDirections(
          {
            approved_decisions: {
              discovery: {
                stage: "discovery",
                content: { core_problem: "High logistics costs" },
                state: "approved",
                approved_at: new Date().toISOString(),
                source: "strategist_approved",
              },
            },
          },
          failingProvider
        )
      ).rejects.toMatchObject({
        error_type: "provider_unavailable",
      });
    });

    it("TEST I — REFRESH / STATE PERSISTENCE: context round-trip preserves canonical approved decisions", () => {
      let ctx = createInitialSharedContext("proj_refresh_test");
      ctx = writeApprovedDecision(
        ctx,
        "discovery",
        { core_problem: "Unique founder challenge", target_audience: "Pioneers" },
        "strategist_approved",
        "init_approval"
      );

      // Serialize (as done to sessionStorage / Supabase)
      const serialized = JSON.stringify(ctx);
      const deserialized: SharedContext = JSON.parse(serialized);

      expect(deserialized.project_id).toBe("proj_refresh_test");
      expect(deserialized.approved_decisions.discovery?.content.core_problem).toBe("Unique founder challenge");
      expect(deserialized.revision_log).toHaveLength(1);
    });

    it("TEST J — TWO PROJECTS: Project A and Project B maintain strict data isolation", () => {
      let ctxA = createInitialSharedContext("proj_tenant_a");
      ctxA.user_facts = { concept: "AgriTech for Farmers" };
      ctxA = writeApprovedDecision(
        ctxA,
        "discovery",
        { core_problem: "Farmers lose margin to middlemen" },
        "strategist_approved",
        "a1"
      );

      let ctxB = createInitialSharedContext("proj_tenant_b");
      ctxB.user_facts = { concept: "Restaurant Reservation Engine" };
      ctxB = writeApprovedDecision(
        ctxB,
        "discovery",
        { core_problem: "Independent restaurants suffer from table no-shows" },
        "strategist_approved",
        "b1"
      );

      // Verify zero cross-contamination
      expect(ctxA.project_id).not.toEqual(ctxB.project_id);
      expect(ctxA.user_facts.concept).not.toEqual(ctxB.user_facts.concept);
      expect(ctxA.approved_decisions.discovery?.content.core_problem).toContain("Farmers");
      expect(ctxB.approved_decisions.discovery?.content.core_problem).toContain("restaurants");
      expect(ctxA.revision_log[0].id).not.toEqual(ctxB.revision_log[0].id);
    });
  });
});
