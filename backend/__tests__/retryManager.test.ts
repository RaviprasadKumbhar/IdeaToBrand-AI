import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { RetryManager } from '../src/validation/retryManager.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import type { StageErrorResponse } from '@foil/shared';

describe('T-007: Schema Validation & Bounded Retry Handling', () => {
  const TestSchema = z.object({
    headline: z.string().min(5),
    tags: z.array(z.string()).min(1),
  });

  it('succeeds immediately on attempt 1 with valid JSON matching schema', async () => {
    const validData = { headline: 'Great headline', tags: ['branding'] };
    const provider = new MockAIProvider({
      mockResponseGenerator: () => JSON.stringify(validData),
    });

    const manager = new RetryManager({ maxAutoRetries: 2 });
    const result = await manager.executeWithRetry('discovery', 'Prompt', TestSchema, provider);

    expect(result.data).toEqual(validData);
    expect(result.attemptCount).toBe(1);
  });

  it('recovers on retry when first attempt is malformed JSON or schema invalid', async () => {
    let callCount = 0;
    const provider = new MockAIProvider({
      mockResponseGenerator: () => {
        callCount++;
        if (callCount === 1) {
          // Attempt 1: Invalid (missing tags, headline too short)
          return JSON.stringify({ headline: 'Bad' });
        }
        // Attempt 2: Corrected valid payload
        return JSON.stringify({ headline: 'Corrected Headline', tags: ['ai', 'strategy'] });
      },
    });

    const manager = new RetryManager({ maxAutoRetries: 2 });
    const result = await manager.executeWithRetry('discovery', 'Initial prompt', TestSchema, provider);

    expect(callCount).toBe(2);
    expect(result.attemptCount).toBe(2);
    expect(result.data.headline).toBe('Corrected Headline');
  });

  it('enforces maximum 2 automatic retries (3 total attempts) and throws visible structured error', async () => {
    let callCount = 0;
    const provider = new MockAIProvider({
      mockResponseGenerator: () => {
        callCount++;
        // Always return invalid payload
        return JSON.stringify({ wrong_key: 'never valid' });
      },
    });

    const manager = new RetryManager({ maxAutoRetries: 2 });

    let caughtError: StageErrorResponse | null = null;
    try {
      await manager.executeWithRetry('discovery', 'Prompt', TestSchema, provider);
    } catch (err: unknown) {
      caughtError = err as StageErrorResponse;
    }

    expect(caughtError).not.toBeNull();
    expect(callCount).toBe(3); // 1 initial + 2 retries = 3 attempts
    expect(caughtError?.stage).toBe('discovery');
    expect(caughtError?.error_type).toBe('schema_validation_failed');
    expect(caughtError?.retryable).toBe(true);
    expect(caughtError?.message).toContain('Schema validation failed after 3 attempts');
  });

  it('never returns synthesized or fake fallback success on failure', async () => {
    const provider = new MockAIProvider({
      mockResponseGenerator: () => 'Completely invalid non-json string',
    });

    const manager = new RetryManager({ maxAutoRetries: 2 });

    await expect(
      manager.executeWithRetry('positioning', 'Prompt', TestSchema, provider)
    ).rejects.toMatchObject({
      stage: 'positioning',
      error_type: 'schema_validation_failed',
    });
  });
});
