import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  extractJSONFromText,
  AIProviderError,
  RateLimitError,
  TimeoutError,
} from '../src/ai/provider.js';
import { MockAIProvider } from '../src/ai/providers/mock.js';
import { OpenAIProvider } from '../src/ai/providers/openai.js';
import { GeminiProvider } from '../src/ai/providers/gemini.js';

describe('T-004: AI Provider Service', () => {
  describe('extractJSONFromText', () => {
    it('extracts JSON from markdown ```json fenced blocks', () => {
      const raw = 'Here is the strategic output:\n```json\n{"core_problem": "Students need teams"}\n```\nHope this helps!';
      const extracted = extractJSONFromText(raw);
      expect(extracted).toBe('{"core_problem": "Students need teams"}');
      expect(JSON.parse(extracted)).toEqual({ core_problem: 'Students need teams' });
    });

    it('extracts JSON array from raw markdown', () => {
      const raw = 'Here are findings:\n```\n[{"id": "1", "issue_type": "cliche"}]\n```';
      const extracted = extractJSONFromText(raw);
      expect(JSON.parse(extracted)).toEqual([{ id: '1', issue_type: 'cliche' }]);
    });

    it('extracts bare JSON objects with surrounding prose', () => {
      const raw = 'Introductory prose {"key": "value"} ending notes';
      const extracted = extractJSONFromText(raw);
      expect(JSON.parse(extracted)).toEqual({ key: 'value' });
    });
  });

  describe('Credential Protection & Error Structure', () => {
    it('throws clear error when OPENAI_API_KEY is missing without exposing secrets', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      expect(() => new OpenAIProvider({ apiKey: '' })).toThrowError(/OPENAI_API_KEY is not configured/);

      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    });

    it('throws clear error when GEMINI_API_KEY is missing without exposing secrets', () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      expect(() => new GeminiProvider({ apiKey: '' })).toThrowError(/GEMINI_API_KEY is not configured/);

      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    });

    it('TimeoutError structure matches requirements', () => {
      const timeout = new TimeoutError('Request timed out after 30000ms');
      expect(timeout.errorType).toBe('provider_unavailable');
      expect(timeout.retryable).toBe(true);
    });

    it('RateLimitError structure passes retry_after hint', () => {
      const rateLimit = new RateLimitError('Rate limited', 15);
      expect(rateLimit.errorType).toBe('rate_limited');
      expect(rateLimit.retryable).toBe(true);
      expect(rateLimit.retryAfterSeconds).toBe(15);
    });
  });

  describe('Mock Provider Execution', () => {
    const TestSchema = z.object({ answer: z.string() });

    it('returns parsed structured data on valid response', async () => {
      const provider = new MockAIProvider({
        mockResponseGenerator: () => JSON.stringify({ answer: '42' }),
      });

      const result = await provider.generateStructured('What is the answer?', TestSchema);
      expect(result.parsed).toEqual({ answer: '42' });
      expect(result.validationError).toBeUndefined();
    });

    it('handles simulated timeouts via AbortSignal', async () => {
      const provider = new MockAIProvider({ delayMs: 100 });
      const controller = new AbortController();
      controller.abort();

      await expect(
        provider.generateStructured('Test', TestSchema, { signal: controller.signal })
      ).rejects.toThrow(TimeoutError);
    });
  });
});
