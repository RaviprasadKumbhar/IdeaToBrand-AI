/**
 * Shared domain types for FOIL — used by both frontend and backend.
 * Single source of truth for contracts (architecture.md § 6, § 7).
 */

export type StageName =
  | 'discovery'
  | 'positioning'
  | 'naming_personality'
  | 'tagline_pitch'
  | 'visual_brief'
  | 'voice_messaging'
  | 'launch_prep'
  | 'consistency_audit'
  | 'kit_export';

export type ApprovalState =
  | 'draft'
  | 'critic_review'
  | 'needs_revision'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'failed';

export type ApprovalEvent =
  | 'generate'
  | 'critic_pass'
  | 'critic_flag'
  | 'user_approve'
  | 'user_reject'
  | 'user_edit'
  | 'upstream_changed'
  | 'regenerate'
  | 'schema_fail';

export interface StageDraft {
  stage: StageName;
  content: Record<string, unknown>;
  generated_at: string;
  attempt: number; // 1-based; caps at 2 automatic retries
}

export interface ApprovedDecision {
  stage: StageName;
  content: Record<string, unknown>;
  approved_at: string;
  state: ApprovalState; // always 'approved' while stored here
  source: 'strategist_approved' | 'user_edit' | 'consistency_finding' | 'scenario_accept';
}

export type CriticIssueType = 'cliche' | 'audience_mismatch' | 'contradiction' | 'vague' | 'bias';

export interface CriticFinding {
  id: string;
  stage: StageName;
  target_field: string;
  issue_type: CriticIssueType;
  evidence: string;
  explanation: string;
  sharper_alternative: string; // required — a finding without one is invalid
  user_action: 'accept' | 'reject' | 'edit' | null; // null until user acts
}

export interface ScenarioOverride {
  id: string;
  triggered_from_stage: StageName;
  what_if_input: string;
  affected_fields: StageName[];
  branch_drafts: StageDraft[];
  decision: 'keep_original' | 'accept_branch' | 'edit' | null;
  created_at: string;
}

export interface RevisionLogEntry {
  id: string;
  changed_field: string;
  previous_value: unknown;
  new_value: unknown;
  cause: 'user_edit' | 'consistency_finding_accept' | 'scenario_accept';
  cause_id: string;
  timestamp: string;
}

export interface ConsistencyFinding {
  id: string;
  fields_in_conflict: string[];
  issue_type: CriticIssueType;
  evidence: string;
  why_it_matters: string;
  sharper_alternative: string;
  user_action: 'accept' | 'reject' | 'edit' | null;
}

export interface ExportBundle {
  generated_at: string;
  format: 'markdown' | 'pdf';
  content: string;
  status: 'exported' | 'failed';
  failure_reason?: string;
}

/** Canonical Shared Context — owned by frontend, sent as slices to backend. */
export interface SharedContext {
  project_id: string;
  user_facts: Record<string, unknown>;
  ai_assumptions: Record<string, { value: unknown; rationale: string }>;
  approved_decisions: Partial<Record<StageName, ApprovedDecision>>;
  stage_drafts: Partial<Record<StageName, StageDraft>>;
  critic_findings: CriticFinding[];
  consistency_findings: ConsistencyFinding[];
  scenario_overrides: ScenarioOverride[];
  revision_log: RevisionLogEntry[];
}

/** Per-stage UI state tracked by the store alongside SharedContext. */
export interface StageUIState {
  approval_state: ApprovalState;
  is_loading: boolean;
  error: StageErrorResponse | null;
}

export interface StageErrorResponse {
  stage: StageName;
  error_type: 'schema_validation_failed' | 'provider_unavailable' | 'rate_limited';
  message: string;
  retryable: boolean;
}

/** User input submitted from the Idea Input form. */
export interface IdeaInput {
  business_description: string; // 1–500 words; user-typed only
  target_audience?: string;     // optional; explicitly user-provided
  category?: string;            // optional; explicitly user-provided
  constraints?: string;         // optional; explicitly user-provided
}

/* Fact Tracking & Provenance (Phase 2 & Phase 6) */
export type FactConfidence =
  | 'user_provided_fact'
  | 'user_confirmed_fact'
  | 'ai_hypothesis'
  | 'unknown';

export type FactCategory =
  | 'concept'
  | 'problem'
  | 'audience'
  | 'product_service'
  | 'differentiation'
  | 'location_market'
  | 'budget_constraints'
  | 'goals';

export interface FactItem {
  id: string;
  category: FactCategory;
  label: string;
  text: string;
  confidence: FactConfidence;
  source?: string;
  confirmed_at?: string;
}

export type InterviewState =
  | 'COLLECTING'
  | 'CLARIFYING'
  | 'READY_FOR_DISCOVERY'
  | 'DISCOVERY_DRAFT'
  | 'USER_REVIEW'
  | 'APPROVED'
  | 'NEXT_GATE';

export interface InterviewQuestion {
  id: string;
  question: string;
  reason: string;
  options?: string[];
  targetCategory: FactCategory;
  allowsUnknown?: boolean;
}

export interface ReadinessAssessment {
  isReady: boolean;
  missingCritical: string[];
  conceptSummary?: string;
  score: number;
  nextQuestion?: InterviewQuestion;
}

export interface InterviewResponse {
  state: InterviewState;
  message: string;
  question?: InterviewQuestion;
  readiness: ReadinessAssessment;
  extractedFacts: FactItem[];
  discoveryDraft?: DiscoveryContent;
}

export interface DiscoveryContent {
  brand_concept?: string;
  core_problem: string;
  proposed_solution?: string;
  target_audience: string;
  context_situation: string;
  user_goals: string;
  constraints: string;
  value_desired_outcome: string;
  differentiation?: string;
  brand_goals?: string;
  customer_needs?: string[];
  open_questions: string[];
  known_facts: string[];
  inferred_assumptions: Array<{ value: string; rationale: string }>;
}


