/**
 * Dependency map — single source of truth for architecture.md § 16.
 * Tells the system which downstream stages need `needs_review`
 * when a given upstream stage changes.
 */
import type { StageName } from '../types';

export const DEPENDENCY_MAP: Record<StageName, StageName[]> = {
  discovery: ['positioning', 'naming_personality', 'visual_brief', 'voice_messaging', 'launch_prep'],
  positioning: ['naming_personality', 'tagline_pitch', 'visual_brief', 'voice_messaging', 'launch_prep', 'consistency_audit'],
  naming_personality: ['tagline_pitch', 'visual_brief', 'voice_messaging', 'launch_prep', 'consistency_audit'],
  tagline_pitch: ['launch_prep', 'consistency_audit'],
  visual_brief: ['consistency_audit'],
  voice_messaging: ['launch_prep', 'consistency_audit'],
  launch_prep: ['consistency_audit'],
  consistency_audit: [],
  kit_export: [],
};

/**
 * Returns the stages that become `needs_review` when `changedStage` is edited.
 * Called from exactly two places: "edit an approved field" and Scenario Probe.
 */
export function affectedFields(changedStage: StageName): StageName[] {
  return DEPENDENCY_MAP[changedStage] ?? [];
}
