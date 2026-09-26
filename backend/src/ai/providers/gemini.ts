import type { ZodSchema } from 'zod';
import type { CriticFinding } from '@foil/shared';
import {
  AIProvider,
  AIProviderResult,
  AIProviderError,
  RateLimitError,
  TimeoutError,
  extractJSONFromText,
} from '../provider.js';

export interface GeminiProviderConfig {
  apiKey?: string;
  model?: string;
  defaultTimeoutMs?: number;
}

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private defaultTimeoutMs: number;

  constructor(config: GeminiProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = config.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.defaultTimeoutMs =
      config.defaultTimeoutMs ||
      Number(process.env.AI_REQUEST_TIMEOUT_MS) ||
      30000;

    if (!this.apiKey) {
      throw new AIProviderError(
        'GEMINI_API_KEY is not configured on the server',
        'provider_unavailable',
        false
      );
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<AIProviderResult<T>> {
    return this.callGemini(prompt, schema, options);
  }

  async generateCritique(
    prompt: string,
    schema: ZodSchema<CriticFinding[]>,
    options?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<AIProviderResult<CriticFinding[]>> {
    return this.callGemini(prompt, schema, options);
  }

  private async callGemini<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<AIProviderResult<T>> {
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitError('Gemini API rate limit exceeded (HTTP 429)', 10);
        }
        const errorText = await response.text().catch(() => '');
        throw new AIProviderError(
          `Gemini API error (HTTP ${response.status}): ${errorText.slice(0, 200)}`,
          'provider_unavailable',
          response.status >= 500
        );
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJSON = extractJSONFromText(raw);

      try {
        const parsedJSON = JSON.parse(cleanJSON);
        const validated = schema.safeParse(parsedJSON);

        if (validated.success) {
          return { raw, parsed: validated.data };
        } else {
          return {
            raw,
            parsed: null,
            validationError: validated.error.message,
          };
        }
      } catch (parseErr: unknown) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        return {
          raw,
          parsed: null,
          validationError: `JSON parse error: ${msg}`,
        };
      }
    } catch (err: unknown) {
      if (err instanceof AIProviderError) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new TimeoutError(`Gemini request timed out after ${timeoutMs}ms`);
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new AIProviderError(`Gemini connection failed: ${msg}`, 'provider_unavailable', true);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
