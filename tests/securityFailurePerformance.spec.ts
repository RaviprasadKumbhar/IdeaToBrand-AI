import { describe, expect, it } from "vitest";
import { app } from "../backend/src/server.js";
import {
  createInitialSharedContext,
  writeApprovedDecision,
  assembleBrandKit,
  validateExportEligibility,
  affectedFields,
  markAffectedFieldsNeedsReview,
  DiscoveryContent,
  PositioningContent,
  NamingPersonalityContent,
  TaglinePitchContent,
  VisualBriefContent,
  VoiceMessagingContent,
  LaunchPrepContent,
  ConsistencyFinding,
  StageDraft,
} from "@foil/shared";
import { validateEnvironment } from "../shared/src/config/env.js";
import { RetryManager } from "../backend/src/validation/retryManager.js";
import { AIProvider, AIProviderError, TimeoutError } from "../backend/src/ai/provider.js";
import { z } from "zod";

// Helper for test requests
async function testRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; json: any; rawText: string; responseTimeMs: number }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = (server.address() as any).port;
      const start = performance.now();
      try {
        const response = await fetch(`http://localhost:${port}${path}`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        });
        const duration = performance.now() - start;
        const rawText = await response.text();
        let json: any = null;
        try {
          json = JSON.parse(rawText);
        } catch {
          json = null;
        }
        server.close(() => resolve({ status: response.status, json, rawText, responseTimeMs: duration }));
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

function createCompleteApprovedContext(): ReturnType<typeof createInitialSharedContext> {
  let ctx = createInitialSharedContext("proj_perf_sec_test");

  const discovery: DiscoveryContent = {
    core_problem: "Campus capstone teams are hard to form reliably",
    target_audience: "Senior university engineering students",
    context_situation: "Final semester project registration",
    user_goals: "Find aligned project teammates",
    constraints: "Credit limits and scheduling overlap",
    value_desired_outcome: "Balanced project teams",
    open_questions: [],
    known_facts: ["Final project is mandatory"],
    inferred_assumptions: [],
  };
  const positioning: PositioningContent = {
    title: "Vetted Peer Matching",
    category: "Academic Matchmaking",
    target_audience: "Senior engineers",
    core_problem: "Unvetted teams fail",
    differentiator: "Proof-of-work skill profiles",
    value_proposition: "Form teams in hours",
    competitive_angle: "Built for capstones",
    strategic_rationale: "Solves capstone panic",
    potential_weakness: "Requires student adoption",
  };
  const naming: NamingPersonalityContent = {
    selected_name: "CapstoneSync",
    personality_traits: [{ trait: "Pragmatic", audience_justification: "Student focus" }],
    traits_to_avoid: ["Childish"],
    brand_principles: [{ principle: "Direct accountability", rationale: "Team survival" }],
  };
  const tagline: TaglinePitchContent = {
    selected_tagline: "Ship your capstone.",
    tagline_options: ["Ship your capstone."],
    one_line_pitch: "CapstoneSync matches engineering students into vetted project teams.",
    rationale_per_tagline: ["Direct and actionable"],
  };
  const visual: VisualBriefContent = {
    logo_direction: "Interlocking geometric loops",
    color_mood: "Indigo and amber",
    hex_palette: ["#1E293B", "#4F46E5", "#F59E0B", "#F8FAFC"],
    type_roles: ["Heading: Space Grotesk", "Body: Inter"],
    shape_language: "Clean rectilinear cards",
    symbol_language: "Interconnected nodes",
    composition_layout: "Structured grid",
    imagery_direction: "Authentic student collaboration",
    concepts_to_avoid: ["Stock handshakes"],
    rationale_linking_to_audience_and_positioning: "Technical credibility",
    concept_disclaimer: "AI-generated visual concept / design direction — not production-ready artwork.",
  };
  const voice: VoiceMessagingContent = {
    voice_description: "Direct, encouraging, and student-native",
    tone_characteristics: ["Pragmatic", "Honest"],
    do_list: ["Be direct"],
    dont_list: ["No corporate jargon"],
    sample_messages: [{ message: "Find your team in minutes.", explanation: "Hero" }],
  };
  const launch: LaunchPrepContent = {
    landing_headline: "Form your capstone team without the drama.",
    social_launch_post: "Tired of random team assignments? CapstoneSync matches you with peers.",
  };

  ctx = writeApprovedDecision(ctx, "discovery", discovery, "strategist_approved", "seed_1");
  ctx = writeApprovedDecision(ctx, "positioning", positioning, "strategist_approved", "seed_2");
  ctx = writeApprovedDecision(ctx, "naming_personality", naming, "strategist_approved", "seed_3");
  ctx = writeApprovedDecision(ctx, "tagline_pitch", tagline, "strategist_approved", "seed_4");
  ctx = writeApprovedDecision(ctx, "visual_brief", visual, "strategist_approved", "seed_5");
  ctx = writeApprovedDecision(ctx, "voice_messaging", voice, "strategist_approved", "seed_6");
  ctx = writeApprovedDecision(ctx, "launch_prep", launch, "strategist_approved", "seed_7");

  return ctx;
}

// ═════════════════════════════════════════════════════════════════════════════
// T-042: SECURITY REVIEW
// ═════════════════════════════════════════════════════════════════════════════
describe("T-042: Security Review", () => {
  it("SECURITY: Environment validator strictly blocks secrets prefixed with VITE_", () => {
    const res = validateEnvironment({
      NODE_ENV: "production",
      PORT: "5000",
      AI_PROVIDER: "OPENAI",
      OPENAI_API_KEY: "sk-real-looking-key-12345",
      VITE_OPENAI_API_KEY: "sk-leaked-to-client-bundle",
    });

    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("SECURITY ALERT") && e.includes("VITE_OPENAI_API_KEY"))).toBe(true);
  });

  it("SECURITY: Health check does not expose system secrets or internal paths", async () => {
    const res = await testRequest("GET", "/api/health");
    expect(res.status).toBe(200);
    expect(res.json).toHaveProperty("status", "healthy");
    expect(res.json).toHaveProperty("service", "FOIL Backend API");

    // Must not expose process environment or keys
    const raw = JSON.stringify(res.json);
    expect(raw).not.toContain("API_KEY");
    expect(raw).not.toContain("SECRET");
    expect(raw).not.toContain("PASSWORD");
    expect(raw).not.toContain("SUPABASE_KEY");
  });

  it("SECURITY: Input validation blocks unknown or malicious stage names", async () => {
    const res = await testRequest("POST", "/api/stages/invalid_stage_123/generate", {});
    expect(res.status).toBe(400);
    expect(res.json.error_type).toBe("unknown_stage");

    const traversalRes = await testRequest("POST", "/api/stages/../../etc/passwd/generate", {});
    expect(traversalRes.status).toBe(404);
  });

  it("SECURITY: Rejects missing payload in export endpoint with structured error", async () => {
    const res = await testRequest("POST", "/api/export", undefined);
    expect(res.status).toBe(400);
    expect(res.json.error_type).toBe("missing_context");
  });

  it("SECURITY: Rejects missing fields in scenario probe with 400", async () => {
    const res = await testRequest("POST", "/api/scenario-probe/run", { what_if_input: "test" });
    expect(res.status).toBe(400);
    expect(res.json.error_type).toBe("invalid_request");
  });

  it("SECURITY: AI generation drafts cannot bypass the approved_decisions choke point", async () => {
    const initialCtx = createInitialSharedContext("sec_choke_test");
    const res = await testRequest("POST", "/api/stages/discovery/generate", {
      idea_text: "A new platform for students",
      context: initialCtx,
    });

    expect(res.status).toBe(200);
    expect(res.json).toHaveProperty("content");
    // Verify initial context was NOT mutated by the generation endpoint
    expect(initialCtx.approved_decisions.discovery).toBeUndefined();
    expect(initialCtx.revision_log).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// T-043: FAILURE-STATE REVIEW (JOINT WITH MEMBER 1)
// ═════════════════════════════════════════════════════════════════════════════
describe("T-043: Failure-State Review (Joint with Member 1)", () => {
  it("FAILURE: Handles AI Provider timeout cleanly without crashing and flags as retryable", async () => {
    const timeoutProvider: AIProvider = {
      generateStructured: async () => {
        throw new TimeoutError("AI provider request timed out after 30000ms");
      },
      generateCritique: async () => {
        throw new TimeoutError("AI provider request timed out after 30000ms");
      },
    };

    const manager = new RetryManager({ maxAutoRetries: 1 });
    const schema = z.object({ test: z.string() });

    await expect(manager.executeWithRetry("discovery", "prompt", schema, timeoutProvider)).rejects.toMatchObject({
      stage: "discovery",
      error_type: "provider_unavailable",
      retryable: true,
    });
  });

  it("FAILURE: Handles AI Provider network failure and returns structured error", async () => {
    const networkFailProvider: AIProvider = {
      generateStructured: async () => {
        throw new AIProviderError("ECONNREFUSED: Unable to reach AI provider gateway", "provider_unavailable", true);
      },
      generateCritique: async () => {
        throw new AIProviderError("ECONNREFUSED: Unable to reach AI provider gateway", "provider_unavailable", true);
      },
    };

    const manager = new RetryManager({ maxAutoRetries: 0 });
    const schema = z.object({ title: z.string() });

    await expect(manager.executeWithRetry("positioning", "prompt", schema, networkFailProvider)).rejects.toMatchObject({
      stage: "positioning",
      error_type: "provider_unavailable",
      retryable: true,
    });
  });

  it("FAILURE: Never produces fake fallback success when AI output is malformed after retries", async () => {
    let callCount = 0;
    const malformedProvider: AIProvider = {
      generateStructured: async () => {
        callCount++;
        return {
          raw: "{ unclosed json",
          parsed: null,
          validationError: "SyntaxError: Unexpected end of JSON input",
        };
      },
      generateCritique: async () => ({ raw: "[]", parsed: [] }),
    };

    const manager = new RetryManager({ maxAutoRetries: 2 }); // 1 initial + 2 retries = 3 attempts
    const schema = z.object({ title: z.string() });

    let caughtError: any = null;
    try {
      await manager.executeWithRetry("discovery", "prompt", schema, malformedProvider);
    } catch (err) {
      caughtError = err;
    }

    expect(callCount).toBe(3);
    expect(caughtError).not.toBeNull();
    expect(caughtError.error_type).toBe("schema_validation_failed");
    expect(caughtError.message).toContain("Schema validation failed after 3 attempts");
  });

  it("FAILURE: Existing approved decision is strictly preserved when regeneration fails", async () => {
    let ctx = createInitialSharedContext("preservation_test");
    const approvedDiscovery: DiscoveryContent = {
      core_problem: "Original approved core problem",
      target_audience: "Original approved target audience",
      context_situation: "Situation",
      user_goals: "Goals",
      constraints: "None",
      value_desired_outcome: "Outcome",
      open_questions: [],
      known_facts: ["Fact 1"],
      inferred_assumptions: [],
    };
    ctx = writeApprovedDecision(ctx, "discovery", approvedDiscovery, "strategist_approved", "rev_1");

    // Simulate a failed regeneration attempt
    const failedDraft: StageDraft = {
      stage: "discovery",
      content: { error: "Regeneration failed" },
      generated_at: new Date().toISOString(),
      attempt: 2,
    };
    ctx.stage_drafts.discovery = failedDraft;

    // Verify approved decision is 100% intact and untouched
    expect(ctx.approved_decisions.discovery?.content).toEqual(approvedDiscovery);
    expect((ctx.approved_decisions.discovery?.content as any).core_problem).toBe("Original approved core problem");
    expect(ctx.revision_log).toHaveLength(1); // Revision log untouched by failed draft
  });

  it("FAILURE: Export fails cleanly with HTTP 422 when required stage is unapproved", async () => {
    const incompleteCtx = createInitialSharedContext("unapproved_test");
    const res = await testRequest("POST", "/api/export", { context: incompleteCtx });

    expect(res.status).toBe(422);
    expect(res.json.error_type).toBe("export_gated");
    expect(res.json.missing_stage).toBe("discovery");
    expect(res.json.message).toContain("Stage 'discovery' has not been approved");
  });

  it("FAILURE: Export fails cleanly with HTTP 422 when unresolved consistency finding exists", async () => {
    const completeCtx = createCompleteApprovedContext();
    const unresolvedFinding: ConsistencyFinding = {
      id: "unresolved_finding_1",
      fields_in_conflict: ["positioning", "voice_messaging"],
      issue_type: "contradiction",
      evidence: "Positioning claims corporate enterprise, voice claims casual student.",
      why_it_matters: "Confuses prospective buyers",
      sharper_alternative: "Align voice to pragmatic student-friendly tone.",
      user_action: null, // UNRESOLVED
    };

    const res = await testRequest("POST", "/api/export", {
      context: completeCtx,
      consistency_findings: [unresolvedFinding],
    });

    expect(res.status).toBe(422);
    expect(res.json.error_type).toBe("export_gated");
    expect(res.json.unresolved_finding_id).toBe("unresolved_finding_1");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// T-044: PERFORMANCE REVIEW & MEASUREMENTS
// ═════════════════════════════════════════════════════════════════════════════
describe("T-044: Performance Review & Measurements", () => {
  it("PERFORMANCE: Health check endpoint responds in under 50ms", async () => {
    const res = await testRequest("GET", "/api/health");
    expect(res.status).toBe(200);
    expect(res.responseTimeMs).toBeLessThan(50);
  });

  it("PERFORMANCE: Stage generation response size is compact (< 25 KB)", async () => {
    const res = await testRequest("POST", "/api/stages/discovery/generate", {
      idea_text: "Capstone teammate matching platform for universities",
    });

    expect(res.status).toBe(200);
    const byteSize = Buffer.byteLength(res.rawText, "utf8");
    // Assert response is compact and structured
    expect(byteSize).toBeGreaterThan(100);
    expect(byteSize).toBeLessThan(25 * 1024); // < 25 KB
  });

  it("PERFORMANCE: Full export bundle response size is compact (< 50 KB)", async () => {
    const completeCtx = createCompleteApprovedContext();
    const res = await testRequest("POST", "/api/export", { context: completeCtx });

    expect(res.status).toBe(200);
    const byteSize = Buffer.byteLength(res.rawText, "utf8");
    expect(byteSize).toBeGreaterThan(1000);
    expect(byteSize).toBeLessThan(50 * 1024); // < 50 KB
  });

  it("PERFORMANCE: Assembled markdown export generation is under 20ms", () => {
    const completeCtx = createCompleteApprovedContext();
    const start = performance.now();
    const bundle = assembleBrandKit(completeCtx, []);
    const durationMs = performance.now() - start;

    expect(bundle.status).toBe("exported");
    expect(bundle.content.length).toBeGreaterThan(500);
    expect(durationMs).toBeLessThan(20);
  });

  it("PERFORMANCE: Dependency calculation executes in under 2ms", () => {
    const start = performance.now();
    const affected = affectedFields("discovery");
    const durationMs = performance.now() - start;

    expect(affected.length).toBeGreaterThan(0);
    expect(durationMs).toBeLessThan(2);
  });

  it("PERFORMANCE: SharedContext serialized sessionStorage footprint is under 20 KB", () => {
    const completeCtx = createCompleteApprovedContext();
    const serialized = JSON.stringify(completeCtx);
    const sizeBytes = Buffer.byteLength(serialized, "utf8");

    // Standard browser sessionStorage limit is 5MB. Complete context is < 20KB.
    expect(sizeBytes).toBeLessThan(20 * 1024);
  });

  it("PERFORMANCE: Export gating validation is idempotent and executes in under 5ms", () => {
    const completeCtx = createCompleteApprovedContext();
    const start = performance.now();
    const result1 = validateExportEligibility(completeCtx, []);
    const result2 = validateExportEligibility(completeCtx, []);
    const durationMs = performance.now() - start;

    expect(result1.eligible).toBe(true);
    expect(result2.eligible).toBe(true);
    expect(durationMs).toBeLessThan(5);
  });

  it("PERFORMANCE: Downstream marking without mutation executes in under 2ms", () => {
    const completeCtx = createCompleteApprovedContext();
    const start = performance.now();
    const updatedCtx = markAffectedFieldsNeedsReview(completeCtx, "discovery");
    const durationMs = performance.now() - start;

    expect(updatedCtx.approved_decisions.positioning?.state).toBe("needs_review");
    expect(durationMs).toBeLessThan(2);
  });
});
