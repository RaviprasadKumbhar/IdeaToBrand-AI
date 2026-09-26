import { Request, Response, Router } from 'express';
import { StrategistInterviewEngine } from '../strategist/interviewEngine.js';
import { getAIProvider } from '../ai/factory.js';

export const interviewRouter = Router();
const interviewEngine = new StrategistInterviewEngine();

/**
 * POST /api/interview/turn
 * Orchestrates reverse-questioning, adaptive interviews, fact extraction,
 * and readiness assessment for Brand Discovery (Phase 2 & Phase 3).
 */
interviewRouter.post('/interview/turn', async (req: Request, res: Response) => {
  const { user_message, existing_facts, attachments, shared_context } = req.body || {};

  if (typeof user_message !== 'string') {
    return res.status(400).json({
      error: 'user_message must be a string',
    });
  }

  try {
    const provider = getAIProvider();
    const result = await interviewEngine.processTurn({
      userMessage: user_message,
      existingFacts: Array.isArray(existing_facts) ? existing_facts : [],
      attachments: Array.isArray(attachments) ? attachments : undefined,
      sharedContext: shared_context,
      provider,
    });

    return res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Interview processing error';
    return res.status(500).json({
      error: message,
    });
  }
});
