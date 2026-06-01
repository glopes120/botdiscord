import { Message } from 'discord.js';

/**
 * Serviço de chat do Discord.
 *
 * Responsável por operações mais complexas em mensagens:
 * - Filtragem de palavras‑chave
 * - Formatação especial
 * - Regras do servidor
 *
 * Este serviço pode ser expandido futuramente com:
 * - Sistema de points
 * - Comandos complexos
 * - Integração com bancos de dados
 */
export class ChatService {
  /** Lista de palavras‑chave para filtrar (ex: spam, NSFW) */
  private readonly forbiddenWords: string[] = ['spam', 'proibido'];

  /**
   * Verifica se uma mensagem contém conteúdo proibido.
   * @param content - Conteúdo da mensagem
   * @returns true se contém palavra proibida
   */
  public containsForbiddenContent(content: string): boolean {
    return this.forbiddenWords.some(
      word => content.toLowerCase().includes(word.toLowerCase())
    );
  }

  /**
   * Formata uma mensagem para exibição especial (ex: negrito).
   * Nota: Isso é apenas um exemplo; em Discord, usa-se Markdown.
   * @param content - Conteúdo original
   * @returns Conteúdo formatado
   */
  public formatSpecialMessage(content: string): string {
    return `**[BOT]** ${content}`;
  }

  /**
   * Valida se uma mensagem pode ser enviada para outro canal.
   * @param message - Mensagem do Discord
   * @returns Objeto com validação e motivo (se inválido)
   */
  public validateForCrossPosting(message: Message): {
    isValid: boolean;
    reason?: string;
  } {
    // Ignorar mensagens de bot
    if (message.author.bot) {
      return {
        isValid: false,
        reason: 'Mensagem de bot'
      };
    }

    // Ignorar mensagens vazias
    if (!message.content.trim()) {
      return {
        isValid: false,
        reason: 'Mensagem vazia'
      };
    }

    // Ignorar mensagens com conteúdo proibido
    if (this.containsForbiddenContent(message.content)) {
      return {
        isValid: false,
        reason: 'Conteúdo proibido'
      };
    }

    return { isValid: true };
  }
}