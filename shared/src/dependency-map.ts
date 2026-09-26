import type { StageName, SharedContext } from "./types/index.js";

/**
 * Authoritative lookup table for downstream stage dependencies.
 * Implements Section 14 of PRD and Section 16 of architecture.md.
 */
export const DEPENDENCY_MAP: Record<StageName, StageName[]> = {
  discovery: [
    "positioning",
    "naming_personality",
    "visual_brief",
    "voice_messaging",
    "launch_prep",
  ],
  positioning: [
    "naming_personality",
    "tagline_pitch",
    "visual_brief",
    "voice_messaging",
    "launch_prep",
    "consistency_audit",
  ],
  naming_personality: [
    "tagline_pitch",
    "visual_brief",
    "voice_messaging",
    "launch_prep",
    "consistency_audit",
  ],
  tagline_pitch: [
    "launch_prep",
    "consistency_audit",
  ],
  visual_brief: [
    "consistency_audit",
  ],
  voice_messaging: [
    "launch_prep",
    "consistency_audit",
  ],
  launch_prep: [
    "consistency_audit",
  ],
  consistency_audit: [
    "kit_export",
  ],
  kit_export: [],
};

/**
 * Returns the immediate downstream stages affected when an approved stage changes.
 * Defined in docs/architecture.md Section 16.
 */
export function affectedFields(changedStage: StageName): StageName[] {
  return DEPENDENCY_MAP[changedStage] ?? [];
}

/**
 * Returns all transitive downstream stages affected when the given stage changes.
 */
export function getAffectedDownstreamStages(stage: StageName): StageName[] {
  const visited = new Set<StageName>();
  const queue: StageName[] = [...(DEPENDENCY_MAP[stage] || [])];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!visited.has(current)) {
      visited.add(current);
      const downstream = DEPENDENCY_MAP[current] || [];
      for (const next of downstream) {
        if (!visited.has(next)) {
          queue.push(next);
        }
      }
    }
  }

  return Array.from(visited);
}

/**
 * T-028 Dependency Engine:
 * When an upstream approved field changes, identify relevant downstream fields and mark them
 * 'needs_review' in approved_decisions.
 *
 * Invariants enforced:
 * 1. Only affected downstream fields are marked needs_review.
 * 2. Existing content of affected fields is 100% PRESERVED (no blind wipeout/regeneration).
 * 3. Unrelated approved decisions remain untouched in 'approved' state.
 * 4. Never blindly regenerates the entire brand system.
 */
export function markAffectedFieldsNeedsReview(
  ctx: SharedContext,
  changedStage: StageName,
  options?: { transitive?: boolean }
): SharedContext {
  const affected = options?.transitive
    ? getAffectedDownstreamStages(changedStage)
    : affectedFields(changedStage);
  if (affected.length === 0) {
    return ctx;
  }

  const updatedApproved = { ...ctx.approved_decisions };
  let modified = false;

  for (const stage of affected) {
    const existing = updatedApproved[stage];
    if (existing && existing.state === "approved") {
      updatedApproved[stage] = {
        ...existing,
        state: "needs_review",
      };
      modified = true;
    }
  }

  if (!modified) {
    return ctx;
  }

  return {
    ...ctx,
    approved_decisions: updatedApproved,
  };
}
