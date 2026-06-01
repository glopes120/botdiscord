/**
 * ============================================================================
 * ORCHESTRATOR.TS - Núcleo Central do Bot Discord-Twitch
 * ============================================================================
 *
 * OBJETIVO:
 * Este ficheiro é o cérebro da aplicação. Não contém lógica de plataforma,
 * apenas orquestra a comunicação entre os módulos do Discord e da Twitch.
 *
 * ARQUITETURA:
 * - Segue o padrão de Inversão de Dependências (DIP)
 * - Usa injeção de dependências para facilitar testes e manutenção
 * - Eventos são normalizados através de tipos compartilhados
 *
 * FLUXO DE EXECUÇÃO:
 * 1. Inicia os clientes das duas plataformas
 * 2. Regista os ouvintes (listeners) de eventos
 * 3. Quando um evento ocorre, normaliza os dados
 * 4. Propaga o evento para os handlers apropriados
 *
 * ============================================================================
 */

// =============================================================================
// IMPORTAÇÕES - Apenas módulos essenciais
// =============================================================================

import { DiscordClient } from '../platforms/discord/client';
import { TwitchClient } from '../platforms/twitch';
import { PlatformEvent, EventType } from '../shared/types/platformEvents';
import { Logger } from '../shared/utils/logger';

// =============================================================================
// INTERFACE: IOrchestratorConfig
// =============================================================================
/**
 * Define a estrutura da configuração necessária ao orquestrador.
 * Esta interface permite injetar diferentes configurações (dev/prod)
 * sem modificar o código do orquestrador.
 */
export interface IOrchestratorConfig {
  discordToken: string;
  twitchChannelId: string;
  twitchNickname: string;
  twitchToken: string;
}

// =============================================================================
// INTERFACE: IEventBus
// =============================================================================
/**
 * Interface que define o contrato para comunicação de eventos.
 * Permite trocar a implementação do "barramento de eventos" sem
 * impactar os handlers. Útil para testes ou futuras otimizações.
 */
export interface IEventBus {
  emit(event: PlatformEvent): void;
  subscribe(callback: (event: PlatformEvent) => void): void;
}

// =============================================================================
// CLASSE: Orchestrator
// =============================================================================
/**
 * Classe principal que orquestra a interação entre Discord e Twitch.
 *
 * PRINCÍPIOS DE DESIGN:
 * - SRP (Single Responsibility Principle): Uma única responsabilidade
 * - OCP (Open/Closed Principle): Aberta para extensão, fechada para modificação
 * - DIP (Dependency Inversion Principle): Depende de interfaces, não de implementações
 *
 * ESTADO INTERNO:
 * - discordClient: Cliente do Discord (só leitura após inicialização)
 * - twitchClient: Cliente da Twitch (só leitura após inicialização)
 * - logger: Instância centralizada de logging
 * - eventHandlers: Array de callbacks registados para eventos
 */
export class Orchestrator {
  /**
   * Cliente do Discord. Inicializado assincronamente.
   * @private
   */
  private discordClient: DiscordClient | null = null;

  /**
   * Cliente da Twitch. Inicializado assincronamente.
   * @private
   */
  private twitchClient: TwitchClient | null = null;

  /**
   * Logger centralizado para rastreamento de eventos e debug.
   * @private
   */
  private readonly logger: Logger;

  /**
   * Array de callbacks para eventos. Implementa o padrão Observer.
   * @private
   */
  private readonly eventHandlers: Array<(event: PlatformEvent) => void> = [];

  /**
   * Indica se o orquestrador foi inicializado com sucesso.
   * @private
   */
  private isInitialized: boolean = false;

  /**
   * Construtor do Orchestrator.
   *
   * @param config - Configuração contendo tokens e identificadores
   * @param logger - Instância do logger (injetada para flexibilidade)
   *
   * EXEMPLO DE USO:
   * const orchestrator = new Orchestrator(config, logger);
   * await orchestrator.start();
   */
  constructor(
    private readonly config: IOrchestratorConfig,
    logger: Logger
  ) {
    this.logger = logger;
    this.logger.info('Orchestrator instanciado', {
      component: 'Orchestrator',
      hasDiscordToken: !!config.discordToken,
      hasTwitchCredentials: !!(config.twitchToken && config.twitchChannelId)
    });
  }

  // =========================================================================
  // MÉTODO PRINCIPAL: start()
  // =========================================================================
  /**
   * Inicia o orquestrador e todos os clientes das plataformas.
   *
   * FLUXO:
   * 1. Valida a configuração
   * 2. Inicializa o cliente do Discord
   * 3. Inicializa o cliente da Twitch
   * 4. Regista os handlers de evento
   * 5. Marca o estado como inicializado
   *
   * @returns Promise que resolve quando todos os clientes estão conectados
   * @throws Error se a inicialização falhar
   */
  public async start(): Promise<void> {
    this.logger.info('Iniciando orquestrador...', { component: 'Orchestrator' });

    // ------------------------------------------------------------------------
    // ETAPA 1: Validação de configuração
    // ------------------------------------------------------------------------
    this.validateConfig();

    // ------------------------------------------------------------------------
    // ETAPA 2: Inicialização do cliente do Discord
    // ------------------------------------------------------------------------
    this.logger.info('Inicializando cliente do Discord...', { component: 'Orchestrator' });
    this.discordClient = new DiscordClient(this.config.discordToken);
    await this.discordClient.initialize();
    this.logger.info('Cliente do Discord inicializado com sucesso', { component: 'Orchestrator' });

    // ------------------------------------------------------------------------
    // ETAPA 3: Inicialização do cliente da Twitch
    // ------------------------------------------------------------------------
    this.logger.info('Inicializando cliente da Twitch...', { component: 'Orchestrator' });
    this.twitchClient = new TwitchClient({
      channelId: this.config.twitchChannelId,
      nickname: this.config.twitchNickname,
      token: this.config.twitchToken
    });
    await this.twitchClient.initialize();
    this.logger.info('Cliente da Twitch inicializado com sucesso', { component: 'Orchestrator' });

    // ------------------------------------------------------------------------
    // ETAPA 4: Registo de handlers de evento
    // ------------------------------------------------------------------------
    this.registerEventHandlers();

    // ------------------------------------------------------------------------
    // ETAPA 5: Marcar estado como inicializado
    // ------------------------------------------------------------------------
    this.isInitialized = true;
    this.logger.info('Orquestrador inicializado com sucesso', { component: 'Orchestrator' });
  }

  // =========================================================================
  // MÉTODO: stop()
  // =========================================================================
  /**
   * Para todos os clientes e limpa os recursos.
   *
   * IMPORTANTE: Em ambientes com recursos limitados, é crucial
   * destruir os clientes correctamente para libertar memória e ports.
   */
  public async stop(): Promise<void> {
    this.logger.info('Parando orquestrador...', { component: 'Orchestrator' });

    if (this.discordClient) {
      await this.discordClient.destroy();
      this.logger.info('Cliente do Discord desligado', { component: 'Orchestrator' });
    }

    if (this.twitchClient) {
      await this.twitchClient.disconnect();
      this.logger.info('Cliente da Twitch desligado', { component: 'Orchestrator' });
    }

    this.isInitialized = false;
    this.logger.info('Orquestrador parado', { component: 'Orchestrator' });
  }

  // =========================================================================
  // MÉTODOS DE REGISTO DE HANDLERS
  // =========================================================================
  /**
   * Regista os handlers de evento para ambas as plataformas.
   *
   * Padrão Observer: os clients emitem eventos, o orquestrador ouve.
   * @private
   */
  private registerEventHandlers(): void {
    // Handler para mensagens do Discord
    this.discordClient!.onMessage((message: PlatformEvent) => {
      this.handleDiscordMessage(message);
    });

    // Handler para mensagens da Twitch
    this.twitchClient!.onMessage((message: PlatformEvent) => {
      this.handleTwitchMessage(message);
    });

    // Handler para erros do Discord
    this.discordClient!.onError((error: Error) => {
      this.logger.error('Erro no cliente do Discord', {
        component: 'Orchestrator',
        error: error.message
      });
    });

    // Handler para erros da Twitch
    this.twitchClient!.onError((error: Error) => {
      this.logger.error('Erro no cliente da Twitch', {
        component: 'Orchestrator',
        error: error.message
      });
    });

    this.logger.info('Handlers de evento registados', { component: 'Orchestrator' });
  }

  // =========================================================================
  // MÉTODOS DE TRATAMENTO DE EVENTOS
  // =========================================================================
  /**
   * Trata mensagens recebidas do Discord.
   *
   * @param message - Mensagem do Discord (já transformada em formato comum)
   * @private
   */
  private handleDiscordMessage(message: PlatformEvent): void {
    if (!this.isInitialized) {
      this.logger.warn('Evento recebido antes da inicialização completa', {
        component: 'Orchestrator',
        eventType: message.type
      });
      return;
    }

    this.logger.debug('Mensagem do Discord recebida', {
      component: 'Orchestrator',
      channel: message.source,
      author: message.author
    });

    // Emite o evento para todos os subscribers
    this.emitEvent(message);
  }

  /**
   * Trata mensagens recebidas da Twitch.
   *
   * @param message - Mensagem da Twitch (já transformada em formato comum)
   * @private
   */
  private handleTwitchMessage(message: PlatformEvent): void {
    if (!this.isInitialized) {
      this.logger.warn('Evento recebido antes da inicialização completa', {
        component: 'Orchestrator',
        eventType: message.type
      });
      return;
    }

    this.logger.debug('Mensagem da Twitch recebida', {
      component: 'Orchestrator',
      channel: message.source,
      author: message.author
    });

    // Emite o evento para todos os subscribers
    this.emitEvent(message);
  }

  // =========================================================================
  // MÉTODOS DO EVENT BUS
  // =========================================================================
  /**
   * Emite um evento para todos os handlers registados.
   *
   * @param event - Evento a ser emitido
   * @private
   */
  private emitEvent(event: PlatformEvent): void {
    this.eventHandlers.forEach((handler, index) => {
      try {
        handler(event);
      } catch (error) {
        this.logger.error(`Erro no handler de evento ${index}`, {
          component: 'Orchestrator',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  /**
   * Regista um callback para ser notificado de eventos.
   *
   * @param callback - Função a ser chamada quando um evento ocorre
   */
  public subscribe(callback: (event: PlatformEvent) => void): void {
    this.eventHandlers.push(callback);
    this.logger.debug('Novo subscriber registado', { component: 'Orchestrator' });
  }

  // =========================================================================
  // MÉTODOS DE VALIDATION
  // =========================================================================
  /**
   * Valida a configuração necessária.
   *
   * Em ambientes de produção, falhar cedo é melhor que ter um estado
   * incerto. Este método lança erros claros para facilitar debugging.
   *
   * @throws Error se a configuração for inválida
   * @private
   */
  private validateConfig(): void {
    const errors: string[] = [];

    if (!this.config.discordToken || this.config.discordToken.trim().length === 0) {
      errors.push('discordToken é obrigatório');
    }

    if (!this.config.twitchToken || this.config.twitchToken.trim().length === 0) {
      errors.push('twitchToken é obrigatório');
    }

    if (!this.config.twitchChannelId || this.config.twitchChannelId.trim().length === 0) {
      errors.push('twitchChannelId é obrigatório');
    }

    if (!this.config.twitchNickname || this.config.twitchNickname.trim().length === 0) {
      errors.push('twitchNickname é obrigatório');
    }

    if (errors.length > 0) {
      const errorMessage = `Configuração inválida: ${errors.join(', ')}`;
      this.logger.error(errorMessage, { component: 'Orchestrator' });
      throw new Error(errorMessage);
    }

    this.logger.debug('Configuração validada com sucesso', { component: 'Orchestrator' });
  }

  // =========================================================================
  // MÉTODOS DE ACESSO ÀS PLATAFORMAS
  // =========================================================================
  /**
   * Retorna o cliente do Discord (ou null se não inicializado).
   * Útil para verificações de saúde ou operações avançadas.
   */
  public getDiscordClient(): DiscordClient | null {
    return this.discordClient;
  }

  /**
   * Retorna o cliente da Twitch (ou null se não inicializado).
   * Útil para verificações de saúde ou operações avançadas.
   */
  public getTwitchClient(): TwitchClient | null {
    return this.twitchClient;
  }

  /**
   * Verifica se o orquestrador está inicializado.
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

// =============================================================================
// FACTORY FUNCTION: createOrchestrator
// =============================================================================
/**
 * Factory function para criar uma instância do Orchestrator.
 *
 * ESTE PADRÃO:
 * - Encapsula a lógica de criação
 * - Facilita testes (mock facilmente)
 * - Permite future extensibility (ex: múltiplos orquestradores)
 *
 * @param config - Configuração do orquestrador
 * @param logger - Logger injectado
 * @returns Instância do Orchestrator
 */
export function createOrchestrator(
  config: IOrchestratorConfig,
  logger: Logger
): Orchestrator {
  return new Orchestrator(config, logger);
}