import type { StageName } from "./types/index.js";

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
