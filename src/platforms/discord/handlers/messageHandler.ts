import { Message } from 'discord.js';

/**
 * Handler responsável por processar mensagens recebidas no Discord.
 *
 * Este módulo é deliberadamente simples e focado:
 * - Converte a mensagem do Discord num evento normalizado
 * - Não faz lógica de negócio (essa é responsabilidade do Orchestrator)
 *
 * @param message - Mensagem recebida do discord.js
 * @returns Evento normalizado para o Orchestrator
 */
export function handleDiscordMessage(message: Message): void {
  // Ignorar mensagens de bots para evitar loops
  if (message.author.bot) return;

  // Normalizar o evento para o formato inter-plataforma
  const normalizedEvent = {
    type: 'message',
    source: 'discord',
    channel: message.channel.name ?? 'direct_message',
    author: message.author.tag,
    content: message.content,
    id: message.id,
    guildId: message.guild?.id
  };

  // Nota: O orquestrador já está inscrito via onMessage()
  // Esta função serve como transformador de dados
  console.log(`[Discord] ${normalizedEvent.author} em #${normalizedEvent.channel}: ${normalizedEvent.content}`);
}