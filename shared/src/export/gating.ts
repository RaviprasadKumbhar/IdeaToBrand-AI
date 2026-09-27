import { ConsistencyFinding, SharedContext, StageName } from "../types/index.js";
import {
  DiscoveryContent,
  LaunchPrepContent,
  NamingPersonalityContent,
  PositioningContent,
  TaglinePitchContent,
  VisualBriefContent,
  VoiceMessagingContent,
} from "../types/stages.js";

/**
 * Required generative stages that MUST be approved before export.
 * Docs/architecture.md Section 19: All 7 required stages must be approved.
 */
export const REQUIRED_GENERATIVE_STAGES: StageName[] = [
  "discovery",
  "positioning",
  "naming_personality",
  "tagline_pitch",
  "visual_brief",
  "voice_messaging",
  "launch_prep",
];

export interface ExportGateResult {
  eligible: boolean;
  failure_reason?: string;
  missing_stage?: StageName;
  unresolved_finding_id?: string;
  invalid_field?: string;
  details?: string[];
}

/**
 * Validates export eligibility.
 * Task T-034: Export Gating.
 *
 * Enforces:
 * 1. All 7 generative stages are approved in approved_decisions.
 * 2. Launch Prep is approved (verifying it preceded Holistic Consistency Audit).
 * 3. All consistency audit findings are resolved (user_action !== null).
 * 4. All required fields in each stage (especially the 10 Visual Brief fields) are present and valid.
 */
export function validateExportEligibility(
  ctx: SharedContext,
  consistencyFindings: ConsistencyFinding[] = []
): ExportGateResult {
  // Check 1: All 7 required generative stages are present and approved
  for (const stage of REQUIRED_GENERATIVE_STAGES) {
    const decision = ctx.approved_decisions[stage];
    if (!decision || decision.state !== "approved" || !decision.content) {
      return {
        eligible: false,
        failure_reason: `Stage '${stage}' has not been approved`,
        missing_stage: stage,
      };
    }
  }

  // Check 2: Launch Prep must precede consistency audit and be approved (re-verified explicitly)
  const launchPrep = ctx.approved_decisions.launch_prep;
  if (!launchPrep || launchPrep.state !== "approved") {
    return {
      eligible: false,
      failure_reason: "Stage 'launch_prep' has not been approved prior to consistency audit",
      missing_stage: "launch_prep",
    };
  }

  // Check 3: Check unresolved consistency findings
  // Check both ctx.critic_findings (if audit stored there) and explicit consistencyFindings array
  const allConsistencyFindings: ConsistencyFinding[] = [
    ...consistencyFindings,
    // also detect any findings in critic_findings marked for consistency_audit
    ...((ctx.critic_findings || [])
      .filter((f) => f.stage === "consistency_audit")
      .map((f) => ({
        id: f.id,
        fields_in_conflict: [f.target_field],
        issue_type: f.issue_type,
        evidence: f.evidence,
        why_it_matters: f.explanation,
        sharper_alternative: f.sharper_alternative,
        user_action: f.user_action,
      }))),
  ];

  for (const finding of allConsistencyFindings) {
    if (finding.user_action === null) {
      return {
        eligible: false,
        failure_reason: `Consistency finding '${finding.id}' is unresolved`,
        unresolved_finding_id: finding.id,
      };
    }
  }

  // Check 4: Stage-specific data completeness validation

  // 4a. Discovery validation
  const discovery = ctx.approved_decisions.discovery?.content as unknown as DiscoveryContent;
  if (!discovery.core_problem?.trim()) {
    return {
      eligible: false,
      failure_reason: "Missing or invalid data for 'core_problem' in stage 'discovery'",
      invalid_field: "core_problem",
      missing_stage: "discovery",
    };
  }
  if (!discovery.target_audience?.trim()) {
    return {
      eligible: false,
      failure_reason: "Missing or invalid data for 'target_audience' in stage 'discovery'",
      invalid_field: "target_audience",
      missing_stage: "discovery",
    };
  }

  // 4b. Positioning validation
  const pos = ctx.approved_decisions.positioning?.content as unknown as PositioningContent;
  const posDirection = pos.selected_direction || (Array.isArray((pos as any)?.directions) && (pos as any).directions[0]) || pos;
  if (!posDirection.value_proposition?.trim() && !posDirection.differentiator?.trim()) {
    return {
      eligible: false,
      failure_reason: "Missing or invalid data for 'value_proposition' in stage 'positioning'",
      invalid_field: "value_proposition",
      missing_stage: "positioning",
    };
  }

  // 4c. Naming & Personality validation
  const naming = ctx.approved_decisions.naming_personality?.content as unknown as NamingPersonalityContent;
  const brandName =
    typeof naming.selected_name === "string"
      ? naming.selected_name
      : naming.selected_name?.proposed_name || naming.proposed_name || naming.naming_directions?.[0]?.proposed_name || "";
  if (!brandName.trim()) {
    return {
      eligible: false,
      failure_reason: "Missing or invalid data for 'proposed_name' in stage 'naming_personality'",
      invalid_field: "proposed_name",
      missing_stage: "naming_personality",
    };
  }

  // 4d. Tagline & Pitch validation
  const tagline = ctx.approved_decisions.tagline_pitch?.content as unknown as TaglinePitchContent;
  if (!tagline.one_line_pitch?.trim()) {
    return {
      eligible: false,
      failure_reason: "Missing or invalid data for 'one_line_pitch' in stage 'tagline_pitch'",
      invalid_field: "one_line_pitch",
      missing_stage: "tagline_pitch",
    };
  }

  // 4e. Visual Brief validation (ALL 10 required fields from architecture Section 19 and tasks.md T-035)
  const visual = ctx.approved_decisions.visual_brief?.content as unknown as VisualBriefContent;
  const requiredVisualFields: Array<{ key: keyof VisualBriefContent | "rationale"; name: string }> = [
    { key: "logo_direction", name: "logo direction" },
    { key: "color_mood", name: "color mood" },
    { key: "hex_palette", name: "HEX palette" },
    { key: "type_roles", name: "typography / type roles" },
    { key: "shape_language", name: "shape language" },
    { key: "symbol_language", name: "symbol language" },
    { key: "composition_layout", name: "composition / layout" },
    { key: "imagery_direction", name: "imagery direction" },
    { key: "concepts_to_avoid", name: "concepts to avoid" },
    { key: "rationale_linking_to_audience_and_positioning", name: "rationale" },
  ];

  for (const field of requiredVisualFields) {
    const val =
      visual[field.key as keyof VisualBriefContent] ??
      (field.key === "rationale_linking_to_audience_and_positioning"
        ? (visual as unknown as Record<string, unknown>).rationale
        : undefined);

    if (val === undefined || val === null) {
      return {
        eligible: false,
        failure_reason: `Missing or invalid data for '${field.key}' in stage 'visual_brief'`,
        invalid_field: String(field.key),
        missing_stage: "visual_brief",
      };
    }

    if (typeof val === "string" && !val.trim()) {
      return {
        eligible: false,
        failure_reason: `Missing or invalid data for '${field.key}' in stage 'visual_brief'`,
        invalid_field: String(field.key),
        missing_stage: "visual_brief",
      };
    }

    if (Array.isArray(val) && val.length === 0) {
      return {
        eligible: false,
        failure_reason: `Missing or invalid data for '${field.key}' in stage 'visual_brief' (empty array)`,
        invalid_field: String(field.key),
        missing_stage: "visual_brief",
      };
    }
  }

  // 4f. Voice & Messaging validation
  const voice = ctx.approved_decisions.voice_messaging?.content as unknown as VoiceMessagingContent;
  if (!voice.voice_description?.trim()) {
    return {
      eligible: false,
      failure_reason: "Missing or invalid data for 'voice_description' in stage 'voice_messaging'",
      invalid_field: "voice_description",
      missing_stage: "voice_messaging",
    };
  }

  // 4g. Launch Prep validation
  const launch = ctx.approved_decisions.launch_prep?.content as unknown as LaunchPrepContent;
  if (!launch.landing_headline?.trim() || !launch.social_launch_post?.trim()) {
    return {
      eligible: false,
      failure_reason: "Missing or invalid data for landing headline or social post in stage 'launch_prep'",
      invalid_field: !launch.landing_headline?.trim() ? "landing_headline" : "social_launch_post",
      missing_stage: "launch_prep",
    };
  }

  return { eligible: true };
}
