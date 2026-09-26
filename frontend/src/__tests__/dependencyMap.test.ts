/**
 * Tests for the dependency map (T-040, architecture.md § 16).
 * Verifies that affectedFields returns the correct downstream stages.
 */
import { describe, it, expect } from 'vitest';
import { affectedFields, DEPENDENCY_MAP } from '../../../shared/dependency-map';

describe('Dependency Map', () => {
  it('discovery affects all downstream stages', () => {
    const affected = affectedFields('discovery');
    expect(affected).toContain('positioning');
    expect(affected).toContain('naming_personality');
    expect(affected).toContain('visual_brief');
    expect(affected).toContain('voice_messaging');
    expect(affected).toContain('launch_prep');
  });

  it('positioning does not affect discovery', () => {
    const affected = affectedFields('positioning');
    expect(affected).not.toContain('discovery');
  });

  it('positioning affects naming_personality and consistency_audit', () => {
    const affected = affectedFields('positioning');
    expect(affected).toContain('naming_personality');
    expect(affected).toContain('consistency_audit');
  });

  it('launch_prep only affects consistency_audit', () => {
    const affected = affectedFields('launch_prep');
    expect(affected).toEqual(['consistency_audit']);
  });

  it('consistency_audit has no downstream dependents', () => {
    expect(affectedFields('consistency_audit')).toEqual([]);
  });

  it('kit_export has no downstream dependents', () => {
    expect(affectedFields('kit_export')).toEqual([]);
  });

  it('all stage names in DEPENDENCY_MAP are valid StageName values', () => {
    const validStages = Object.keys(DEPENDENCY_MAP);
    expect(validStages.length).toBe(9);
  });
});
