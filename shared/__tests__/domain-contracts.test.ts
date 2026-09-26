import { describe, it, expect } from 'vitest';
import { writeApprovedDecision } from '../src/store/approveDecision.js';
import type { SharedContext } from '../src/types/index.js';
import { DEPENDENCY_MAP, getAffectedDownstreamStages } from '../src/dependency-map.js';

describe('T-003: Shared Domain Contracts & Invariants', () => {
  const initialContext: SharedContext = {
    project_id: 'test-project-123',
    user_facts: { company_name: 'Acme', industry: 'EdTech' },
    ai_assumptions: {
      budget_tier: { value: 'bootstrapped', rationale: 'Student hackathon context' },
    },
    approved_decisions: {},
    stage_drafts: {},
    critic_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };

  it('writeApprovedDecision creates an approved decision and appends exactly one revision_log entry', () => {
    const discoveryContent = {
      core_problem: 'Students cannot find project partners',
      target_audience: 'College students',
    };

    const updatedContext = writeApprovedDecision(
      initialContext,
      'discovery',
      discoveryContent,
      'user_edit',
      'user-action-1'
    );

    // Context should be updated immutably
    expect(updatedContext).not.toBe(initialContext);
    expect(updatedContext.approved_decisions.discovery).toBeDefined();
    expect(updatedContext.approved_decisions.discovery?.content).toEqual(discoveryContent);
    expect(updatedContext.approved_decisions.discovery?.state).toBe('approved');
    expect(updatedContext.approved_decisions.discovery?.source).toBe('user_edit');

    // Exactly one revision_log entry appended
    expect(updatedContext.revision_log.length).toBe(1);
    const logEntry = updatedContext.revision_log[0];
    expect(logEntry.changed_field).toBe('discovery');
    expect(logEntry.previous_value).toBeNull();
    expect(logEntry.new_value).toEqual(discoveryContent);
    expect(logEntry.cause).toBe('user_edit');
    expect(logEntry.cause_id).toBe('user-action-1');
    expect(logEntry.timestamp).toBeDefined();
  });

  it('writeApprovedDecision captures previous value upon sequential updates', () => {
    const firstContent = { core_problem: 'Version 1' };
    const secondContent = { core_problem: 'Version 2' };

    const firstCtx = writeApprovedDecision(initialContext, 'discovery', firstContent, 'strategist_approved', 'strat-1');
    const secondCtx = writeApprovedDecision(firstCtx, 'discovery', secondContent, 'consistency_finding_accept', 'find-42');

    expect(secondCtx.revision_log.length).toBe(2);
    expect(secondCtx.revision_log[1].previous_value).toEqual(firstContent);
    expect(secondCtx.revision_log[1].new_value).toEqual(secondContent);
    expect(secondCtx.revision_log[1].cause).toBe('consistency_finding_accept');
    expect(secondCtx.revision_log[1].cause_id).toBe('find-42');
  });

  it('DEPENDENCY_MAP matches architecture.md specifications', () => {
    expect(DEPENDENCY_MAP.discovery).toEqual([
      'positioning',
      'naming_personality',
      'visual_brief',
      'voice_messaging',
      'launch_prep',
    ]);
    expect(DEPENDENCY_MAP.positioning).toEqual([
      'naming_personality',
      'tagline_pitch',
      'visual_brief',
      'voice_messaging',
      'launch_prep',
      'consistency_audit',
    ]);
    expect(DEPENDENCY_MAP.naming_personality).toEqual([
      'tagline_pitch',
      'visual_brief',
      'voice_messaging',
      'launch_prep',
      'consistency_audit',
    ]);
    expect(DEPENDENCY_MAP.tagline_pitch).toEqual(['launch_prep', 'consistency_audit']);
    expect(DEPENDENCY_MAP.visual_brief).toEqual(['consistency_audit']);
    expect(DEPENDENCY_MAP.voice_messaging).toEqual(['launch_prep', 'consistency_audit']);
    expect(DEPENDENCY_MAP.launch_prep).toEqual(['consistency_audit']);
    expect(DEPENDENCY_MAP.consistency_audit).toEqual(['kit_export']);
    expect(DEPENDENCY_MAP.kit_export).toEqual([]);
  });

  it('getAffectedDownstreamStages traverses all transitive dependencies', () => {
    const launchPrepDownstream = getAffectedDownstreamStages('launch_prep');
    expect(launchPrepDownstream).toEqual(['consistency_audit', 'kit_export']);

    const taglineDownstream = getAffectedDownstreamStages('tagline_pitch');
    expect(taglineDownstream).toContain('launch_prep');
    expect(taglineDownstream).toContain('consistency_audit');
    expect(taglineDownstream).toContain('kit_export');
  });
});
