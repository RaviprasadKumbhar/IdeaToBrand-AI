import type {
  StageDraft,
  CriticFinding,
  SharedContext,
  VisualBriefContent,
  StageErrorResponse,
  ApprovedDecision,
} from '@foil/shared';
import { VisualBriefSchema, writeApprovedDecision } from '@foil/shared';
import type { AIProvider } from '../ai/provider.js';
import { RetryManager } from '../validation/retryManager.js';
import { CriticEngine } from '../critic/index.js';

export interface VisualBriefStageInput {
  approved_decisions: Partial<Record<string, ApprovedDecision>>;
  raw_input?: string;
}

export const MANDATORY_VISUAL_CONCEPT_LABEL =
  'AI-generated visual concept / design direction — not production-ready artwork.';

export class VisualBriefStageService {
  private retryManager: RetryManager;
  private criticEngine: CriticEngine;

  constructor(
    retryManager = new RetryManager(),
    criticEngine = new CriticEngine(retryManager)
  ) {
    this.retryManager = retryManager;
    this.criticEngine = criticEngine;
  }

  /**
   * T-022 Visual Brief Generation.
   *
   * Invariants enforced:
   * 1. Requires approved Positioning AND Naming + Personality decisions.
   * 2. Validates valid HEX palette colors.
   * 3. Always includes the mandatory label that this is an AI-generated visual concept/design direction.
   * 4. Evaluated by Critic for stock tropes and visual clichés.
   * 5. Draft and approved state are strictly separated.
   */
  async generateVisualBriefDraft(
    input: VisualBriefStageInput,
    provider: AIProvider
  ): Promise<{
    draft: StageDraft;
    content: VisualBriefContent;
    findings: CriticFinding[];
  }> {
    const positioningDecision = input.approved_decisions.positioning;
    const namingDecision = input.approved_decisions.naming_personality;

    if (!positioningDecision || positioningDecision.state !== 'approved') {
      const err: StageErrorResponse = {
        stage: 'visual_brief',
        error_type: 'schema_validation_failed',
        message:
          'Visual Brief stage requires an approved Positioning decision before it can run. Upstream dependency missing.',
        retryable: false,
      };
      throw err;
    }

    if (!namingDecision || namingDecision.state !== 'approved') {
      const err: StageErrorResponse = {
        stage: 'visual_brief',
        error_type: 'schema_validation_failed',
        message:
          'Visual Brief stage requires an approved Naming + Personality decision before it can run. Upstream dependency missing.',
        retryable: false,
      };
      throw err;
    }

    const positioningContent = positioningDecision.content;
    const namingContent = namingDecision.content;

    const prompt = `You are the Strategist AI for FOIL.
Generate a structured Visual Concept and Design Direction Brief grounded in approved Positioning and Naming/Personality.

HARD INVARIANTS:
1. DESIGN DIRECTION ONLY: This is a strategic visual brief and concept direction, NOT finished artwork or vector assets.
2. HEX CODES ONLY: Every item in hex_palette must be a valid hex color code (e.g. #0F172A, #38BDF8).
3. Provide typography roles, shape language, symbol language, composition, imagery direction, and concepts to avoid.
4. Output valid JSON strictly conforming to VisualBriefSchema.

Approved Positioning:
${JSON.stringify(positioningContent, null, 2)}

Approved Naming & Personality:
${JSON.stringify(namingContent, null, 2)}

Respond with valid JSON:
{
  "logo_direction": "<conceptual logo posture and mark description>",
  "color_mood": "<emotional and strategic atmosphere of the palette>",
  "hex_palette": ["#000000", "#FFFFFF"],
  "type_roles": ["<Role: Font/Style>"],
  "shape_language": "<angular, rounded, technical, etc.>",
  "symbol_language": "<symbolic metaphors>",
  "composition_layout": "<grid, density, whitespace rules>",
  "imagery_direction": "<visual art style for photography/illustration>",
  "concepts_to_avoid": ["<visual clichés to ban>"],
  "rationale_linking_to_audience_and_positioning": "<why this visual language fits the strategy>"
}`;

    const execution = await this.retryManager.executeWithRetry<VisualBriefContent>(
      'visual_brief',
      prompt,
      VisualBriefSchema,
      provider
    );

    // Guaranteed invariant: Always attach the mandatory concept disclaimer
    const contentWithDisclaimer: VisualBriefContent = {
      ...execution.data,
      concept_disclaimer: MANDATORY_VISUAL_CONCEPT_LABEL,
    };

    const draft: StageDraft = {
      stage: 'visual_brief',
      content: contentWithDisclaimer as unknown as Record<string, unknown>,
      generated_at: new Date().toISOString(),
      attempt: execution.attemptCount,
    };

    const findings = await this.criticEngine.critiqueStage(
      'visual_brief',
      contentWithDisclaimer as unknown as Record<string, unknown>,
      { approved_decisions: input.approved_decisions as any },
      provider
    );

    return {
      draft,
      content: contentWithDisclaimer,
      findings,
    };
  }

  /**
   * User approval action for Visual Brief.
   */
  approveVisualBrief(
    ctx: SharedContext,
    content: VisualBriefContent,
    causeId: string,
    userEdits?: Partial<VisualBriefContent>
  ): SharedContext {
    const finalApproved = userEdits ? { ...content, ...userEdits } : content;
    const cause = userEdits ? 'user_edit' : 'strategist_approved';

    return writeApprovedDecision(
      ctx,
      'visual_brief',
      finalApproved as unknown as Record<string, unknown>,
      cause,
      causeId
    );
  }
}
