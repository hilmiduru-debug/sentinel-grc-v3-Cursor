/**
 * LocalLLMProvider — Banka-İçi (On-Premise) Sunucu Adaptörü.
 *
 * Bu sınıf, bankanın kendi sunucusuna kurulan yerel/özel bir LLM'e
 * (ör. LM Studio, Ollama, vLLM, TGI) bağlanmak için kullanılır.
 *
 * Gereksinim: Sunucunun OpenAI-uyumlu bir REST endpoint sunması (çoğu framework sağlar).
 * Base URL örneği: http://192.168.1.100:1234/v1
 *
 * Dikkat: API key gerekmez, placeholder olarak 'local-auth' gönderilir.
 */
import { OpenAIProvider } from './openai-provider';

export class LocalLLMProvider extends OpenAIProvider {
  /**
   * @param baseUrl - On-Prem LLM sunucu adresi (ör. http://localhost:1234/v1)
   * @param model   - Sunucuda yüklü olan model adı (ör. llama-3-8b-instruct)
   */
  constructor(baseUrl: string, model: string) {
    // API key gerekmez; OpenAI Provider baseUrl parametresini kullanır
    super('local-auth', model, baseUrl);
  }
}
