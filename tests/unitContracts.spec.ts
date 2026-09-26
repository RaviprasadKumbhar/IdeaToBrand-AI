import { describe, expect, it } from "vitest";
import {
  // Schemas
  DiscoverySchema,
  PositioningSchema,
  NamingPersonalitySchema,
  TaglinePitchSchema,
  VisualBriefSchema,
  VoiceMessagingSchema,
  LaunchPrepSchema,
  ExportBundleSchema,
  CriticFindingSchema,
  ConsistencyFindingSchema,
  // State machine
  transition,
  IllegalStateTransitionError,
  // Revision history
  writeApprovedDecision,
  acceptScenarioBranch,
  // Persistence
  createInitialSharedContext,
  loadSessionContext,
  saveSessionContext,
  // Export gating
  validateExportEligibility,
  assembleBrandKit,
  // Dependencies
  affectedFields,
  getAffectedDownstreamStages,
  markAffectedFieldsNeedsReview,
  // Types
  SharedContext,
  DiscoveryContent,
  PositioningContent,
  NamingPersonalityContent,
  TaglinePitchContent,
  VisualBriefContent,
  VoiceMessagingContent,
  LaunchPrepContent,
} from "@foil/shared";

describe("T-038: Unit & Contract Testing Suite", () => {
  // ─── 1. Schema Validation (Success & Failure Cases) ───────────────────────────
  describe("1. Schema Contracts & Validation", () => {
    it("DiscoverySchema: accepts valid discovery and rejects missing required fields", () => {
      const valid = {
        core_problem: "Inefficient capstone matching",
        target_audience: "Collegiate engineering students",
        context_situation: "Pre-semester registration crunch",
        user_goals: "Find qualified teammates quickly",
        constraints: "Strict semester deadlines",
        value_desired_outcome: "Balanced project team",
        open_questions: [],
        known_facts: ["Class size is 120"],
        inferred_assumptions: [{ value: "Students use Discord", rationale: "Common collegiate channel" }],
      };
      expect(DiscoverySchema.safeParse(valid).success).toBe(true);

      const invalidMissing = { ...valid, core_problem: "" };
      expect(DiscoverySchema.safeParse(invalidMissing).success).toBe(false);
    });

    it("PositioningSchema: accepts at least 2 divergent directions and rejects fewer than 2", () => {
      const dirA = {
        title: "Direction A",
        category: "EdTech",
        target_audience: "Engineers",
        core_problem: "Random assignment fails",
        differentiator: "Proof of work profiles",
        value_proposition: "Form teams in minutes",
        competitive_angle: "Built for capstones",
        strategic_rationale: "Solves capstone panic",
        potential_weakness: "None",
        critic_findings: [],
      };
      const dirB = {
        title: "Direction B",
        category: "Productivity",
        target_audience: "Project managers",
        core_problem: "No project management",
        differentiator: "Integrated sprint boards",
        value_proposition: "Manage capstone from day 1",
        competitive_angle: "Execution over matching",
        strategic_rationale: "Long term engagement",
        potential_weakness: "Feature bloat",
        critic_findings: [],
      };

      expect(PositioningSchema.safeParse({ directions: [dirA, dirB] }).success).toBe(true);
      expect(PositioningSchema.safeParse({ directions: [dirA] }).success).toBe(false);
    });

    it("NamingPersonalitySchema: validates 3-5 personality traits and rejects outside range", () => {
      const baseNaming = {
        naming_directions: [
          {
            territory: "Structural",
            proposed_name: "NexusForge",
            rationale: "Symbolizes connections",
            relationship_to_audience: "Resonates with builders",
            relationship_to_positioning: "Reinforces team strength",
            potential_concern: "Common suffix",
            critic_analysis: "Strong and clear",
            sharper_alternative: "NexusCraft",
          },
        ],
        traits_to_avoid: ["Childish"],
        brand_principles: [{ principle: "Radical clarity", rationale: "Team survival" }],
        critic_findings: [],
      };

      const threeTraits = [
        { trait: "Pragmatic", audience_justification: "Student focus" },
        { trait: "Reliable", audience_justification: "Critical milestones" },
        { trait: "Direct", audience_justification: "No fluff" },
      ];

      expect(
        NamingPersonalitySchema.safeParse({ ...baseNaming, personality_traits: threeTraits }).success
      ).toBe(true);

      // 2 traits -> fails (min 3)
      expect(
        NamingPersonalitySchema.safeParse({ ...baseNaming, personality_traits: threeTraits.slice(0, 2) }).success
      ).toBe(false);

      // 6 traits -> fails (max 5)
      const sixTraits = [
        ...threeTraits,
        { trait: "Agile", audience_justification: "Speed" },
        { trait: "Rigorous", audience_justification: "Engineering" },
        { trait: "Modern", audience_justification: "Design" },
      ];
      expect(
        NamingPersonalitySchema.safeParse({ ...baseNaming, personality_traits: sixTraits }).success
      ).toBe(false);
    });

    it("VisualBriefSchema: requires valid hex codes and rejects malformed color formats", () => {
      const validBrief = {
        logo_direction: "Abstract intersecting node geometry",
        color_mood: "Technical slate and indigo",
        hex_palette: ["#1E293B", "#4F46E5", "#F8FAFC"],
        type_roles: ["Headings: Space Grotesk", "Body: Inter"],
        shape_language: "Clean rounded rectilinear cards",
        symbol_language: "Data conduits and team pathways",
        composition_layout: "Structured 12-column grid",
        imagery_direction: "Real university engineering laboratories",
        concepts_to_avoid: ["Stock handshakes"],
        rationale_linking_to_audience_and_positioning: "Credibility for engineers",
        concept_disclaimer: "AI-generated visual concept / design direction — not production-ready artwork.",
      };

      expect(VisualBriefSchema.safeParse(validBrief).success).toBe(true);

      const invalidColor = { ...validBrief, hex_palette: ["blue", "#1E293B"] };
      expect(VisualBriefSchema.safeParse(invalidColor).success).toBe(false);
    });

    it("VoiceMessagingSchema: enforces 3-4 sample messages with explanations", () => {
      const validVoice = {
        voice_description: "Direct and engineering-focused",
        tone_characteristics: ["Direct", "Pragmatic", "Honest"],
        do_list: ["Be precise"],
        dont_list: ["Do not overpromise"],
        sample_messages: [
          { message: "Lock in your final teammate.", explanation: "Urgency" },
          { message: "Capstone roster confirmed.", explanation: "Confirmation" },
          { message: "Review peer skill profile.", explanation: "Action" },
        ],
        critic_findings: [],
      };

      expect(VoiceMessagingSchema.safeParse(validVoice).success).toBe(true);

      // 2 sample messages -> fails (min 3)
      const invalidVoice = { ...validVoice, sample_messages: validVoice.sample_messages.slice(0, 2) };
      expect(VoiceMessagingSchema.safeParse(invalidVoice).success).toBe(false);
    });

    it("CriticFindingSchema & ConsistencyFindingSchema: enforce non-empty sharper_alternative", () => {
      const validCritic = {
        id: "crit_1",
        stage: "discovery",
        target_field: "core_problem",
        issue_type: "vague",
        evidence: "Problem statement is too generic",
        explanation: "Does not pinpoint student capstone friction",
        sharper_alternative: "Specify capstone semester teammate mismatch",
        user_action: null,
      };
      expect(CriticFindingSchema.safeParse(validCritic).success).toBe(true);

      const emptyAltCritic = { ...validCritic, sharper_alternative: "" };
      expect(CriticFindingSchema.safeParse(emptyAltCritic).success).toBe(false);

      const validAudit = {
        id: "audit_1",
        fields_in_conflict: ["positioning", "voice_messaging"],
        issue_type: "contradiction",
        evidence: "Positioning claims corporate B2B but voice is casual student slang",
        why_it_matters: "Tone mismatch erodes student trust",
        sharper_alternative: "Align voice tone with student-native register",
        user_action: null,
      };
      expect(ConsistencyFindingSchema.safeParse(validAudit).success).toBe(true);

      const emptyConflictAudit = { ...validAudit, fields_in_conflict: [] };
      expect(ConsistencyFindingSchema.safeParse(emptyConflictAudit).success).toBe(false);
    });
  });

  // ─── 2. State Machine Transitions ─────────────────────────────────────────────
  describe("2. State Transitions & Guards", () => {
    it("handles full linear transition cycle: draft -> critic_review -> approved", () => {
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

    it("throws IllegalStateTransitionError on prohibited jumps (e.g. draft directly to approved)", () => {
      expect(() => transition("draft", { type: "CRITIC_NO_FINDINGS" })).toThrowError(
        IllegalStateTransitionError
      );
      expect(() => transition("approved", { type: "CRITIC_FINDINGS_DETECTED" })).toThrowError(
        IllegalStateTransitionError
      );
    });
  });

  // ─── 3. Approval Rules & Persistence Choke Point ──────────────────────────────
  describe("3. Approval Rules & Revision Logging Choke Point", () => {
    it("all approved decisions are written through writeApprovedDecision with single choke point", () => {
      let ctx = createInitialSharedContext("choke_point_test");
      expect(ctx.revision_log).toHaveLength(0);

      const discoveryData: DiscoveryContent = {
        core_problem: "Problem",
        target_audience: "Students",
        context_situation: "Campus",
        user_goals: "Match",
        constraints: "Time",
        value_desired_outcome: "Team",
        open_questions: [],
        known_facts: [],
        inferred_assumptions: [],
      };

      ctx = writeApprovedDecision(ctx, "discovery", discoveryData as any, "strategist_approved", "cause_1");
      expect(ctx.approved_decisions.discovery?.content).toEqual(discoveryData);
      expect(ctx.approved_decisions.discovery?.state).toBe("approved");
      expect(ctx.revision_log).toHaveLength(1);
      expect(ctx.revision_log[0].changed_field).toBe("discovery");
      expect(ctx.revision_log[0].cause).toBe("strategist_approved");
    });

    it("captures previous_value accurately on subsequent user edits", () => {
      let ctx = createInitialSharedContext("edit_choke_point_test");
      const v1 = { title: "Title 1" };
      const v2 = { title: "Title 2" };

      ctx = writeApprovedDecision(ctx, "positioning", v1, "strategist_approved", "c1");
      ctx = writeApprovedDecision(ctx, "positioning", v2, "user_edit", "c2");

      expect(ctx.revision_log).toHaveLength(2);
      expect(ctx.revision_log[1].previous_value).toEqual(v1);
      expect(ctx.revision_log[1].new_value).toEqual(v2);
      expect(ctx.revision_log[1].cause).toBe("user_edit");
    });

    it("acceptScenarioBranch writes scenario_accept cause with exact branch changes", () => {
      let ctx = createInitialSharedContext("scenario_branch_rule_test");
      ctx = writeApprovedDecision(ctx, "discovery", { problem: "Original" }, "strategist_approved", "init");

      const override = {
        id: "scen_choke_1",
        triggered_from_stage: "discovery" as const,
        what_if_input: "What if for remote students?",
        affected_fields: ["positioning" as const],
        branch_drafts: [
          {
            stage: "positioning" as const,
            content: { title: "Remote Capstones" },
            generated_at: new Date().toISOString(),
            attempt: 1,
          },
        ],
        decision: null,
        created_at: new Date().toISOString(),
      };
      ctx.scenario_overrides.push(override);

      ctx = acceptScenarioBranch(ctx, "scen_choke_1");
      expect(ctx.approved_decisions.positioning?.content).toEqual({ title: "Remote Capstones" });
      expect(ctx.revision_log).toHaveLength(2);
      expect(ctx.revision_log[1].cause).toBe("scenario_accept");
      expect(ctx.revision_log[1].cause_id).toBe("scen_choke_1");
    });
  });

  // ─── 4. Dependency Calculations ───────────────────────────────────────────────
  describe("4. Dependency Engine Calculations", () => {
    it("affectedFields accurately returns downstream dependants per Architecture Section 16", () => {
      expect(affectedFields("discovery")).toEqual([
        "positioning",
        "naming_personality",
        "visual_brief",
        "voice_messaging",
        "launch_prep",
      ]);
      expect(affectedFields("positioning")).toEqual([
        "naming_personality",
        "tagline_pitch",
        "visual_brief",
        "voice_messaging",
        "launch_prep",
        "consistency_audit",
      ]);
      expect(affectedFields("visual_brief")).toEqual(["consistency_audit"]);
      expect(affectedFields("kit_export")).toEqual([]);
    });

    it("markAffectedFieldsNeedsReview updates state without destroying or clearing approved data", () => {
      let ctx = createInitialSharedContext("dep_calc_test");
      ctx = writeApprovedDecision(ctx, "discovery", { problem: "Discovery Data" }, "strategist_approved", "c1");
      ctx = writeApprovedDecision(ctx, "positioning", { title: "Positioning Data" }, "strategist_approved", "c2");

      expect(ctx.approved_decisions.positioning?.state).toBe("approved");

      // An upstream edit in discovery marks positioning as needs_review
      const updated = markAffectedFieldsNeedsReview(ctx, "discovery");
      expect(updated.approved_decisions.positioning?.state).toBe("needs_review");
      // Preserves existing approved content intact!
      expect(updated.approved_decisions.positioning?.content).toEqual({ title: "Positioning Data" });
    });
  });

  // ─── 5. Export Gating & Kit Assembly ──────────────────────────────────────────
  describe("5. Export Gating & Assembly Contracts", () => {
    it("fails export validation if any of the 7 stages is unapproved", () => {
      const ctx = createInitialSharedContext("gate_fail_test");
      const gateResult = validateExportEligibility(ctx, []);
      expect(gateResult.eligible).toBe(false);
      expect(gateResult.missing_stage).toBe("discovery");
    });

    it("fails export validation if any consistency finding has unresolved status (user_action === null)", () => {
      let ctx = createInitialSharedContext("audit_unresolved_test");
      // Mock all 7 stages approved
      const stages = [
        "discovery",
        "positioning",
        "naming_personality",
        "tagline_pitch",
        "visual_brief",
        "voice_messaging",
        "launch_prep",
      ] as const;
      for (const s of stages) {
        ctx = writeApprovedDecision(ctx, s, { field: s }, "strategist_approved", "init");
      }

      const unresolvedFinding = {
        id: "find_1",
        fields_in_conflict: ["voice_messaging", "launch_prep"],
        issue_type: "contradiction" as const,
        evidence: "Voice is formal, launch is informal",
        why_it_matters: "Brand consistency",
        sharper_alternative: "Align launch post tone",
        user_action: null, // UNRESOLVED
      };

      const result = validateExportEligibility(ctx, [unresolvedFinding]);
      expect(result.eligible).toBe(false);
      expect(result.unresolved_finding_id).toBe("find_1");
    });

    it("passes export validation and produces markdown kit when all 7 stages are approved and findings resolved", () => {
      let ctx = createInitialSharedContext("export_success_test");
      const stages = [
        "discovery",
        "positioning",
        "naming_personality",
        "tagline_pitch",
        "visual_brief",
        "voice_messaging",
        "launch_prep",
      ] as const;

      const fullData = {
        discovery: {
          core_problem: "P",
          target_audience: "A",
          context_situation: "C",
          user_goals: "G",
          constraints: "Con",
          value_desired_outcome: "O",
          open_questions: [],
          known_facts: ["Fact 1"],
          inferred_assumptions: [],
        },
        positioning: {
          title: "Title",
          category: "Cat",
          target_audience: "Aud",
          core_problem: "Prob",
          differentiator: "Diff",
          value_proposition: "Val",
          competitive_angle: "Angle",
          strategic_rationale: "Strat",
          potential_weakness: "Weak",
        },
        naming_personality: {
          selected_name: "BrandForge",
          personality_traits: [{ trait: "Bold", audience_justification: "Students" }],
          traits_to_avoid: ["Weak"],
          brand_principles: [{ principle: "Directness", rationale: "Clarity" }],
        },
        tagline_pitch: {
          selected_tagline: "Build the future.",
          tagline_options: ["Build the future."],
          one_line_pitch: "BrandForge powers verified collegiate teams.",
          rationale_per_tagline: ["Clean and memorable"],
        },
        visual_brief: {
          logo_direction: "Abstract nodes",
          color_mood: "Indigo",
          hex_palette: ["#1E293B", "#4F46E5", "#F8FAFC"],
          type_roles: ["Headings: Space Grotesk", "Body: Inter"],
          shape_language: "Rectilinear",
          symbol_language: "Nodes",
          composition_layout: "Grid",
          imagery_direction: "Real students",
          concepts_to_avoid: ["Stock"],
          rationale_linking_to_audience_and_positioning: "Technical focus",
        },
        voice_messaging: {
          voice_description: "Direct and technical",
          tone_characteristics: ["Direct", "Pragmatic"],
          do_list: ["Be precise"],
          dont_list: ["Do not overpromise"],
          sample_messages: [{ message: "Assemble your squad.", explanation: "Action" }],
        },
        launch_prep: {
          landing_headline: "Form your capstone squad.",
          social_launch_post: "Launch post content here.",
        },
      };

      for (const s of stages) {
        ctx = writeApprovedDecision(ctx, s, fullData[s] as any, "strategist_approved", "init");
      }

      const resolvedFinding = {
        id: "find_resolved",
        fields_in_conflict: ["voice_messaging", "launch_prep"],
        issue_type: "contradiction" as const,
        evidence: "Voice is formal, launch is informal",
        why_it_matters: "Brand consistency",
        sharper_alternative: "Align launch post tone",
        user_action: "accept" as const, // RESOLVED
      };

      const result = validateExportEligibility(ctx, [resolvedFinding]);
      expect(result.eligible).toBe(true);

      const bundle = assembleBrandKit(ctx, [resolvedFinding]);
      expect(bundle.status).toBe("exported");
      expect(bundle.format).toBe("markdown");
      expect(bundle.content).toContain("# BrandForge — Complete Brand System");
      expect(bundle.content).toContain("## 6. Visual Brief");
      expect(bundle.content).toContain("## 9. Resolved Consistency Audit Findings");
    });
  });
});
