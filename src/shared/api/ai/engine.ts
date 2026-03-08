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
 case 'local':
 engine = new LocalLLMProvider(
 config.baseUrl || 'http://localhost:1234/v1',
 config.model || 'default',
 );
 break;
 default:
 throw new Error(`Unknown provider: ${config.provider}`);
 }

 cachedEngine = engine;
 cachedConfigHash = hash;
 return engine;
}

export function clearEngineCache(): void {
 cachedEngine = null;
 cachedConfigHash = '';
}
