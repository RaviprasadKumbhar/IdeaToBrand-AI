/**
 * Production API Client for IdeaToBrand AI (FOIL).
 * Connects directly to backend endpoints. Zero fake AI results, zero unverified assumptions.
 */
import type {
  StageName,
  CriticFinding,
  ConsistencyFinding,
  StageErrorResponse,
  FactItem,
  InterviewResponse,
  SharedContext,
} from '../../../shared/types';
import { v4 as uuid } from 'uuid';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export interface GenerateResult {
  content: Record<string, unknown>;
  findings: CriticFinding[];
  isMock?: boolean;
  note?: string;
}

export interface ScenarioBranchField {
  stage: StageName;
  field_name: string;
  original_value: string;
  branch_value: string;
}

export interface ScenarioProbeResult {
  scenario_id: string;
  what_if_input: string;
  triggered_from_stage: StageName;
  affected_stages: StageName[];
  changed_fields: ScenarioBranchField[];
  branch_critic_findings: CriticFinding[];
}

/**
 * Generate a stage draft via backend POST /api/stages/:stage/generate.
 * Hard invariant: Throws on backend failure; never silently swaps in fake mock success.
 */
export async function generateStage(
  stage: StageName,
  context: Record<string, unknown>
): Promise<GenerateResult> {
  try {
    const res = await fetch(`${BASE_URL}/api/stages/${stage}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const stageErr: StageErrorResponse = {
        stage,
        error_type: errData.error_type || (res.status === 429 ? 'rate_limited' : 'provider_unavailable'),
        message: errData.message || `Generation failed: HTTP ${res.status}`,
        retryable: res.status >= 500 || res.status === 429,
      };
      throw stageErr;
    }

    const data = await res.json();
    return {
      content: data.content,
      findings: data.findings || [],
    };
  } catch (err: unknown) {
    if ((err as StageErrorResponse)?.stage) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    const stageErr: StageErrorResponse = {
      stage,
      error_type: 'provider_unavailable',
      message: `Failed to connect to Strategist API at ${BASE_URL}: ${msg}`,
      retryable: true,
    };
    throw stageErr;
  }
}

/**
 * Sends a conversational interview turn to the Brand Strategist Engine.
 * Supports reverse-questioning, fact extraction, and readiness evaluation.
 */
export async function sendInterviewTurn(params: {
  user_message: string;
  existing_facts?: FactItem[];
  attachments?: Array<{ name: string; content?: string }>;
  shared_context?: Partial<SharedContext>;
}): Promise<InterviewResponse> {
  const res = await fetch(`${BASE_URL}/api/interview/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Interview processing failed with HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Run holistic consistency audit across all approved stage decisions.
 */
export async function runConsistencyAudit(
  approvedDecisions: Record<string, unknown>
): Promise<{ findings: ConsistencyFinding[] }> {
  const res = await fetch(`${BASE_URL}/api/audit/holistic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved_decisions: approvedDecisions }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Consistency audit failed with HTTP ${res.status}`);
  }

  return res.json();
}

function toSharedContext(input: SharedContext | Record<string, unknown>): SharedContext {
  if (input && typeof input === 'object' && 'project_id' in input) {
    return input as SharedContext;
  }
  return {
    project_id: `proj_${Date.now()}`,
    user_facts: {},
    ai_assumptions: {},
    approved_decisions: (input as any) || {},
    stage_drafts: {},
    critic_findings: [],
    consistency_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };
}

/**
 * Assemble Brand Kit export bundle from approved decisions.
 */
export async function assembleExport(
  contextOrApproved: SharedContext | Record<string, unknown>,
  consistencyFindings: ConsistencyFinding[] = []
): Promise<{ content: string; status: 'exported' | 'failed' }> {
  const context = toSharedContext(contextOrApproved);
  const res = await fetch(`${BASE_URL}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, consistency_findings: consistencyFindings }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Export assembly failed with HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Run Scenario Probe on an isolated branch.
 */
export async function runScenarioProbe(
  triggeredFrom: StageName,
  whatIfInput: string,
  contextOrApproved: SharedContext | Record<string, unknown>
): Promise<ScenarioProbeResult> {
  const context = toSharedContext(contextOrApproved);
  const res = await fetch(`${BASE_URL}/api/scenario-probe/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context,
      triggered_from_stage: triggeredFrom,
      what_if_input: whatIfInput,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Scenario probe failed with HTTP ${res.status}`);
  }

  const result = await res.json();
  const override = result.scenario_override || {};
  const branchDrafts = override.branch_drafts || [];

  const changedFields: ScenarioBranchField[] = [];
  const allFindings: CriticFinding[] = [];

  for (const item of result.comparisons || []) {
    if (item.has_changes && item.original_content && item.branch_draft?.content) {
      for (const [key, val] of Object.entries(item.branch_draft.content)) {
        if (JSON.stringify(val) !== JSON.stringify(item.original_content[key])) {
          changedFields.push({
            stage: item.stage,
            field_name: key,
            original_value: typeof item.original_content[key] === 'string' ? item.original_content[key] : JSON.stringify(item.original_content[key]),
            branch_value: typeof val === 'string' ? val : JSON.stringify(val),
          });
        }
      }
    }
    if (item.critic_findings) {
      allFindings.push(...item.critic_findings);
    }
  }

  return {
    scenario_id: override.id || uuid(),
    what_if_input: whatIfInput,
    triggered_from_stage: triggeredFrom,
    affected_stages: override.affected_fields || [triggeredFrom],
    changed_fields: changedFields,
    branch_critic_findings: allFindings,
  };
}

/** Real API client alias */
export const realGenerateStage = generateStage;
