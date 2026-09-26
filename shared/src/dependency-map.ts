import { StageName } from "./types/index.js";

/**
 * Dependency map from PRD Section 14 and architecture.md Section 16.
 * Single source of truth for downstream stage invalidation.
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
  tagline_pitch: ["launch_prep", "consistency_audit"],
  visual_brief: ["consistency_audit"],
  voice_messaging: ["launch_prep", "consistency_audit"],
  launch_prep: ["consistency_audit"],
  consistency_audit: [],
  kit_export: [],
};

/**
 * Returns the downstream stages affected when an approved stage changes.
 */
export function affectedFields(changedStage: StageName): StageName[] {
  return DEPENDENCY_MAP[changedStage] ?? [];
}
