import { GroqProvider } from './groq-provider';
import { GeminiProvider } from './gemini-provider';
import { LocalLLMProvider } from './local-provider';
import { OpenAIProvider } from './openai-provider';
import type { AIProviderConfig, IAIEngine } from './types';

let cachedEngine: IAIEngine | null = null;
let cachedConfigHash = '';

function configHash(config: AIProviderConfig): string {
  return `${config.provider}:${config.apiKey}:${config.baseUrl}:${config.model}`;
}

export function createEngine(config: AIProviderConfig): IAIEngine {
  const hash = configHash(config);
  if (cachedEngine && cachedConfigHash === hash) {
    return cachedEngine;
  }

  let engine: IAIEngine;

  switch (config.provider) {
    case 'gemini':
      engine = new GeminiProvider(config.apiKey, config.model);
      break;
    case 'openai':
      engine = new OpenAIProvider(config.apiKey, config.model, config.baseUrl || undefined);
      break;
    case 'groq':
      // Groq, OpenAI API formatıyla uyumlu — apiKey, store'dan gelen groqApiKey'dir
      engine = new GroqProvider(config.apiKey, config.model);
      break;
    case 'local':
      // On-Premise / Local LLM — baseUrl, store'dan gelen localBaseUrl'dir
      engine = new LocalLLMProvider(
        config.baseUrl || 'http://localhost:1234/v1',
        config.model || 'default',
      );
      break;
    default: {
      // TypeScript exhaustive check
      const _exhausted: never = config.provider;
      throw new Error(`Bilinmeyen AI saglayici: ${_exhausted}`);
    }
  }

  cachedEngine = engine;
  cachedConfigHash = hash;
  return engine;
}

export function clearEngineCache(): void {
  cachedEngine = null;
  cachedConfigHash = '';
}
