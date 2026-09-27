import { ConsistencyFinding, ExportBundle, SharedContext } from "../types/index.js";
import {
  DiscoveryContent,
  LaunchPrepContent,
  NamingPersonalityContent,
  PositioningContent,
  TaglinePitchContent,
  VisualBriefContent,
  VoiceMessagingContent,
} from "../types/stages.js";
import { validateExportEligibility } from "./gating.js";

/**
 * Assembles the authoritative brand kit into a complete Markdown document.
 * Tasks T-033, T-034, T-035.
 *
 * Rules:
 * - Uses approved decisions ONLY.
 * - Unapproved stage drafts, rejected directions, and unapproved scenario overrides are ignored.
 * - Includes all 10 required sections in order.
 * - Includes all 10 required Visual Brief fields with the mandatory concept direction banner.
 * - Fails with structured reason if any gate condition is not met.
 */
export function assembleBrandKit(
  ctx: SharedContext,
  consistencyFindings: ConsistencyFinding[] = []
): ExportBundle {
  const timestamp = new Date().toISOString();

  // Enforce T-034 Export Gating
  const gateResult = validateExportEligibility(ctx, consistencyFindings);
  if (!gateResult.eligible) {
    return {
      generated_at: timestamp,
      format: "markdown",
      content: "",
      status: "failed",
      failure_reason: gateResult.failure_reason,
    };
  }

  // Extract purely from approved_decisions
  const discovery = ctx.approved_decisions.discovery!.content as unknown as DiscoveryContent;
  const positioning = ctx.approved_decisions.positioning!.content as unknown as PositioningContent;
  const naming = ctx.approved_decisions.naming_personality!.content as unknown as NamingPersonalityContent;
  const tagline = ctx.approved_decisions.tagline_pitch!.content as unknown as TaglinePitchContent;
  const visual = ctx.approved_decisions.visual_brief!.content as unknown as VisualBriefContent;
  const voice = ctx.approved_decisions.voice_messaging!.content as unknown as VoiceMessagingContent;
  const launch = ctx.approved_decisions.launch_prep!.content as unknown as LaunchPrepContent;

  // Resolve active direction / name / tagline
  const activePositioning = positioning.selected_direction || (Array.isArray((positioning as any)?.directions) && (positioning as any).directions[0]) || positioning;
  const activeName =
    typeof naming.selected_name === "string"
      ? naming.selected_name
      : naming.selected_name?.proposed_name || naming.proposed_name || naming.naming_directions?.[0]?.proposed_name || "Brand";

  const activeNameDirection =
    typeof naming.selected_name === "object"
      ? naming.selected_name
      : naming.naming_directions?.find((d) => d.proposed_name === activeName);

  const activeTagline =
    tagline.selected_tagline || tagline.tagline_options?.[0] || "";

  // Combine resolved consistency findings
  const criticFindings = ctx.critic_findings || [];
  const resolvedFindings: ConsistencyFinding[] = [
    ...consistencyFindings.filter((f) => f.user_action !== null),
    ...criticFindings
      .filter((f) => f.stage === "consistency_audit" && f.user_action !== null)
      .map((f) => ({
        id: f.id,
        fields_in_conflict: [f.target_field],
        issue_type: f.issue_type,
        evidence: f.evidence,
        why_it_matters: f.explanation,
        sharper_alternative: f.sharper_alternative,
        user_action: f.user_action,
      })),
  ];

  const sections: string[] = [];

  // Title & Metadata
  sections.push(`# ${activeName} — Complete Brand System`);
  if (activeTagline) {
    sections.push(`> *${activeTagline}*`);
  }
  sections.push(`
**Project ID:** \`${ctx.project_id}\`  
**Generated At:** \`${timestamp}\`  
**Status:** Approved Brand Specification  
`);

  sections.push("---");

  // Section 1: Idea / Problem Context
  sections.push(`## 1. Idea & Problem Context

- **Core Problem:** ${discovery.core_problem}
- **Target Audience:** ${discovery.target_audience}
- **Context & Situation:** ${discovery.context_situation || "Defined in discovery"}
- **User Goals:** ${discovery.user_goals || "Defined in discovery"}
- **Constraints:** ${discovery.constraints || "None specified"}
- **Desired Outcome:** ${discovery.value_desired_outcome || "Defined in discovery"}

### Verified User Facts
${
  discovery.known_facts && discovery.known_facts.length > 0
    ? discovery.known_facts.map((fact) => `- ${fact}`).join("\n")
    : Object.keys(ctx.user_facts).length > 0
    ? Object.entries(ctx.user_facts).map(([k, v]) => `- **${k}:** ${JSON.stringify(v)}`).join("\n")
    : "- No static user facts recorded."
}
`);

  sections.push("---");

  // Section 2: Positioning Statement & Strategic Value
  sections.push(`## 2. Positioning Statement & Value Proposition

- **Direction Title:** ${activePositioning.title || "Strategic Positioning"}
- **Category:** ${activePositioning.category || "Unspecified"}
- **Target Audience Focus:** ${activePositioning.target_audience || discovery.target_audience}
- **Core Differentiator:** ${activePositioning.differentiator || "Distinct strategic advantage"}
- **Value Proposition:** ${activePositioning.value_proposition || "Core customer value"}
- **Competitive Angle:** ${activePositioning.competitive_angle || "Defensible market position"}
- **Strategic Rationale:** ${activePositioning.strategic_rationale || "Grounded in audience need"}
`);

  sections.push("---");

  // Section 3: Brand Personality & Principles
  const traits = naming.personality_traits || [];
  const principles = naming.brand_principles || [];
  const traitsToAvoid = naming.traits_to_avoid || [];

  sections.push(`## 3. Brand Personality & Principles

### Personality Traits
${
  traits.length > 0
    ? traits.map((t) => `- **${t.trait}:** ${t.audience_justification}`).join("\n")
    : "- Professional and authentic"
}

### Brand Principles
${
  principles.length > 0
    ? principles.map((p) => `- **${p.principle}:** ${p.rationale}`).join("\n")
    : "- Grounded in user value"
}

### Traits to Avoid
${
  traitsToAvoid.length > 0
    ? traitsToAvoid.map((a) => `- ❌ ${a}`).join("\n")
    : "- Cliché, generic, or overhyped positioning"
}
`);

  sections.push("---");

  // Section 4: Name & Naming Rationale
  sections.push(`## 4. Name & Naming Rationale

- **Approved Brand Name:** **${activeName}**
- **Territory:** ${activeNameDirection?.territory || "Strategic naming territory"}
- **Naming Rationale:** ${activeNameDirection?.rationale || "Selected based on audience resonance"}
- **Relationship to Audience:** ${activeNameDirection?.relationship_to_audience || "Clear connection to audience mental model"}
- **Relationship to Positioning:** ${activeNameDirection?.relationship_to_positioning || "Reinforces core differentiator"}
${activeNameDirection?.potential_concern ? `- **Addressed Concern:** ${activeNameDirection.potential_concern}` : ""}
`);

  sections.push("---");

  // Section 5: Tagline & One-Line Pitch
  const taglineRationale =
    tagline.rationale_per_tagline?.[0] || "Reinforces unique positioning";

  sections.push(`## 5. Tagline & One-Line Pitch

- **Primary Tagline:** "${activeTagline}"
- **One-Line Pitch:** ${tagline.one_line_pitch}
- **Tagline Rationale:** ${taglineRationale}
`);

  sections.push("---");

  // Section 6: Visual Brief (with mandatory banner & all 10 required fields)
  const hexPalette = visual.hex_palette || [];
  const typeRoles = visual.type_roles || [];
  const visualAvoid = visual.concepts_to_avoid || [];
  const visualRationale =
    visual.rationale_linking_to_audience_and_positioning ||
    (visual as unknown as { rationale?: string }).rationale ||
    "Aligned with audience expectations and brand principles";

  sections.push(`## 6. Visual Brief

> **AI-generated visual concept / design direction**

- **Logo Direction:** ${visual.logo_direction}
- **Color Mood:** ${visual.color_mood}

### Color Palette (HEX Codes)
| Color Role | HEX Code | Swatch Preview |
|---|---|---|
${
  hexPalette.length > 0
    ? hexPalette.map((hex, idx) => `| Color ${idx + 1} | \`${hex}\` | ![#${hex.replace("#", "")}](https://via.placeholder.com/15/${hex.replace("#", "")}/${hex.replace("#", "")}.png) |`).join("\n")
    : "| Primary | `#0F172A` | Default |"
}

### Typography & Type Roles
${
  typeRoles.length > 0
    ? typeRoles.map((role) => `- ${role}`).join("\n")
    : "- Primary Sans-serif for UI clarity"
}

### Design Language & Composition
- **Shape Language:** ${visual.shape_language}
- **Symbol Language:** ${visual.symbol_language}
- **Composition & Layout:** ${visual.composition_layout}
- **Imagery Direction:** ${visual.imagery_direction}

### Visual Concepts to Avoid
${
  visualAvoid.length > 0
    ? visualAvoid.map((avoid) => `- ❌ ${avoid}`).join("\n")
    : "- Generic stock photos and cliché tech gradients"
}

### Strategic Visual Rationale
${visualRationale}
`);

  sections.push("---");

  // Section 7: Voice & Messaging
  const tone = voice.tone_characteristics || [];
  const doList = voice.do_list || [];
  const dontList = voice.dont_list || [];
  const sampleMessages = voice.sample_messages || [];

  sections.push(`## 7. Voice & Messaging

- **Voice Description:** ${voice.voice_description}

### Tone Characteristics
${tone.map((t) => `- ${t}`).join("\n")}

### Messaging Guidelines
| What to Do (Do's) | What to Avoid (Don'ts) |
|---|---|
${
  doList.length > 0 || dontList.length > 0
    ? Array.from({ length: Math.max(doList.length, dontList.length) })
        .map((_, i) => `| ${doList[i] || "-"} | ${dontList[i] || "-"} |`)
        .join("\n")
    : "| Clear, active verbs | Passive buzzwords |"
}

### Sample Messages
${
  sampleMessages.length > 0
    ? sampleMessages
        .map((m, idx) => `#### Example ${idx + 1}\n> "${m.message}"\n*Context & Explanation:* ${m.explanation}`)
        .join("\n\n")
    : "- No sample messages provided"
}
`);

  sections.push("---");

  // Section 8: Launch Preparation
  sections.push(`## 8. Launch Preparation

### Landing Page Headline
> ### "${launch.landing_headline}"

### Social Launch Post
\`\`\`
${launch.social_launch_post}
\`\`\`
`);

  sections.push("---");

  // Section 9: Resolved Consistency Audit Findings
  sections.push(`## 9. Resolved Consistency Audit Findings

The Holistic Consistency Audit reviewed the complete approved brand system after Launch Prep. The following findings were verified and resolved:

${
  resolvedFindings.length > 0
    ? resolvedFindings
        .map(
          (f, idx) => `### Audit Item ${idx + 1}: [${f.issue_type.toUpperCase()}]
- **Fields in Conflict:** ${f.fields_in_conflict.join(", ")}
- **Evidence:** ${f.evidence}
- **Impact / Why It Matters:** ${f.why_it_matters}
- **Sharper Alternative:** ${f.sharper_alternative}
- **Resolution Action:** User selected \`${f.user_action}\`
`
        )
        .join("\n")
    : "*No conflicting brand inconsistencies were detected during the Holistic Consistency Audit.*"
}
`);

  sections.push("---");

  // Section 10: Remaining Assumptions & Strategic Risks
  const inferredAssumptions = discovery.inferred_assumptions || [];
  const openQuestions = discovery.open_questions || [];

  sections.push(`## 10. Remaining Assumptions & Strategic Risks

### AI Inferred Assumptions Requiring Validation
${
  inferredAssumptions.length > 0
    ? inferredAssumptions.map((a) => `- **Assumption:** ${a.value}\n  *Rationale:* ${a.rationale}`).join("\n")
    : ctx.ai_assumptions && Object.keys(ctx.ai_assumptions).length > 0
    ? Object.entries(ctx.ai_assumptions)
        .map(([k, v]) => `- **${k}:** ${v.value} *(Rationale: ${v.rationale})*`)
        .join("\n")
    : "- No outstanding unverified assumptions."
}

### Open Questions for Market Testing
${
  openQuestions.length > 0
    ? openQuestions.map((q) => `- ${q}`).join("\n")
    : "- Validate conversion rate on initial launch post."
}
`);

  const fullMarkdown = sections.join("\n\n");

  return {
    generated_at: timestamp,
    format: "markdown",
    content: fullMarkdown,
    status: "exported",
  };
}
