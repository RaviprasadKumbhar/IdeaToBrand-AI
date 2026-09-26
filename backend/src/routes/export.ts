import { Request, Response, Router } from "express";
import { assembleBrandKit, validateExportEligibility } from "@foil/shared";

export const exportRouter = Router();

/**
 * POST /api/export
 * Implements Stage 9 Kit Export endpoint.
 * Gated by validateExportEligibility: fails with 422 if gating conditions are not met.
 */
exportRouter.post("/export", (req: Request, res: Response) => {
  const { context, consistency_findings } = req.body || {};

  if (!context) {
    return res.status(400).json({
      error_type: "missing_context",
      message: "Request payload must include 'context' (SharedContext).",
    });
  }

  const gateResult = validateExportEligibility(context, consistency_findings || []);
  if (!gateResult.eligible) {
    return res.status(422).json({
      error_type: "export_gated",
      message: gateResult.failure_reason,
      missing_stage: gateResult.missing_stage,
      unresolved_finding_id: gateResult.unresolved_finding_id,
      invalid_field: gateResult.invalid_field,
    });
  }

  const bundle = assembleBrandKit(context, consistency_findings || []);
  if (bundle.status === "failed") {
    return res.status(422).json({
      error_type: "export_failed",
      message: bundle.failure_reason,
    });
  }

  return res.status(200).json(bundle);
});
