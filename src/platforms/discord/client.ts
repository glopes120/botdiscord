/**
 * CLIENTE DO DISCORD
 * * Intenção: Isolar toda a lógica específica da biblioteca discord.js.
 * Como estagiários focados em boas práticas, não queremos que o nosso 
 * orquestrador saiba o que é uma classe "Message" do Discord. O objetivo 
 * desta classe é conectar ao Discord, ouvir os eventos e convertê-los 
 * para o nosso formato universal (PlatformEvent).
 */

import { Client, GatewayIntentBits, Message } from 'discord.js';
import { PlatformEvent, EventType } from '../../shared/types/platformEvents';

export class DiscordClient {
  // Mantemos o cliente do discord em privado por questões de segurança de encapsulamento
  private client: Client;
  private token: string;

  // Callbacks injetados pelo orquestrador
  private messageCallback: ((event: PlatformEvent) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  constructor(token: string) {
    this.token = token;

    // Inicializamos o cliente apenas com as permissões restritas que precisamos.
    // Em servidores com 4GB de RAM, pedir intents desnecessários consome mais memória.
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });
  }

  /**
   * Método chamado pelo orquestrador para iniciar a ligação.
   */
  public async initialize(): Promise<void> {
    this.setupListeners();
    await this.client.login(this.token);
  }

  /**
   * Centraliza o registo de todos os eventos vindos do Discord.
   */
  private setupListeners(): void {
    // Evento de sucesso de ligação
    this.client.on('ready', () => {
      console.log(`[DISCORD] Sessão iniciada com a tag: ${this.client.user?.tag}`);
    });

    // Evento acionado sempre que uma mensagem é enviada no Discord
    this.client.on('messageCreate', (message: Message) => {
      // Ignorar mensagens de outros bots para evitar ciclos infinitos (loops)
      if (message.author.bot) return;

      // Normalização: Transformamos o dado cru do Discord num PlatformEvent genérico.
      // Omitimos o guildId na criação base para respeitar o strict mode do TypeScript.
      const normalizedEvent: PlatformEvent = {
        type: EventType.Message,
        source: 'discord',
        channel: message.channel.isDMBased() ? 'DM' : message.channel.name,
        channelId: message.channel.id,
        author: message.author.tag,
        content: message.content,
        id: message.id
      };

      // Injetamos a propriedade guildId apenas se a mensagem vier efetivamente de um servidor
      if (message.guild?.id) {
        normalizedEvent.guildId = message.guild.id;
      }

      // Disparamos a função de callback para enviar a mensagem tratada para o orquestrador
      if (this.messageCallback) {
        this.messageCallback(normalizedEvent);
      }
    });

    // Captura e repasse de erros
    this.client.on('error', (error: Error) => {
      if (this.errorCallback) {
        this.errorCallback(error);
      }
    });
  }

  /**
   * Regista a função que vai ouvir as mensagens.
   */
  public onMessage(callback: (message: PlatformEvent) => void): void {
    this.messageCallback = callback;
  }

  /**
   * Regista a função que vai ouvir os erros.
   */
  public onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Encerra a ligação de forma limpa, essencial para poupar recursos no Linux Server.
   */
  public async destroy(): Promise<void> {
    await this.client.destroy();
  }

  /**
   * Envia uma mensagem para um canal específico.
   */
  public async sendMessage(channelId: string, content: string): Promise<void> {
    try {
      const channel = this.client.channels.cache.get(channelId);
      if (channel && channel.isTextBased() && 'send' in channel) {
        await channel.send(content);
      } else {
        console.warn(`[DISCORD] O canal ${channelId} não foi encontrado ou não permite texto.`);
      }
    } catch (error) {
      console.error(`[DISCORD] Erro ao enviar mensagem para o canal ${channelId}:`, error);
    }
  }
}