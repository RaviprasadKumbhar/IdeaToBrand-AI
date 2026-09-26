/**
 * FOIL Canonical Domain Contracts
 * Single source of truth across Frontend, Backend, and Shared packages.
 * Defined in docs/architecture.md Sections 6 and 7.
 */

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
  attempt: number; // 1-based; caps at 2 automatic retries
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
  state: "approved";
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
  sharper_alternative: string; // required; a finding without one is invalid
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

export interface ConsistencyFinding {
  id: string;
  fields_in_conflict: string[];
  issue_type: CriticIssueType;
  evidence: string;
  why_it_matters: string;
  sharper_alternative: string;
  user_action: CriticUserAction;
}

export interface ExportBundle {
  generated_at: string;
  format: "markdown" | "pdf";
  content: string;
  status: "exported" | "failed";
  failure_reason?: string;
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
