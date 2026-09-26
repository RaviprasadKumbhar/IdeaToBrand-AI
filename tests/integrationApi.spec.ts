import { describe, expect, it } from "vitest";
import { app } from "../backend/src/server.js";
import { createInitialSharedContext, writeApprovedDecision } from "@foil/shared";
import {
  DiscoveryContent,
  LaunchPrepContent,
  NamingPersonalityContent,
  PositioningContent,
  TaglinePitchContent,
  VisualBriefContent,
  VoiceMessagingContent,
} from "@foil/shared";

// Simple test helper using node's http/fetch or supertest-like invocation
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

describe("T-037: Backend Integration API Endpoints", () => {
  it("GET /api/health returns 200 and healthy status", async () => {
    const res = await testRequest("GET", "/api/health");
    expect(res.status).toBe(200);
    expect(res.json.status).toBe("healthy");
    expect(res.json.service).toBe("FOIL Backend API");
  });

  it("POST /api/export returns 400 when context payload is missing", async () => {
    const res = await testRequest("POST", "/api/export", {});
    expect(res.status).toBe(400);
    expect(res.json.error_type).toBe("missing_context");
  });

  it("POST /api/export returns 422 with structured gating error when stages are unapproved", async () => {
    const ctx = createInitialSharedContext("project_test_gated");
    const res = await testRequest("POST", "/api/export", { context: ctx });

    expect(res.status).toBe(422);
    expect(res.json.error_type).toBe("export_gated");
    expect(res.json.missing_stage).toBe("discovery");
    expect(res.json.message).toBe("Stage 'discovery' has not been approved");
  });

  it("POST /api/export returns 200 with complete ExportBundle when brand system is fully approved", async () => {
    let ctx = createInitialSharedContext("project_api_success");

    const discovery: DiscoveryContent = {
      core_problem: "Campus capstone teammates are hard to assemble quickly",
      target_audience: "Senior university engineering students",
      context_situation: "Pre-semester project registration",
      user_goals: "Find qualified partner",
      constraints: "Credit restrictions",
      value_desired_outcome: "Balanced project team",
      open_questions: [],
      known_facts: ["Semester deadline in 2 weeks"],
      inferred_assumptions: [],
    };
    const positioning: PositioningContent = {
      title: "Vetted Peer Matching",
      category: "Academic Matchmaking",
      target_audience: "Senior engineers",
      core_problem: "Unvetted team rosters fail",
      differentiator: "Proof-of-work profiles",
      value_proposition: "Find verified peers in hours",
      competitive_angle: "Built for capstones",
      strategic_rationale: "Solves capstone panic",
      potential_weakness: "None",
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
      one_line_pitch: "CapstoneSync pairs verified engineering students into winning capstone teams.",
      rationale_per_tagline: ["Clear and immediate"],
    };
    const visual: VisualBriefContent = {
      logo_direction: "Modern geometric nodes",
      color_mood: "Technical indigo and clean slate",
      hex_palette: ["#1E293B", "#4F46E5", "#F8FAFC"],
      type_roles: ["Headings: Space Grotesk", "Body: Inter"],
      shape_language: "Rectilinear cards with subtle radii",
      symbol_language: "Connection pathways",
      composition_layout: "Structured 12-column grid",
      imagery_direction: "Authentic student engineering lab photos",
      concepts_to_avoid: ["Stock models"],
      rationale_linking_to_audience_and_positioning: "Technical credibility for engineers",
    };
    const voice: VoiceMessagingContent = {
      voice_description: "Direct and engineering-focused",
      tone_characteristics: ["Direct", "Pragmatic"],
      do_list: ["Be precise"],
      dont_list: ["Do not overpromise"],
      sample_messages: [{ message: "Lock in your final member.", explanation: "Urgency" }],
    };
    const launch: LaunchPrepContent = {
      landing_headline: "Form your capstone team without the drama.",
      social_launch_post: "Capstone registration is open. Assemble your squad on CapstoneSync.",
    };

    ctx = writeApprovedDecision(ctx, "discovery", discovery as any, "strategist_approved", "init");
    ctx = writeApprovedDecision(ctx, "positioning", positioning as any, "strategist_approved", "init");
    ctx = writeApprovedDecision(ctx, "naming_personality", naming as any, "strategist_approved", "init");
    ctx = writeApprovedDecision(ctx, "tagline_pitch", tagline as any, "strategist_approved", "init");
    ctx = writeApprovedDecision(ctx, "visual_brief", visual as any, "strategist_approved", "init");
    ctx = writeApprovedDecision(ctx, "voice_messaging", voice as any, "strategist_approved", "init");
    ctx = writeApprovedDecision(ctx, "launch_prep", launch as any, "strategist_approved", "init");

    const res = await testRequest("POST", "/api/export", { context: ctx });

    expect(res.status).toBe(200);
    expect(res.json.status).toBe("exported");
    expect(res.json.format).toBe("markdown");
    expect(res.json.content).toContain("# CapstoneSync — Complete Brand System");
    expect(res.json.content).toContain("## 6. Visual Brief");
  });
});
