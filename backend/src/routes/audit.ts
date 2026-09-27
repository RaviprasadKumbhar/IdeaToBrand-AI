import { Request, Response, Router } from 'express';
import { ConsistencyAuditService, ConsistencyAuditError } from '../stages/consistencyAudit.js';
import { getAIProvider } from '../ai/factory.js';

export const auditRouter = Router();
const auditService = new ConsistencyAuditService();

/**
 * POST /api/audit/holistic
 * Runs the Holistic Consistency Audit across all approved brand decisions.
 * Architecture Section 18 & 20: Enforces 409 error if Launch Prep (or any preceding stage) is not approved.
 */
auditRouter.post('/audit/holistic', async (req: Request, res: Response) => {
  const payload = req.body || {};
  const approvedDecisions =
    payload.approved_decisions || payload.context?.approved_decisions || {};

  try {
    const provider = getAIProvider();
    const findings = await auditService.runAudit(approvedDecisions, provider);
    return res.status(200).json({ findings });
  } catch (err: unknown) {
    if (err instanceof ConsistencyAuditError) {
      return res.status(err.statusCode).json({
        error_type: 'audit_gated',
        missing_stage: err.missingStage,
        message: err.message,
      });
    }

    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('validation failed')) {
      return res.status(422).json({
        error_type: 'schema_validation_failed',
        message: msg,
      });
    }

    return res.status(502).json({
      error_type: 'provider_unavailable',
      message: msg || 'Holistic consistency audit execution failed.',
    });
  }
});

/**
 * POST /api/audit/resolve
 * Resolves a specific consistency finding with user action ('accept' | 'reject' | 'edit').
 */
auditRouter.post('/audit/resolve', (req: Request, res: Response) => {
  const { context, findings, finding_id, action, resolution } = req.body || {};

  if (!context || !findings || !finding_id || !action) {
    return res.status(400).json({
      error_type: 'invalid_request',
      message: "Request must include 'context', 'findings', 'finding_id', and 'action'.",
    });
  }

  try {
    const result = auditService.resolveFinding(
      context,
      findings,
      finding_id,
      action,
      resolution
    );
    return res.status(200).json({
      ...result,
      context: result.updatedContext,
      findings: result.updatedFindings,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(422).json({
      error_type: 'finding_resolution_failed',
      message: msg,
    });
  }
});
