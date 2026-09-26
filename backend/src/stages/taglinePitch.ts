import type {
  StageDraft,
  CriticFinding,
  SharedContext,
  TaglinePitchContent,
  StageErrorResponse,
  ApprovedDecision,
} from '@foil/shared';
import { TaglinePitchSchema, writeApprovedDecision } from '@foil/shared';
import type { AIProvider } from '../ai/provider.js';
import { RetryManager } from '../validation/retryManager.js';
import { CriticEngine } from '../critic/index.js';

export interface TaglinePitchStageInput {
  approved_decisions: Partial<Record<string, ApprovedDecision>>;
  raw_input?: string;
}

export class TaglinePitchStageService {
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
   * T-020 Tagline + Pitch Generation.
   *
   * Invariants enforced:
   * 1. Requires approved Naming + Personality decision.
   * 2. Grounded in approved name and personality traits.
   * 3. Critic evaluates competitor interchangeability and generic buzzwords.
   * 4. Draft and approved state are strictly separated.
   */
  async generateTaglinePitchDraft(
    input: TaglinePitchStageInput,
    provider: AIProvider
  ): Promise<{
    draft: StageDraft;
    content: TaglinePitchContent;
    findings: CriticFinding[];
  }> {
    const namingDecision = input.approved_decisions.naming_personality;
    if (!namingDecision || namingDecision.state !== 'approved') {
      const err: StageErrorResponse = {
        stage: 'tagline_pitch',
        error_type: 'schema_validation_failed',
        message:
          'Tagline + Pitch stage requires an approved Naming + Personality decision before it can run. Upstream dependency missing.',
        retryable: false,
      };
      throw err;
    }

    const namingContent = namingDecision.content;

    const prompt = `You are the Strategist AI for FOIL.
Generate sharp tagline options and a concise one-line pitch grounded in approved Naming & Personality.

HARD INVARIANTS:
1. AVOID COMPETITOR INTERCHANGEABILITY: Do not write slogans that could apply unchanged to a generic competitor (e.g. "Building the future of collaboration" or "Innovation starts here").
2. Provide at least one tagline option in tagline_options with matching rationale in rationale_per_tagline.
3. Provide a single punchy one_line_pitch.
4. Output valid JSON strictly conforming to TaglinePitchSchema.

Approved Naming & Personality Context:
${JSON.stringify(namingContent, null, 2)}

Respond with valid JSON:
{
  "tagline_options": ["<tagline 1>", "<tagline 2>"],
  "one_line_pitch": "<punchy one-sentence pitch>",
  "rationale_per_tagline": ["<rationale 1>", "<rationale 2>"]
}`;

    const execution = await this.retryManager.executeWithRetry<TaglinePitchContent>(
      'tagline_pitch',
      prompt,
      TaglinePitchSchema,
      provider,
      (data) => {
        if (data.tagline_options.length !== data.rationale_per_tagline.length) {
          return {
            valid: false,
            reason: 'Each tagline option must have a corresponding entry in rationale_per_tagline.',
          };
        }
        return { valid: true };
      }
    );

    const draft: StageDraft = {
      stage: 'tagline_pitch',
      content: execution.data as unknown as Record<string, unknown>,
      generated_at: new Date().toISOString(),
      attempt: execution.attemptCount,
    };

    // Run Critic on tagline draft (enforcing competitor interchangeability check)
    const findings = await this.criticEngine.critiqueStage(
      'tagline_pitch',
      execution.data as unknown as Record<string, unknown>,
      { approved_decisions: input.approved_decisions as any },
      provider
    );

    const finalContent: TaglinePitchContent = {
      ...execution.data,
      critic_findings: findings,
    };

    return {
      draft,
      content: finalContent,
      findings,
    };
  }

  /**
   * User approval action for Tagline + Pitch.
   */
  approveTaglinePitch(
    ctx: SharedContext,
    content: TaglinePitchContent,
    causeId: string,
    userEdits?: Partial<TaglinePitchContent>
  ): SharedContext {
    const finalApproved = userEdits ? { ...content, ...userEdits } : content;
    const cause = userEdits ? 'user_edit' : 'strategist_approved';

    return writeApprovedDecision(
      ctx,
      'tagline_pitch',
      finalApproved as unknown as Record<string, unknown>,
      cause,
      causeId
    );
  }
}
