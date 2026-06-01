/**
 * Tipos partilhados entre as plataformas Discord e Twitch.
 * Normaliza os eventos que o Orchestrator processa.
 */
export enum EventType {
  Message = 'message',
  Ready = 'ready',
  Error = 'error',
}

export interface PlatformEvent {
  /** Tipo genérico do evento */
  type: EventType;
  /** Plataforma de origem ('discord' ou 'twitch') */
  source: 'discord' | 'twitch';
  /** Canais/servidores onde o evento ocorreu */
  channel: string;
  /** Nome do utilizador que gerou o evento */
  author: string;
  /** Conteúdo textual (mensagem, comando, etc.) */
  content: string;
  /** ID único da mensagem/evento */
  id?: string;
  /** ID do guild/servidor (apenas Discord tem) */
  guildId?: string;
  /** Dados adicionais específicos da plataforma */
  extra?: Record<string, unknown>;
}