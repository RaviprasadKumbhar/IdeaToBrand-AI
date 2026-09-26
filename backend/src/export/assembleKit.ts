import {
  assembleBrandKit,
  ConsistencyFinding,
  ExportBundle,
  SharedContext,
  validateExportEligibility,
} from "@foil/shared";

/**
 * Backend export assembler wrapper matching docs/architecture.md Section 19.
 */
export function assembleKit(
  ctx: SharedContext,
  consistencyFindings: ConsistencyFinding[] = []
): ExportBundle {
  return assembleBrandKit(ctx, consistencyFindings);
}

export { validateExportEligibility };
