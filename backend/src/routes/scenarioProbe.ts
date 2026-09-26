import { Request, Response, Router } from 'express';
import type { StageName } from '@foil/shared';
import { ScenarioProbeService } from '../stages/scenarioProbe.js';
import { getAIProvider } from '../ai/factory.js';

export const scenarioProbeRouter = Router();
const scenarioService = new ScenarioProbeService();

/**
 * POST /api/scenario-probe/run
 * Generates an isolated scenario branch for affected fields with Strategist and Critic.
 */
scenarioProbeRouter.post('/scenario-probe/run', async (req: Request, res: Response) => {
  const { context, triggered_from_stage, what_if_input } = req.body || {};

  if (!context || !triggered_from_stage || !what_if_input) {
    return res.status(400).json({
      error_type: 'invalid_request',
      message: "Request payload must include 'context', 'triggered_from_stage', and 'what_if_input'.",
    });
  }

  try {
    const provider = getAIProvider();
    const result = await scenarioService.createScenarioBranch(
      context,
      triggered_from_stage as StageName,
      what_if_input,
      provider
    );
    return res.status(200).json(result);
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
});

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
