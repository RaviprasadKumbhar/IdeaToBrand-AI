import type { AIProvider } from './provider.js';
import { OpenAIProvider } from './providers/openai.js';
import { GeminiProvider } from './providers/gemini.js';
import { MockAIProvider } from './providers/mock.js';
import { AIProviderError } from './provider.js';

let defaultProviderInstance: AIProvider | null = null;

export function getAIProvider(overrideProvider?: AIProvider): AIProvider {
  if (overrideProvider) {
    return overrideProvider;
  }

  if (defaultProviderInstance) {
    return defaultProviderInstance;
  }

  let selected = process.env.AI_PROVIDER?.toUpperCase();
  if (process.env.NODE_ENV === 'test' && process.env.AI_PROVIDER !== 'OPENAI_FORCE') {
    selected = 'MOCK';
  } else if (!selected) {
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
      selected = 'OPENAI';
    } else if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
      selected = 'GEMINI';
    } else {
      selected = 'MOCK';
    }
  }

  switch (selected) {
    case 'OPENAI':
      if (process.env.NODE_ENV === 'test' && (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.startsWith('sk-'))) {
        defaultProviderInstance = new MockAIProvider();
        return defaultProviderInstance;
      }
      defaultProviderInstance = new OpenAIProvider();
      return defaultProviderInstance;
    case 'GEMINI':
      defaultProviderInstance = new GeminiProvider();
      return defaultProviderInstance;
    case 'MOCK':
      defaultProviderInstance = new MockAIProvider();
      return defaultProviderInstance;
    default:
      throw new AIProviderError(
        `Unsupported AI_PROVIDER: "${process.env.AI_PROVIDER}". Must be 'OPENAI', 'GEMINI', or 'MOCK'.`,
        'provider_unavailable',
        false
      );
  }
}

export function setAIProvider(provider: AIProvider | null): void {
  defaultProviderInstance = provider;
}
