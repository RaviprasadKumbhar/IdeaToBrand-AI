import { describe, it, expect } from 'vitest';
import {
  VisualBriefStageService,
  MANDATORY_VISUAL_CONCEPT_LABEL,
  type VisualBriefStageInput,
} from '../src/stages/visualBrief.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import type { SharedContext } from '@foil/shared';

describe('T-022: Visual Brief Stage Service', () => {
  const initialContext: SharedContext = {
    project_id: 'proj-visual',
    user_facts: {},
    ai_assumptions: {},
    approved_decisions: {},
    stage_drafts: {},
    critic_findings: [],
    scenario_overrides: [],
    revision_log: [],
  };

  const approvedPositioning = {
    stage: 'positioning' as const,
    content: { title: 'PeerGuild' },
    approved_at: new Date().toISOString(),
    state: 'approved' as const,
    source: 'strategist_approved' as const,
  };

  const approvedNaming = {
    stage: 'naming_personality' as const,
    content: { name: 'Guildmate' },
    approved_at: new Date().toISOString(),
    state: 'approved' as const,
    source: 'strategist_approved' as const,
  };

  const validVisualPayload = {
    logo_direction: 'Monogram emblem featuring stylized intersecting nodes',
    color_mood: 'Electric intellect and grounded execution',
    hex_palette: ['#0A0A0A', '#3B82F6', '#10B981'],
    type_roles: ['Display: Space Grotesk Bold', 'Body: Inter Regular'],
    shape_language: 'Geometric angled cuts and crisp lines',
    symbol_language: 'Nodes and bridges indicating connection',
    composition_layout: 'High contrast asymmetrical grids',
    imagery_direction: 'Macro photography of collaborative hardware/software work',
    concepts_to_avoid: ['Stock photos of people shaking hands', 'Cartoon lightbulbs'],
    rationale_linking_to_audience_and_positioning: 'Matches technical caliber of student engineers',
  };

  it('throws error when either Positioning or Naming is missing from approved_decisions', async () => {
    const service = new VisualBriefStageService();
    const provider = new MockAIProvider();

    // Missing naming
    const inputMissingNaming: VisualBriefStageInput = {
      approved_decisions: {
        positioning: approvedPositioning,
      },
    };

    await expect(
      service.generateVisualBriefDraft(inputMissingNaming, provider)
    ).rejects.toMatchObject({
      stage: 'visual_brief',
      error_type: 'schema_validation_failed',
      message: expect.stringContaining('requires an approved Naming + Personality decision'),
    });

    // Missing positioning
    const inputMissingPositioning: VisualBriefStageInput = {
      approved_decisions: {
        naming_personality: approvedNaming,
      },
    };

    await expect(
      service.generateVisualBriefDraft(inputMissingPositioning, provider)
    ).rejects.toMatchObject({
      stage: 'visual_brief',
      error_type: 'schema_validation_failed',
      message: expect.stringContaining('requires an approved Positioning decision'),
    });
  });

  it('generates visual brief and attaches mandatory concept disclaimer', async () => {
    const provider = new MockAIProvider({
      mockResponseGenerator: (prompt) => {
        if (prompt.includes('Critic AI')) {
          return '[]';
        }
        return JSON.stringify(validVisualPayload);
      },
    });

    const service = new VisualBriefStageService();
    const input: VisualBriefStageInput = {
      approved_decisions: {
        positioning: approvedPositioning,
        naming_personality: approvedNaming,
      },
    };

    const result = await service.generateVisualBriefDraft(input, provider);

    expect(result.draft.stage).toBe('visual_brief');
    expect(result.content.logo_direction).toBe(validVisualPayload.logo_direction);
    expect(result.content.hex_palette).toEqual(validVisualPayload.hex_palette);

    // Mandatory disclaimer MUST be attached
    expect(result.content.concept_disclaimer).toBe(MANDATORY_VISUAL_CONCEPT_LABEL);
  });

  it('rejects invalid hex color codes and retries', async () => {
    let attempt = 0;
    const provider = new MockAIProvider({
      mockResponseGenerator: (prompt) => {
        if (prompt.includes('Critic AI')) return '[]';
        attempt++;
        if (attempt === 1) {
          // Attempt 1: Invalid hex
          return JSON.stringify({
            ...validVisualPayload,
            hex_palette: ['bad-color', '#ZZZ'],
          });
        }
        // Attempt 2: Valid hex
        return JSON.stringify(validVisualPayload);
      },
    });

    const service = new VisualBriefStageService();
    const input: VisualBriefStageInput = {
      approved_decisions: {
        positioning: approvedPositioning,
        naming_personality: approvedNaming,
      },
    };

    const result = await service.generateVisualBriefDraft(input, provider);
    expect(attempt).toBe(2);
    expect(result.draft.attempt).toBe(2);
    expect(result.content.hex_palette).toEqual(validVisualPayload.hex_palette);
  });

  it('explicit approval writes decision to approved_decisions with revision log', () => {
    const service = new VisualBriefStageService();

    const approvedCtx = service.approveVisualBrief(
      initialContext,
      validVisualPayload,
      'user-approve-visual-1'
    );

    expect(approvedCtx.approved_decisions.visual_brief).toBeDefined();
    expect(approvedCtx.approved_decisions.visual_brief?.state).toBe('approved');
    expect(approvedCtx.revision_log.length).toBe(1);
    expect(approvedCtx.revision_log[0].changed_field).toBe('visual_brief');
  });
});
