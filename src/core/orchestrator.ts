/**
 * ORQUESTRADOR CENTRAL
 * * Intenção: Este é o núcleo da nossa aplicação. Como boas práticas de engenharia de software,
 * garantimos que a Twitch e o Discord nunca comunicam diretamente (baixo acoplamento).
 * O Orquestrador consome os eventos normalizados de ambos e decide o que fazer.
 * * Eficiência: O uso do Promise.all no arranque permite inicializar os serviços
 * em paralelo, reduzindo o tempo de "cold start" no servidor Linux de 4GB de RAM.
 */

import * as dotenv from 'dotenv';
import { DiscordClient } from '../platforms/discord/client';
import { TwitchClient } from '../platforms/twitch/client';
import { PlatformEvent } from '../shared/types/platformEvents';
import { ModerationService } from '../services/moderation';
import { EconomyService } from '../services/economy';
import { AiService } from '../services/ai';
import { VipService } from '../services/vips';

// Carregar variáveis de ambiente antes de qualquer lógica de negócio
dotenv.config();

class Orchestrator {
  private discord: DiscordClient;
  private twitch: TwitchClient;
  private moderation: ModerationService;
  private economy: EconomyService;
  private ai: AiService;
  private vips: VipService;
  private discordBridgeChannelId: string;

  constructor() {
    // Validação estrita (Fail-Fast): Se faltar alguma credencial, o programa
    const discordToken = process.env.DISCORD_TOKEN;
    const twitchUsername = process.env.TWITCH_USERNAME;
    const twitchPassword = process.env.TWITCH_PASSWORD;
    const twitchChannel = process.env.TWITCH_CHANNEL;
    const discordChannelId = process.env.DISCORD_CHANNEL_ID;
    const groqApiKey = process.env.GROQ_API_KEY || '';

    if (!discordToken || !twitchUsername || !twitchPassword || !twitchChannel || !discordChannelId) {
      console.error('[ERRO FATAL] Variáveis de ambiente em falta. Verifica o teu ficheiro .env');
      process.exit(1);
    }

    this.discordBridgeChannelId = discordChannelId;
    this.moderation = new ModerationService();
    this.economy = new EconomyService();
    this.vips = new VipService();
    this.ai = new AiService(groqApiKey);

    // Instanciar os clientes injetando as credenciais seguras
    this.discord = new DiscordClient(discordToken);

    this.twitch = new TwitchClient({
      nickname: twitchUsername,
      token: twitchPassword,
      channelId: twitchChannel
    });
  }

  /**
   * Ponto de entrada assíncrono para o ciclo de vida da aplicação.
   */
  public async start(): Promise<void> {
    try {
      console.log('A iniciar a infraestrutura central...');

      // 1. Configurar o roteamento de mensagens ANTES de abrir as ligações externas
      this.setupRouting();

      // 2. Ligar ambas as plataformas simultaneamente para otimizar tempo de execução
      await Promise.all([
        this.discord.initialize(),
        this.twitch.initialize()
      ]);

      console.log('[SISTEMA] Orquestrador ativo e a escutar eventos.');

    } catch (error) {
      console.error('[ERRO CRÍTICO] Falha no arranque do orquestrador:', error);
      process.exit(1);
    }
  }

  /**
   * Define as regras de negócio: o que acontece quando chega uma mensagem?
   */
  private setupRouting(): void {
    // Quando o cliente do Discord avisa o Orquestrador de uma nova mensagem
    this.discord.onMessage(async (event: PlatformEvent) => {
      await this.processMessage(event, 'discord');
    });

    // Quando o cliente da Twitch avisa o Orquestrador de uma nova mensagem no chat
    this.twitch.onMessage(async (event: PlatformEvent) => {
      await this.processMessage(event, 'twitch');
    });

    // Roteamento global de erros para impedir que a thread do Node.js vá abaixo
    this.discord.onError((err) => console.error('[Erro Discord]', err));
    this.twitch.onError((err) => console.error('[Erro Twitch]', err));
  }

  private async processMessage(event: PlatformEvent, platform: 'discord' | 'twitch'): Promise<void> {
    // 1. Verificar se é VIP e enviar saudação (só acontece na primeira mensagem da sessão)
    const vipGreeting = this.vips.checkGreeting(event.author);
    if (vipGreeting) {
      this.reply(platform, vipGreeting);
    }

    // Verificar comandos primeiro
    if (event.content.startsWith('!pontos')) {
      const pontos = this.economy.getPoints(event.author);
      const resposta = `@${event.author}, tens atualmente ${pontos} pontos!`;
      this.reply(platform, resposta);
      return;
    }

    if (event.content.startsWith('!ai ')) {
      const pergunta = event.content.slice(4).trim();
      const resposta = await this.ai.askQuestion(pergunta);
      this.reply(platform, `@${event.author} ${resposta}`);
      return;
    }

    // Economia: Dar 1 ponto por mensagem enviada (se não for comando)
    if (!event.content.startsWith('!')) {
      this.economy.addPoints(event.author, 1);
    }

    // Moderação e Ponte
    if (platform === 'discord') {
      if (event.channelId !== this.discordBridgeChannelId) return;
      if (this.moderation.isClean(event.content)) {
        this.twitch.sendMessage(`[Discord] ${event.author}: ${event.content}`);
      } else {
        console.warn(`[Moderação] Mensagem bloqueada do Discord: ${event.content}`);
      }
    } else if (platform === 'twitch') {
      if (this.moderation.isClean(event.content)) {
        this.discord.sendMessage(this.discordBridgeChannelId, `**[Twitch] ${event.author}**: ${event.content}`);
      } else {
        console.warn(`[Moderação] Mensagem bloqueada da Twitch: ${event.content}`);
      }
    }
  }

  private reply(platform: 'discord' | 'twitch', message: string): void {
    if (platform === 'discord') {
      this.discord.sendMessage(this.discordBridgeChannelId, message);
    } else {
      this.twitch.sendMessage(message);
    }
  }
}

// Inicializar e arrancar o processo
const brain = new Orchestrator();
brain.start();