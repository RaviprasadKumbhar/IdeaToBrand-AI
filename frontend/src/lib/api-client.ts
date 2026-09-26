/**
 * Mock API client — used for UI development while Member 1's backend is not yet available.
 * MOCK ADAPTER — replace with real fetch calls once backend endpoints exist.
 * Every function is clearly marked [MOCK] and must be replaced before production.
 */
import type { StageName, CriticFinding, ConsistencyFinding, StageErrorResponse } from '../../../shared/types';
import { v4 as uuid } from 'uuid';

// Base URL — set VITE_API_BASE_URL or VITE_API_URL in .env for real backend
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';

export interface GenerateResult {
  content: Record<string, unknown>;
  findings: CriticFinding[];
  isMock?: boolean;
  note?: string;
}

export interface MockFlag {
  isMock: true;
  note: string;
}

/**
 * Stage generation API client — routes to real backend POST /api/stages/:stage/generate
 */
export async function generateStage(
  stage: StageName,
  context: Record<string, unknown>
): Promise<GenerateResult> {
  return realGenerateStage(stage, context);
}

/**
 * Holistic consistency audit API client — routes to real backend POST /api/audit/holistic
 */
export async function runConsistencyAudit(
  approvedDecisionsOrContext: Record<string, unknown>
): Promise<{ findings: ConsistencyFinding[]; isMock?: boolean; note?: string }> {
  const payload = approvedDecisionsOrContext.approved_decisions
    ? approvedDecisionsOrContext
    : { approved_decisions: approvedDecisionsOrContext };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/audit/holistic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (netErr: any) {
    throw new Error(netErr?.message || 'Network connection failed. Backend unreachable.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || `Audit failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * Brand kit assembly and export API client — routes to real backend POST /api/export
 */
export async function assembleExport(
  contextOrApproved: Record<string, unknown>,
  consistencyFindings: ConsistencyFinding[] = []
): Promise<{ content: string; status: 'exported' | 'failed'; isMock?: boolean; note?: string }> {
  const context = (contextOrApproved.approved_decisions && contextOrApproved.project_id)
    ? contextOrApproved
    : {
        project_id: (contextOrApproved as any).project_id || 'proj_export',
        user_facts: (contextOrApproved as any).user_facts || {},
        ai_assumptions: (contextOrApproved as any).ai_assumptions || {},
        approved_decisions: (contextOrApproved as any).approved_decisions || contextOrApproved,
        stage_drafts: (contextOrApproved as any).stage_drafts || {},
        critic_findings: (contextOrApproved as any).critic_findings || [],
        scenario_overrides: (contextOrApproved as any).scenario_overrides || [],
        revision_log: (contextOrApproved as any).revision_log || [],
      };

  const findings = consistencyFindings.length > 0
    ? consistencyFindings
    : (Array.isArray((contextOrApproved as any).consistency_findings)
        ? (contextOrApproved as any).consistency_findings
        : []);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, consistency_findings: findings }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (netErr: any) {
    throw new Error(netErr?.message || 'Network connection failed. Backend unreachable.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || `Export failed with status ${res.status}`);
  }

  const data = await res.json();
  return {
    content: data.content || '',
    status: data.status === 'success' || data.status === 'exported' ? 'exported' : 'failed',
  };
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
  branch_critic_findings: import('../../../shared/types').CriticFinding[];
}

/**
 * [MOCK] Simulate Scenario Probe — returns an isolated branch with original-vs-branch
 * values and Critic findings. Does NOT overwrite the original.
 * Replace with POST /api/scenario-probe when T-029 backend is available.
 */
export async function runScenarioProbe(
  triggeredFrom: StageName,
  whatIfInput: string,
  _approvedDecisions: Record<string, unknown>
): Promise<ScenarioProbeResult & MockFlag> {
  await delay(2000 + Math.random() * 1000);
  return {
    isMock: true,
    note: '[MOCK ADAPTER] — Replace with real POST /api/scenario-probe when T-029 backend is available.',
    scenario_id: uuid(),
    what_if_input: whatIfInput,
    triggered_from_stage: triggeredFrom,
    affected_stages: ['positioning', 'naming_personality', 'tagline_pitch'] as StageName[],
    changed_fields: [
      {
        stage: 'positioning',
        field_name: 'target_audience',
        original_value: 'University students (18–26) in project-based coursework',
        branch_value: 'Graduate students (22–28) in research-oriented programmes',
      },
      {
        stage: 'naming_personality',
        field_name: 'proposed_name',
        original_value: 'Koru',
        branch_value: 'ResearchNest',
      },
      {
        stage: 'tagline_pitch',
        field_name: 'one_line_pitch',
        original_value: 'Koru matches university students with the right collaborators for every project.',
        branch_value: 'ResearchNest connects graduate researchers with the collaborators their work demands.',
      },
    ],
    branch_critic_findings: [
      {
        id: uuid(),
        stage: 'naming_personality',
        target_field: 'proposed_name',
        issue_type: 'vague',
        evidence: '"ResearchNest" may limit the brand to academic research rather than collaborative projects broadly.',
        explanation: 'The name shifts target audience but narrows market scope more aggressively than the original.',
        sharper_alternative: 'Consider "Nexis" — connection-focused, not field-specific, preserves graduate audience without over-narrowing.',
        user_action: null,
      },
    ],
  };
}

// ─── Real API client (for when backend is available) ─────────────────────────

export async function realGenerateStage(
  stage: StageName,
  context: Record<string, unknown>
): Promise<GenerateResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/stages/${stage}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (netErr: any) {
    const err: StageErrorResponse = {
      stage,
      error_type: 'provider_unavailable',
      message: netErr?.message || 'Network connection failed. Backend service unreachable.',
      retryable: true,
    };
    throw err;
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    const err: StageErrorResponse = {
      stage,
      error_type: errData?.error_type || 'provider_unavailable',
      message: errData?.message || `HTTP ${res.status}`,
      retryable: errData?.retryable ?? true,
    };
    throw err;
  }
  return res.json();
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}



