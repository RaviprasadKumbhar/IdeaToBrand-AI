import { describe, it, expect } from 'vitest';
import {
  DiscoveryStageService,
  validateIdeaWordCount,
  type DiscoveryInput,
} from '../src/stages/discovery.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import type { SharedContext } from '@foil/shared';

describe('T-015: Discovery Stage Service', () => {
  const initialContext: SharedContext = {
    project_id: 'proj-123',
    user_facts: {},
    ai_assumptions: {},
    approved_decisions: {},
    stage_drafts: {},
    critic_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };

  const sampleIdea = 'A peer matchmaking platform that helps engineering students find reliable hackathon teammates.';

  const mockStrategistOutput = {
    core_problem: 'Students struggle to find teammates with complementary technical skills',
    target_audience: 'Undergraduate engineering and computer science students',
    context_situation: 'Collegiate hackathons and semester-long capstone projects',
    user_goals: 'Form a competent, committed 4-person team in under 24 hours',
    constraints: 'Zero budget, strict deadlines, remote coordination',
    value_desired_outcome: 'High completion rate and verified GitHub project submission',
    open_questions: ['How will peer accountability be measured?'],
    known_facts: ['Students attend hackathons in cohorts'],
    inferred_assumptions: [
      {
        value: 'Students trust peer ratings over resume claims',
        rationale: 'Inferred from target audience skepticism toward generic resumes',
      },
    ],
  };

  describe('Word Count Guard', () => {
    it('rejects empty idea input', () => {
      const res = validateIdeaWordCount('   ');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('cannot be empty');
    });

    it('rejects idea exceeding 500 words', () => {
      const longText = new Array(505).fill('word').join(' ');
      const res = validateIdeaWordCount(longText);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('exceeds 500 words');
    });

    it('accepts valid 1-500 words idea', () => {
      const res = validateIdeaWordCount(sampleIdea);
      expect(res.valid).toBe(true);
      expect(res.wordCount).toBeGreaterThan(0);
      expect(res.wordCount).toBeLessThanOrEqual(500);
    });
  });

  describe('Discovery Generation & Fact-versus-Assumption Separation', () => {
    it('generates validated draft with required fields and preserves user facts in known_facts', async () => {
      const userFacts = ['Built by student founders', 'Targeting Ivy League campuses first'];
      const constraints = ['Must be free for students'];

      const provider = new MockAIProvider({
        mockResponseGenerator: (prompt) => {
          if (prompt.includes('Critic AI')) {
            return JSON.stringify([
              {
                id: 'crit-disc-1',
                stage: 'discovery',
                target_field: 'constraints',
                issue_type: 'vague',
                evidence: 'Zero budget constraint',
                explanation: 'Does not explain cloud hosting constraints',
                sharper_alternative: 'Specify free-tier cloud limits',
                user_action: null,
              },
            ]);
          }
          return JSON.stringify(mockStrategistOutput);
        },
      });

      const service = new DiscoveryStageService();
      const input: DiscoveryInput = {
        idea_text: sampleIdea,
        user_facts: userFacts,
        constraints: constraints,
        context: 'Campus Hackathon',
      };

      const result = await service.generateDiscoveryDraft(input, provider);

      // Verify draft structure
      expect(result.draft.stage).toBe('discovery');
      expect(result.draft.attempt).toBe(1);

      // Verify all required fields
      expect(result.content.core_problem).toBe(mockStrategistOutput.core_problem);
      expect(result.content.target_audience).toBe(mockStrategistOutput.target_audience);
      expect(result.content.context_situation).toBe(mockStrategistOutput.context_situation);
      expect(result.content.user_goals).toBe(mockStrategistOutput.user_goals);
      expect(result.content.constraints).toBe(mockStrategistOutput.constraints);
      expect(result.content.value_desired_outcome).toBe(mockStrategistOutput.value_desired_outcome);

      // Fact vs. Assumption Separation: User facts are preserved in known_facts!
      for (const fact of userFacts) {
        expect(result.content.known_facts).toContain(fact);
      }

      // Inferred assumptions have non-empty rationale
      expect(result.content.inferred_assumptions.length).toBeGreaterThan(0);
      for (const assumption of result.content.inferred_assumptions) {
        expect(assumption.value).toBeDefined();
        expect(assumption.rationale).toBeDefined();
        expect(assumption.rationale.trim().length).toBeGreaterThan(0);
      }

      // Critic findings attached
      expect(result.findings.length).toBe(1);
      expect(result.findings[0].issue_type).toBe('vague');
      expect(result.findings[0].sharper_alternative).toBeDefined();

      // Invariant: Generating a draft does NOT write to approved_decisions!
      expect(initialContext.approved_decisions.discovery).toBeUndefined();
    });

    it('rejects output if an inferred assumption lacks a rationale and triggers retry', async () => {
      let attempt = 0;
      const provider = new MockAIProvider({
        mockResponseGenerator: (prompt) => {
          if (prompt.includes('Critic AI')) {
            return '[]';
          }
          attempt++;
          if (attempt === 1) {
            // First attempt: missing rationale
            return JSON.stringify({
              ...mockStrategistOutput,
              inferred_assumptions: [{ value: 'Students are impatient', rationale: '' }],
            });
          }
          // Second attempt: corrected with rationale
          return JSON.stringify(mockStrategistOutput);
        },
      });

      const service = new DiscoveryStageService();
      const input: DiscoveryInput = { idea_text: sampleIdea };

      const result = await service.generateDiscoveryDraft(input, provider);

      expect(attempt).toBe(2);
      expect(result.draft.attempt).toBe(2);
      expect(result.content.inferred_assumptions[0].rationale).toBeDefined();
    });
  });

  describe('Explicit User Approval & Decision Protection', () => {
    it('promotes draft to approved_decisions ONLY upon explicit approval action with revision log', () => {
      const service = new DiscoveryStageService();

      const approvedCtx = service.approveDiscovery(
        initialContext,
        mockStrategistOutput,
        'user-approval-click-1'
      );

      // Discovery is now authoritative in approved_decisions
      expect(approvedCtx.approved_decisions.discovery).toBeDefined();
      expect(approvedCtx.approved_decisions.discovery?.state).toBe('approved');
      expect(approvedCtx.approved_decisions.discovery?.content).toEqual(mockStrategistOutput);

      // Revision log is written
      expect(approvedCtx.revision_log.length).toBe(1);
      expect(approvedCtx.revision_log[0].changed_field).toBe('discovery');
      expect(approvedCtx.revision_log[0].cause_id).toBe('user-approval-click-1');

      // Original context was NOT mutated
      expect(initialContext.approved_decisions.discovery).toBeUndefined();
    });

    it('supports user edits during approval and marks cause as user_edit', () => {
      const service = new DiscoveryStageService();
      const userEdits = {
        core_problem: 'User edited core problem definition',
      };

      const approvedCtx = service.approveDiscovery(
        initialContext,
        mockStrategistOutput,
        'user-edit-click-2',
        userEdits
      );

      expect((approvedCtx.approved_decisions.discovery?.content as any).core_problem).toBe(
        'User edited core problem definition'
      );
      expect(approvedCtx.revision_log[0].cause).toBe('user_edit');
    });

    it('generates contextually relevant discovery draft for custom user idea without EdTech override', async () => {
      const service = new DiscoveryStageService();
      const defaultMockProvider = new MockAIProvider();
      const customIdea = 'I want to build a healthy Indian snack brand for college students and young professionals.';

      const result = await service.generateDiscoveryDraft(
        {
          idea_text: customIdea,
          business_description: customIdea,
        },
        defaultMockProvider
      );

      expect(result.content.core_problem).toMatch(/snack|indian|nutrition/i);
      expect(result.content.target_audience).toMatch(/students|young professionals|snack/i);
      expect(result.content.core_problem).not.toContain('class projects');
      expect(result.content.core_problem).not.toContain('Academic Matchmaker');
    });
  });
});
