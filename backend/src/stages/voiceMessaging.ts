import type {
  StageDraft,
  CriticFinding,
  SharedContext,
  VoiceMessagingContent,
  StageErrorResponse,
  ApprovedDecision,
} from '@foil/shared';
import { VoiceMessagingSchema, writeApprovedDecision } from '@foil/shared';
import type { AIProvider } from '../ai/provider.js';
import { RetryManager } from '../validation/retryManager.js';
import { CriticEngine } from '../critic/index.js';

export interface VoiceMessagingStageInput {
  approved_decisions: Partial<Record<string, ApprovedDecision>>;
  raw_input?: string;
}

export class VoiceMessagingStageService {
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
   * T-024 Voice + Messaging Generation.
   *
   * Invariants enforced:
   * 1. Requires approved Naming + Personality decision.
   * 2. Enforces between 3 and 4 sample messages, each with an explanation.
   * 3. Critic evaluates sample messages against approved personality traits.
   * 4. Draft and approved state are strictly separated.
   */
  async generateVoiceMessagingDraft(
    input: VoiceMessagingStageInput,
    provider: AIProvider
  ): Promise<{
    draft: StageDraft;
    content: VoiceMessagingContent;
    findings: CriticFinding[];
  }> {
    const namingDecision = input.approved_decisions.naming_personality;
    if (!namingDecision || namingDecision.state !== 'approved') {
      const err: StageErrorResponse = {
        stage: 'voice_messaging',
        error_type: 'schema_validation_failed',
        message:
          'Voice + Messaging stage requires an approved Naming + Personality decision before it can run. Upstream dependency missing.',
        retryable: false,
      };
      throw err;
    }

    const namingContent = namingDecision.content;

    const prompt = `You are the Strategist AI for FOIL.
Generate a cohesive brand voice system and sample messages grounded in the approved Naming & Personality traits.

HARD INVARIANTS:
1. SAMPLE MESSAGES QUANTITY: Provide between 3 and 4 sample messages in sample_messages. Each message must include "message" and "explanation".
2. Provide do_list and dont_list guidelines.
3. Ground the tone in approved personality traits.
4. Output valid JSON strictly conforming to VoiceMessagingSchema.

Approved Naming & Personality:
${JSON.stringify(namingContent, null, 2)}

Respond with valid JSON:
{
  "voice_description": "<core brand voice description>",
  "tone_characteristics": ["<tone 1>", "<tone 2>"],
  "do_list": ["<do rule 1>", "<do rule 2>"],
  "dont_list": ["<dont rule 1>", "<dont rule 2>"],
  "sample_messages": [
    { "message": "<sample message copy>", "explanation": "<why this reflects the brand voice>" }
  ]
}`;

    const execution = await this.retryManager.executeWithRetry<VoiceMessagingContent>(
      'voice_messaging',
      prompt,
      VoiceMessagingSchema,
      provider,
      (data) => {
        if (data.sample_messages.length < 3 || data.sample_messages.length > 4) {
          return {
            valid: false,
            reason: `sample_messages must contain 3 or 4 messages (found ${data.sample_messages.length}).`,
          };
        }
        return { valid: true };
      }
    );

    const draft: StageDraft = {
      stage: 'voice_messaging',
      content: execution.data as unknown as Record<string, unknown>,
      generated_at: new Date().toISOString(),
      attempt: execution.attemptCount,
    };

    const findings = await this.criticEngine.critiqueStage(
      'voice_messaging',
      execution.data as unknown as Record<string, unknown>,
      { approved_decisions: input.approved_decisions as any },
      provider
    );

    const finalContent: VoiceMessagingContent = {
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
   * User approval action for Voice + Messaging.
   */
  approveVoiceMessaging(
    ctx: SharedContext,
    content: VoiceMessagingContent,
    causeId: string,
    userEdits?: Partial<VoiceMessagingContent>
  ): SharedContext {
    const finalApproved = userEdits ? { ...content, ...userEdits } : content;
    const cause = userEdits ? 'user_edit' : 'strategist_approved';

    return writeApprovedDecision(
      ctx,
      'voice_messaging',
      finalApproved as unknown as Record<string, unknown>,
      cause,
      causeId
    );
  }
}
