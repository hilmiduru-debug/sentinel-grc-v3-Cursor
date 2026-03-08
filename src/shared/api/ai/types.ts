export type AIProviderType = 'gemini' | 'openai' | 'groq' | 'local';

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface PingResult {
  ok: boolean;
  error?: string;
}

export interface IAIEngine {
  generateText(prompt: string, systemPrompt?: string, contextData?: string): Promise<string>;
  streamText(prompt: string, systemPrompt?: string, contextData?: string): AsyncGenerator<string>;
  ping(): Promise<PingResult>;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  gemini: 'gemini-1.5-flash',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  local: 'default',
};

export const GEMINI_MODELS = [
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Hizli & Ucretsiz' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: 'Akilli & Detayci' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'En Yeni (Paid Tier)' },
  { id: 'gemini-pro', label: 'Gemini Pro', desc: 'Legacy Stabil' },
] as const;

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', desc: 'Ucretsiz & Hizli' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', desc: 'Ultra Hizli' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', desc: 'Uzun Baglam' },
  { id: 'gemma2-9b-it', label: 'Gemma2 9B', desc: 'Google (Ucretsiz)' },
] as const;

export const GEMINI_FALLBACK_MODEL = 'gemini-1.5-flash';

export const PROVIDER_LABELS: Record<AIProviderType, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  groq: 'Groq (Ucretsiz)',
  local: 'Kurumsal On-Premise',
};
