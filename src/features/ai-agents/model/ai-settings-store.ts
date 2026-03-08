import type { AIProviderConfig, AIProviderType } from '@/shared/api/ai/types';
import { DEFAULT_MODELS } from '@/shared/api/ai/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_PERSONA = `Sen Sentinel Prime adinda, BDDK mevzuatina hakim, supheci ve detayci bir Ic Denetim asistanisin.
Kanit olmadan varsayim yapma. Her zaman kaynak goster.
Turk bankacilik sektorune ozgu riskleri, regülasyonlari ve iyi uygulamalari biliyorsun.
Yanitlarini yapilandirilmis sekilde ver: Tespitler, Riskler, Oneriler.
Turkce yanit ver.`;

interface AISettingsState {
  provider: AIProviderType;
  /** OpenAI ve Gemini API key */
  apiKey: string;
  /** Groq API key (ücretsiz, https://console.groq.com) */
  groqApiKey: string;
  /** On-Premise / Local LLM sunucu adresi */
  localBaseUrl: string;
  baseUrl: string;
  model: string;
  persona: string;
  includeContext: boolean;
  connectionStatus: 'unknown' | 'connected' | 'failed';

  setProvider: (provider: AIProviderType) => void;
  setApiKey: (key: string) => void;
  setGroqKey: (key: string) => void;
  setLocalBaseUrl: (url: string) => void;
  setBaseUrl: (url: string) => void;
  setModel: (model: string) => void;
  setPersona: (persona: string) => void;
  setIncludeContext: (include: boolean) => void;
  setConnectionStatus: (status: 'unknown' | 'connected' | 'failed') => void;
  getConfig: () => AIProviderConfig;
  isConfigured: () => boolean;
  resetPersona: () => void;
}

export const useAISettingsStore = create<AISettingsState>()(
  persist(
    (set, get) => ({
      provider: 'gemini',
      apiKey: '',
      groqApiKey: '',
      localBaseUrl: 'http://localhost:1234/v1',
      baseUrl: '',
      model: DEFAULT_MODELS.gemini,
      persona: DEFAULT_PERSONA,
      includeContext: true,
      connectionStatus: 'unknown',

      setProvider: (provider) => set({
        provider,
        model: DEFAULT_MODELS[provider],
        connectionStatus: 'unknown',
      }),
      setApiKey: (apiKey) => set({ apiKey, connectionStatus: 'unknown' }),
      setGroqKey: (groqApiKey) => set({ groqApiKey, connectionStatus: 'unknown' }),
      setLocalBaseUrl: (localBaseUrl) => set({ localBaseUrl, connectionStatus: 'unknown' }),
      setBaseUrl: (baseUrl) => set({ baseUrl, connectionStatus: 'unknown' }),
      setModel: (model) => set({ model }),
      setPersona: (persona) => set({ persona }),
      setIncludeContext: (includeContext) => set({ includeContext }),
      setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

      getConfig: () => {
        const s = get();
        // Groq için groqApiKey, local için localBaseUrl, diğerleri için apiKey kullan
        const resolvedKey = s.provider === 'groq' ? s.groqApiKey : s.apiKey;
        const resolvedBaseUrl = s.provider === 'local'
          ? (s.localBaseUrl || 'http://localhost:1234/v1')
          : (s.baseUrl || '');
        return {
          provider: s.provider,
          apiKey: resolvedKey,
          baseUrl: resolvedBaseUrl,
          model: s.model,
        };
      },

      isConfigured: () => {
        const s = get();
        if (s.provider === 'local') return !!(s.localBaseUrl);
        if (s.provider === 'groq') return !!(s.groqApiKey);
        return !!(s.apiKey);
      },

      resetPersona: () => set({ persona: DEFAULT_PERSONA }),
    }),
    {
      name: 'sentinel-ai-settings',
      partialize: (state) => ({
        provider: state.provider,
        apiKey: state.apiKey,
        groqApiKey: state.groqApiKey,
        localBaseUrl: state.localBaseUrl,
        baseUrl: state.baseUrl,
        model: state.model,
        persona: state.persona,
        includeContext: state.includeContext,
      }),
    }
  )
);
