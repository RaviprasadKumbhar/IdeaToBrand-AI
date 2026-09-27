import { Request, Response, Router } from 'express';
import type { StageName, SharedContext, CriticFinding } from '@foil/shared';
import { ScenarioProbeService } from '../stages/scenarioProbe.js';
import { getAIProvider } from '../ai/factory.js';

export const scenarioProbeRouter = Router();
const scenarioService = new ScenarioProbeService();

/**
 * Handles Scenario Probe execution for both /api/scenario-probe/run and /api/scenario-probe.
 * Generates an isolated scenario branch for affected fields with Strategist and Critic.
 */
async function handleScenarioRun(req: Request, res: Response) {
  const payload = req.body || {};
  const triggered_from_stage = payload.triggered_from_stage as StageName;
  const what_if_input = payload.what_if_input;

  if (!triggered_from_stage || !what_if_input) {
    return res.status(400).json({
      error_type: 'invalid_request',
      message: "Request payload must include 'triggered_from_stage' and 'what_if_input'.",
      retryable: false,
    });
  }

  // Support both full SharedContext and approved_decisions payload
  const context: SharedContext = payload.context || {
    project_id: payload.project_id || `proj_${Date.now()}`,
    user_facts: payload.user_facts || {},
    ai_assumptions: {},
    approved_decisions: payload.approved_decisions || {},
    stage_drafts: {},
    critic_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };

  // If called without approved_decisions for the trigger stage (e.g. standalone API probe test),
  // seed a baseline approved decision so that the probe can explore downstream impacts
  if (!context.approved_decisions[triggered_from_stage]) {
    context.approved_decisions[triggered_from_stage] = {
      stage: triggered_from_stage,
      content: {
        title: 'Initial Strategic Baseline',
        target_audience: 'General Market',
        core_problem: 'Baseline market problem',
      },
      approved_at: new Date().toISOString(),
      state: 'approved',
      source: 'strategist_approved',
    };
  }

  try {
    const provider = getAIProvider();
    const result = await scenarioService.createScenarioBranch(
      context,
      triggered_from_stage,
      what_if_input,
      provider
    );

    // Compute changed_fields and branch_critic_findings for downstream callers and UI
    const changedFields: Array<{
      stage: StageName;
      field_name: string;
      original_value: string;
      branch_value: string;
    }> = [];
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
      } else if (item.branch_draft?.content && !item.original_content) {
        for (const [key, val] of Object.entries(item.branch_draft.content)) {
          changedFields.push({
            stage: item.stage,
            field_name: key,
            original_value: "(none - ungenerated)",
            branch_value: typeof val === 'string' ? val : JSON.stringify(val),
          });
        }
      }
      if (item.critic_findings) {
        allFindings.push(...item.critic_findings);
      }
    }

    return res.status(200).json({
      ...result,
      scenario_id: result.scenario_override.id,
      what_if_input,
      triggered_from_stage,
      affected_stages: result.scenario_override.affected_fields,
      changed_fields: changedFields,
      branch_critic_findings: allFindings,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('is not approved')) {
      return res.status(409).json({
        error_type: 'unapproved_trigger_stage',
        message: msg,
      });
    }
    return res.status(422).json({
      error_type: 'scenario_probe_failed',
      message: msg,
    });
  }
}

scenarioProbeRouter.post('/scenario-probe/run', handleScenarioRun);
scenarioProbeRouter.post('/scenario-probe', handleScenarioRun);

/**
 * POST /api/scenario-probe/keep
 * Marks the scenario decision as 'keep_original' leaving approved_decisions untouched.
 */
scenarioProbeRouter.post('/scenario-probe/keep', (req: Request, res: Response) => {
  const { context, scenario_id } = req.body || {};

  if (!context || !scenario_id) {
    return res.status(400).json({
      error_type: 'invalid_request',
      message: "Request payload must include 'context' and 'scenario_id'.",
    });
  }

  try {
    const updatedContext = scenarioService.keepOriginal(context, scenario_id);
    return res.status(200).json({ context: updatedContext });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(404).json({
      error_type: 'scenario_not_found',
      message: msg,
    });
  }
});

/**
 * POST /api/scenario-probe/accept
 * Accepts scenario branch drafts and applies them to approved_decisions with revision logging.
 */
scenarioProbeRouter.post('/scenario-probe/accept', (req: Request, res: Response) => {
  const { context, scenario_id, stage_filter } = req.body || {};

  if (!context || !scenario_id) {
    return res.status(400).json({
      error_type: 'invalid_request',
      message: "Request payload must include 'context' and 'scenario_id'.",
    });
  }

  try {
    const updatedContext = scenarioService.acceptBranch(context, scenario_id, stage_filter);
    return res.status(200).json({ context: updatedContext });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(422).json({
      error_type: 'accept_branch_failed',
      message: msg,
    });
  }
});

/**
 * POST /api/scenario-probe/edit
 * Accepts an edited version of a branch draft and updates approved_decisions with revision logging.
 */
scenarioProbeRouter.post('/scenario-probe/edit', (req: Request, res: Response) => {
  const { context, scenario_id, stage, edited_content } = req.body || {};

  if (!context || !scenario_id || !stage || !edited_content) {
    return res.status(400).json({
      error_type: 'invalid_request',
      message: "Request payload must include 'context', 'scenario_id', 'stage', and 'edited_content'.",
    });
  }

  try {
    const updatedContext = scenarioService.editBranch(context, scenario_id, stage, edited_content);
    return res.status(200).json({ context: updatedContext });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(422).json({
      error_type: 'edit_branch_failed',
      message: msg,
    });
  }
});
