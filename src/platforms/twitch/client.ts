/**
 * CLIENTE DA TWITCH
 * * Intenção: Conectar ao IRC da Twitch usando a biblioteca tmi.js.
 * A lógica é idêntica à do DiscordClient: ler a mensagem crua, formatar
 * e enviar para cima na arquitetura.
 */

import tmi from 'tmi.js';
import { PlatformEvent, EventType } from '../../shared/types/platformEvents';

export interface TwitchClientConfig {
  channelId: string;
  nickname: string;
  token: string;
}

export class TwitchClient {
  private client: tmi.Client;
  private config: TwitchClientConfig;

  private messageCallback: ((event: PlatformEvent) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  constructor(config: TwitchClientConfig) {
    this.config = config;

    // Configuração estrita do cliente TMI
    this.client = new tmi.Client({
      options: { debug: false }, // Desligamos o debug para não poluir o terminal do servidor
      identity: {
        username: this.config.nickname,
        password: this.config.token
      },
      channels: [this.config.channelId]
    });
  }

  /**
   * Inicia a conexão segura aos servidores da Twitch.
   */
  public async initialize(): Promise<void> {
    this.setupListeners();
    await this.client.connect();
  }

  /**
   * Regista os eventos recebidos pelo chat da Twitch.
   */
  private setupListeners(): void {
    // Confirmação de conexão
    this.client.on('connected', (address: string, port: number) => {
      console.log(`[TWITCH] Ligado com sucesso ao chat via ${address}:${port}`);
    });

    // Leitura de mensagens
    this.client.on('message', (channel: string, tags: tmi.ChatUserstate, message: string, self: boolean) => {
      // Ignora mensagens enviadas pelo próprio bot
      if (self) return;

      // Normalização dos dados da Twitch
      // Omitimos o 'id' aqui para não violar a regra de exactOptionalPropertyTypes
      const normalizedEvent: PlatformEvent = {
        type: EventType.Message,
        source: 'twitch',
        channel: channel.replace('#', ''), // Remove a cardinal que a Twitch adiciona aos canais
        author: tags.username ?? 'Anónimo',
        content: message
      };

      // Injetamos a propriedade id apenas se a Twitch a tiver enviado com sucesso
      if (tags.id) {
        normalizedEvent.id = tags.id;
      }

      if (this.messageCallback) {
        this.messageCallback(normalizedEvent);
      }
    });

    // Captura de desligamento
    this.client.on('disconnected', (reason: string) => {
      if (this.errorCallback) {
        this.errorCallback(new Error(`Twitch desconectada: ${reason}`));
      }
    });
  }

  public onMessage(callback: (message: PlatformEvent) => void): void {
    this.messageCallback = callback;
  }

  public onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  public async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  /**
   * Envia uma mensagem para o chat da Twitch.
   */
  public async sendMessage(content: string): Promise<void> {
    try {
      await this.client.say(this.config.channelId, content);
    } catch (error) {
      console.error(`[TWITCH] Erro ao enviar mensagem:`, error);
    }
  }
}