import type { ZodSchema } from "zod";

export type StageName =
  | "discovery"
  | "positioning"
  | "naming_personality"
  | "tagline_pitch"
  | "visual_brief"
  | "voice_messaging"
  | "launch_prep"
  | "consistency_audit"
  | "kit_export";

export type ApprovalState =
  | "draft"
  | "critic_review"
  | "needs_revision"
  | "needs_review"
  | "approved"
  | "rejected"
  | "failed";

export interface StageDraft {
  stage: StageName;
  content: Record<string, unknown>;
  generated_at: string;
  attempt: number;
}

export type ApprovedDecisionSource =
  | "strategist_approved"
  | "user_edit"
  | "consistency_finding"
  | "scenario_accept";

export interface ApprovedDecision {
  stage: StageName;
  content: Record<string, unknown>;
  approved_at: string;
  state: ApprovalState;
  source: ApprovedDecisionSource;
}

export type CriticIssueType =
  | "cliche"
  | "audience_mismatch"
  | "contradiction"
  | "vague"
  | "bias";

export type CriticUserAction = "accept" | "reject" | "edit" | null;

export interface CriticFinding {
  id: string;
  stage: StageName;
  target_field: string;
  issue_type: CriticIssueType;
  evidence: string;
  explanation: string;
  sharper_alternative: string;
  user_action: CriticUserAction;
}

export interface ConsistencyFinding {
  id: string;
  fields_in_conflict: string[];
  issue_type: CriticIssueType;
  evidence: string;
  why_it_matters: string;
  sharper_alternative: string;
  user_action: CriticUserAction;
}

export type ScenarioDecision = "keep_original" | "accept_branch" | "edit" | null;

export interface ScenarioOverride {
  id: string;
  triggered_from_stage: StageName;
  what_if_input: string;
  affected_fields: StageName[];
  branch_drafts: StageDraft[];
  decision: ScenarioDecision;
  created_at: string;
}

export interface ScenarioComparisonItem {
  stage: StageName;
  original_content: Record<string, unknown> | null;
  original_state: ApprovalState | null;
  branch_draft: StageDraft;
  critic_findings: CriticFinding[];
  has_changes: boolean;
}

export interface ScenarioProbeResult {
  scenario_override: ScenarioOverride;
  comparisons: ScenarioComparisonItem[];
  updated_context: SharedContext;
}

export type RevisionLogCause =
  | "user_edit"
  | "consistency_finding_accept"
  | "scenario_accept"
  | "strategist_approved";

export interface RevisionLogEntry {
  id: string;
  changed_field: string;
  previous_value: unknown;
  new_value: unknown;
  cause: RevisionLogCause;
  cause_id: string;
  timestamp: string;
}

export interface SharedContext {
  project_id: string;
  user_facts: Record<string, unknown>;
  ai_assumptions: Record<string, { value: unknown; rationale: string }>;
  approved_decisions: Partial<Record<StageName, ApprovedDecision>>;
  stage_drafts: Partial<Record<StageName, StageDraft>>;
  critic_findings: CriticFinding[];
  scenario_overrides: ScenarioOverride[];
  revision_log: RevisionLogEntry[];
}

export interface Project {
  project_id: string;
  created_at: string;
  context: SharedContext;
}

export type ErrorType =
  | "schema_validation_failed"
  | "provider_unavailable"
  | "rate_limited";

export interface StageErrorResponse {
  stage: StageName;
  error_type: ErrorType;
  message: string;
  retryable: boolean;
}

export type ApprovalEvent =
  | { type: "GENERATE_DRAFT" }
  | { type: "SUBMIT_CRITIC" }
  | { type: "CRITIC_FINDINGS_DETECTED" }
  | { type: "CRITIC_NO_FINDINGS" }
  | { type: "REQUEST_REGENERATION" }
  | { type: "USER_ACCEPT_DRAFT" }
  | { type: "UPSTREAM_CHANGED" }
  | { type: "RECHECK_CRITIC" }
  | { type: "VALIDATION_FAILED" }
  | { type: "RESET_STAGE" };

export interface StageInput {
  approved_decisions: Partial<Record<StageName, ApprovedDecision>>;
  scenario_override?: ScenarioOverride;
  raw_input?: string;
}

export interface StageOutput {
  stage: StageName;
  content: Record<string, unknown>;
}

export interface CriticOutput {
  findings: CriticFinding[];
}

export interface ApprovalAction {
  stage: StageName;
  action: "approve" | "edit" | "reject_and_regenerate";
  edited_content?: Record<string, unknown>;
}

export interface StageDefinition<TInput, TOutput> {
  stage: StageName;
  requiredApprovedStages: StageName[];
  buildStrategistPrompt: (input: TInput) => string;
  outputSchema: ZodSchema<TOutput>;
  buildCriticPrompt: (draft: TOutput, input: TInput) => string;
  criticFindingSchema: ZodSchema<CriticFinding[]>;
  maxAutoRetries: 2;
}

export interface ExportBundle {
  generated_at: string;
  format: "markdown" | "pdf";
  content: string;
  status: "exported" | "failed";
  failure_reason?: string;
}

/* Stage-specific data interfaces */

export interface DiscoveryContent {
  core_problem: string;
  target_audience: string;
  context_situation: string;
  user_goals: string;
  constraints: string;
  value_desired_outcome: string;
  open_questions: string[];
  known_facts: string[];
  inferred_assumptions: Array<{ value: string; rationale: string }>;
}

export interface PositioningDirection {
  title: string;
  category: string;
  target_audience: string;
  core_problem: string;
  differentiator: string;
  value_proposition: string;
  competitive_angle: string;
  strategic_rationale: string;
  potential_weakness: string;
  critic_findings?: CriticFinding[];
}

export interface ApprovedPositioningContent extends PositioningDirection {
  rejected_directions?: PositioningDirection[];
}

export interface PositioningContent {
  directions: PositioningDirection[];
  selected_direction?: PositioningDirection;
  rejected_directions?: PositioningDirection[];
  title?: string;
  category?: string;
  target_audience?: string;
  core_problem?: string;
  differentiator?: string;
  value_proposition?: string;
  competitive_angle?: string;
  strategic_rationale?: string;
  potential_weakness?: string;
}

export interface NamingDirection {
  territory: string;
  proposed_name: string;
  rationale: string;
  relationship_to_audience: string;
  relationship_to_positioning: string;
  potential_concern: string;
  critic_analysis?: string;
  sharper_alternative?: string;
}

export interface PersonalityTrait {
  trait: string;
  audience_justification: string;
}

export interface BrandPrinciple {
  principle: string;
  rationale: string;
}

export interface NamingPersonalityContent {
  selected_name?: NamingDirection | string;
  proposed_name?: string;
  naming_directions: NamingDirection[];
  personality_traits: PersonalityTrait[];
  traits_to_avoid: string[];
  brand_principles: BrandPrinciple[];
  critic_findings?: CriticFinding[];
}

export interface TaglinePitchContent {
  selected_tagline?: string;
  tagline_options: string[];
  one_line_pitch: string;
  rationale_per_tagline: string[];
  critic_findings?: CriticFinding[];
}

export interface VisualBriefContent {
  logo_direction: string;
  color_mood: string;
  hex_palette: string[];
  type_roles: string[];
  shape_language: string;
  symbol_language: string;
  composition_layout: string;
  imagery_direction: string;
  concepts_to_avoid: string[];
  rationale_linking_to_audience_and_positioning: string;
  concept_disclaimer?: string;
}

export interface SampleMessage {
  message: string;
  explanation: string;
}

export interface VoiceMessagingContent {
  voice_description: string;
  tone_characteristics: string[];
  do_list: string[];
  dont_list: string[];
  sample_messages: SampleMessage[];
  critic_findings?: CriticFinding[];
}

export interface LaunchPrepContent {
  landing_headline: string;
  social_launch_post: string;
  critic_findings?: CriticFinding[];
}
