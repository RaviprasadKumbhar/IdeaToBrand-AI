import { describe, expect, it } from "vitest";
import {
  assembleBrandKit,
  ConsistencyFinding,
  createInitialSharedContext,
  SharedContext,
  validateExportEligibility,
  writeApprovedDecision,
} from "../shared/src/index.js";
import {
  DiscoveryContent,
  LaunchPrepContent,
  NamingPersonalityContent,
  PositioningContent,
  TaglinePitchContent,
  VisualBriefContent,
  VoiceMessagingContent,
} from "../shared/src/types/stages.js";

function createCompleteApprovedContext(): SharedContext {
  let ctx = createInitialSharedContext("project_export_success");

  const discovery: DiscoveryContent = {
    core_problem: "Students struggle to find compatible teammates for hackathons",
    target_audience: "University computer science students and first-time founders",
    context_situation: "Campus project matchmaking under sprint deadlines",
    user_goals: "Form a high-performing cross-functional team within 48 hours",
    constraints: "No existing verified peer skill ratings on campus",
    value_desired_outcome: "Balanced 3-member team formed with complementary strengths",
    open_questions: ["Will faculty endorse the platform?"],
    known_facts: ["Hackathon teams capped at 4 members"],
    inferred_assumptions: [
      {
        value: "Skill-based filtering beats friend-group matching for outcomes",
        rationale: "Interviews show 73% of friend teams split responsibilities unevenly",
      },
    ],
  };

  const positioning: PositioningContent = {
    title: "Merit-Driven Peer Assembly",
    category: "Collaborative Founder Matching Platform",
    target_audience: "Ambitious student engineers and designers",
    core_problem: "Scattered WhatsApp groups produce random, dysfunctional hackathon teams",
    differentiator: "Complementary role matching verified by GitHub commits and portfolios",
    value_proposition: "Assemble a vetted hackathon team in 30 minutes, not 3 days",
    competitive_angle: "Proof-of-work matching vs unvetted campus bulletin boards",
    strategic_rationale: "Directly solves the teammate discovery friction with verified proof",
    potential_weakness: "Requires student github profile linking during onboarding",
  };

  const naming: NamingPersonalityContent = {
    selected_name: "CohortForge",
    naming_directions: [
      {
        territory: "Architectural / Construction",
        proposed_name: "CohortForge",
        rationale: "Combines academic peer groups (cohort) with strength under pressure (forge)",
        relationship_to_audience: "Sounds professional, rigorous, and builder-focused",
        relationship_to_positioning: "Reinforces team building with lasting structural strength",
        potential_concern: "May sound overly industrial if not paired with modern typography",
      },
    ],
    personality_traits: [
      { trait: "Disciplined", audience_justification: "Students want serious collaborators, not flakes" },
      { trait: "Direct", audience_justification: "No corporate fluff in hackathon environments" },
      { trait: "Enabling", audience_justification: "Empowers solo hackers to become founders" },
    ],
    traits_to_avoid: ["Corporate jargon", "Cutesy gimmicks", "Casual slacking cues"],
    brand_principles: [
      { principle: "Proof over Pitch", rationale: "Teams formed on demonstrated capability succeed faster" },
      { principle: "Radical Transparency", rationale: "Roles and commitments must be clear from minute one" },
    ],
  };

  const tagline: TaglinePitchContent = {
    selected_tagline: "Build with builders, not bystanders.",
    tagline_options: [
      "Build with builders, not bystanders.",
      "Your hackathon co-founders, assembled.",
    ],
    one_line_pitch:
      "CohortForge matches ambitious student builders into complementary hackathon teams based on verified proof of work.",
    rationale_per_tagline: [
      "Sharp contrast creating immediate urgency and tribal identity",
      "Direct descriptive angle",
    ],
  };

  const visual: VisualBriefContent = {
    logo_direction: "Minimal geometric anvil intersecting a modern network node monogram",
    color_mood: "High-contrast technical obsidian and electric cobalt with stark warm accents",
    hex_palette: ["#0B0F19", "#2563EB", "#38BDF8", "#F8FAFC", "#F97316"],
    type_roles: [
      "Headings: Space Grotesk Bold",
      "Body / UI: Inter Regular",
      "Code / Metrics: JetBrains Mono",
    ],
    shape_language: "Chiseled 45-degree chamfers and modular technical grids",
    symbol_language: "Interlocking vertices and structural beam geometry",
    composition_layout: "High-density modular dashboard cards with precise hairline borders",
    imagery_direction: "Raw monochrome workspace photography with electric blueprint overlays",
    concepts_to_avoid: ["Generic purple SaaS gradients", "Illustrated cartoon avatars", "Stock corporate handshakes"],
    rationale_linking_to_audience_and_positioning:
      "Engineers respect precision and density; high-contrast obsidian evokes terminal clarity over fluffy consumer apps.",
  };

  const voice: VoiceMessagingContent = {
    voice_description: "Concise, unapologetically technical, and focused on output velocity",
    tone_characteristics: ["Direct", "No-BS", "High-conviction", "Peer-to-peer"],
    do_list: ["Use concrete numbers and deliverables", "Respect builder craft and time"],
    dont_list: ["Never use buzzwords like 'synergy' or 'disrupt'", "Avoid patronizing cheerleading"],
    sample_messages: [
      {
        message: "Stop hacking alone. Lock in your backend lead before midnight.",
        explanation: "Creates urgency focused on concrete role completion",
      },
      {
        message: "Portfolio verified. Availability confirmed. Say hello to your UI lead.",
        explanation: "Emphasizes the speed and proof-of-work filter",
      },
    ],
  };

  const launch: LaunchPrepContent = {
    landing_headline: "Stop gambling on hackathon teammates. Forge a winning squad in 30 minutes.",
    social_launch_post:
      "Hackathons are won before the opening ceremony. Meet CohortForge: verified proof-of-work teammate matchmaking for serious builders. No random friend cliques. No missing skills. Find your squad now -> cohortforge.dev",
  };

  // Populate all approved decisions through standard setter
  ctx = writeApprovedDecision(ctx, "discovery", discovery as unknown as Record<string, unknown>, "strategist_approved", "init");
  ctx = writeApprovedDecision(ctx, "positioning", positioning as unknown as Record<string, unknown>, "strategist_approved", "init");
  ctx = writeApprovedDecision(ctx, "naming_personality", naming as unknown as Record<string, unknown>, "strategist_approved", "init");
  ctx = writeApprovedDecision(ctx, "tagline_pitch", tagline as unknown as Record<string, unknown>, "strategist_approved", "init");
  ctx = writeApprovedDecision(ctx, "visual_brief", visual as unknown as Record<string, unknown>, "strategist_approved", "init");
  ctx = writeApprovedDecision(ctx, "voice_messaging", voice as unknown as Record<string, unknown>, "strategist_approved", "init");
  ctx = writeApprovedDecision(ctx, "launch_prep", launch as unknown as Record<string, unknown>, "strategist_approved", "init");

  return ctx;
}

describe("T-033, T-034, T-035: Kit Assembly, Export Gating, and Markdown Export", () => {
  it("T-034: fails export if any required stage is not approved", () => {
    const ctx = createCompleteApprovedContext();
    // Simulate unapproved tagline stage
    delete ctx.approved_decisions.tagline_pitch;

    const gate = validateExportEligibility(ctx);
    expect(gate.eligible).toBe(false);
    expect(gate.missing_stage).toBe("tagline_pitch");
    expect(gate.failure_reason).toBe("Stage 'tagline_pitch' has not been approved");

    const bundle = assembleBrandKit(ctx);
    expect(bundle.status).toBe("failed");
    expect(bundle.content).toBe("");
    expect(bundle.failure_reason).toBe("Stage 'tagline_pitch' has not been approved");
  });

  it("T-034: fails export when a stage is in stage_drafts but never approved", () => {
    const ctx = createCompleteApprovedContext();
    // Remove approved visual brief and leave only an unapproved draft
    const visualContent = ctx.approved_decisions.visual_brief!.content;
    delete ctx.approved_decisions.visual_brief;
    ctx.stage_drafts.visual_brief = {
      stage: "visual_brief",
      content: visualContent,
      generated_at: new Date().toISOString(),
      attempt: 1,
    };

    const gate = validateExportEligibility(ctx);
    expect(gate.eligible).toBe(false);
    expect(gate.missing_stage).toBe("visual_brief");
    expect(gate.failure_reason).toBe("Stage 'visual_brief' has not been approved");
  });

  it("T-034: fails export when required consistency findings remain unresolved (user_action === null)", () => {
    const ctx = createCompleteApprovedContext();
    const unresolvedFinding: ConsistencyFinding = {
      id: "cf_conflict_1",
      fields_in_conflict: ["naming_personality", "voice_messaging"],
      issue_type: "contradiction",
      evidence: "Name sounds industrial while voice claims playful tone",
      why_it_matters: "Creates audience dissonance",
      sharper_alternative: "Align tone to direct and disciplined",
      user_action: null, // UNRESOLVED
    };

    const gate = validateExportEligibility(ctx, [unresolvedFinding]);
    expect(gate.eligible).toBe(false);
    expect(gate.unresolved_finding_id).toBe("cf_conflict_1");
    expect(gate.failure_reason).toContain("unresolved");

    const bundle = assembleBrandKit(ctx, [unresolvedFinding]);
    expect(bundle.status).toBe("failed");
    expect(bundle.failure_reason).toContain("cf_conflict_1");
  });

  it("T-034: passes export when all consistency audit findings are resolved", () => {
    const ctx = createCompleteApprovedContext();
    const resolvedFinding: ConsistencyFinding = {
      id: "cf_resolved_1",
      fields_in_conflict: ["positioning", "tagline_pitch"],
      issue_type: "vague",
      evidence: "Tagline was slightly generic in draft 1",
      why_it_matters: "Failed interchangeability check",
      sharper_alternative: "Build with builders, not bystanders",
      user_action: "accept", // RESOLVED
    };

    const gate = validateExportEligibility(ctx, [resolvedFinding]);
    expect(gate.eligible).toBe(true);

    const bundle = assembleBrandKit(ctx, [resolvedFinding]);
    expect(bundle.status).toBe("exported");
    expect(bundle.content).toContain("Audit Item 1: [VAGUE]");
    expect(bundle.content).toContain("Build with builders, not bystanders");
  });

  it("T-034: fails export if any required Visual Brief field is missing", () => {
    const ctx = createCompleteApprovedContext();
    const visual = { ...ctx.approved_decisions.visual_brief!.content } as unknown as VisualBriefContent;

    // Deliberately delete shape_language
    delete (visual as Partial<VisualBriefContent>).shape_language;
    ctx.approved_decisions.visual_brief!.content = visual as unknown as Record<string, unknown>;

    const gate = validateExportEligibility(ctx);
    expect(gate.eligible).toBe(false);
    expect(gate.invalid_field).toBe("shape_language");
    expect(gate.failure_reason).toContain("shape_language");
  });

  it("T-033: never exports unapproved Scenario Probe branches or rejected directions", () => {
    const ctx = createCompleteApprovedContext();

    // Attach an unapproved Scenario Probe override with wild branch drafts
    ctx.scenario_overrides = [
      {
        id: "scen_unapproved",
        triggered_from_stage: "naming_personality",
        what_if_input: "What if we make it a crypto meme brand?",
        affected_fields: ["naming_personality", "tagline_pitch"],
        branch_drafts: [
          {
            stage: "naming_personality",
            content: { proposed_name: "DogeHackSquad" },
            generated_at: new Date().toISOString(),
            attempt: 1,
          },
        ],
        decision: null, // NOT accepted
        created_at: new Date().toISOString(),
      },
    ];

    const bundle = assembleBrandKit(ctx);
    expect(bundle.status).toBe("exported");
    // Authoritative approved name is CohortForge
    expect(bundle.content).toContain("CohortForge");
    // Speculative scenario branch DogeHackSquad MUST NOT be in the export
    expect(bundle.content).not.toContain("DogeHackSquad");
  });

  it("T-035: generates complete, readable Markdown with all required sections and banners", () => {
    const ctx = createCompleteApprovedContext();
    const bundle = assembleBrandKit(ctx);

    expect(bundle.status).toBe("exported");
    expect(bundle.format).toBe("markdown");

    const md = bundle.content;

    // Check header
    expect(md).toContain("# CohortForge — Complete Brand System");
    expect(md).toContain("Build with builders, not bystanders.");

    // Section 1: Idea / Problem
    expect(md).toContain("## 1. Idea & Problem Context");
    expect(md).toContain("Students struggle to find compatible teammates");

    // Section 2: Positioning
    expect(md).toContain("## 2. Positioning Statement & Value Proposition");
    expect(md).toContain("Merit-Driven Peer Assembly");

    // Section 3: Personality
    expect(md).toContain("## 3. Brand Personality & Principles");
    expect(md).toContain("Proof over Pitch");
    expect(md).toContain("Disciplined");

    // Section 4: Name
    expect(md).toContain("## 4. Name & Naming Rationale");
    expect(md).toContain("**CohortForge**");
    expect(md).toContain("Architectural / Construction");

    // Section 5: Tagline
    expect(md).toContain("## 5. Tagline & One-Line Pitch");
    expect(md).toContain("Build with builders, not bystanders.");

    // Section 6: Visual Brief & All 10 fields + Banner
    expect(md).toContain("## 6. Visual Brief");
    expect(md).toContain("> **AI-generated visual concept / design direction**");
    expect(md).toContain("Minimal geometric anvil intersecting a modern network node monogram");
    expect(md).toContain("High-contrast technical obsidian");
    expect(md).toContain("#0B0F19");
    expect(md).toContain("Space Grotesk Bold");
    expect(md).toContain("Chiseled 45-degree chamfers");
    expect(md).toContain("Interlocking vertices");
    expect(md).toContain("High-density modular dashboard cards");
    expect(md).toContain("Raw monochrome workspace photography");
    expect(md).toContain("Generic purple SaaS gradients");

    // Section 7: Voice & Messaging
    expect(md).toContain("## 7. Voice & Messaging");
    expect(md).toContain("Concise, unapologetically technical");
    expect(md).toContain("Stop hacking alone. Lock in your backend lead before midnight.");

    // Section 8: Launch Prep
    expect(md).toContain("## 8. Launch Preparation");
    expect(md).toContain("Stop gambling on hackathon teammates. Forge a winning squad in 30 minutes.");
    expect(md).toContain("cohortforge.dev");

    // Section 9: Consistency Audit
    expect(md).toContain("## 9. Resolved Consistency Audit Findings");

    // Section 10: Remaining Assumptions & Risks
    expect(md).toContain("## 10. Remaining Assumptions & Strategic Risks");
    expect(md).toContain("Skill-based filtering beats friend-group matching");
  });
});
