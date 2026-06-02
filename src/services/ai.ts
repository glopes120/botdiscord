import OpenAI from 'openai';

export class AiService {
  private openai?: OpenAI;
  private enabled: boolean = false;

  constructor(apiKey: string) {
    if (apiKey && apiKey !== 'A_PREENCHER_AQUI') {
      // Groq usa um formato 100% compatível com a biblioteca da OpenAI
      this.openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.groq.com/openai/v1'
      });
      this.enabled = true;
    } else {
      console.warn('[AI] A chave GROQ_API_KEY não foi configurada. Funcionalidade IA desativada.');
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public async askQuestion(prompt: string): Promise<string> {
    if (!this.enabled || !this.openai) {
      return "Desculpa, mas a inteligência artificial não está configurada neste momento.";
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'llama-3.1-8b-instant', // Atualizado para o modelo ativo do Groq
        messages: [{ role: 'user', content: prompt }],
      });
      
      let text = response.choices[0]?.message?.content || "Sem resposta.";
      // Limitar tamanho para o chat
      if (text.length > 400) {
        text = text.substring(0, 397) + '...';
      }
      return text;
    } catch (error) {
      console.error('[AI] Erro ao gerar resposta:', error);
      return "Ocorreu um erro ao processar a tua pergunta com o Groq.";
    }
  }
}
