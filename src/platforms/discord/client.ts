import { Client, GatewayIntentBits } from 'discord.js';

/**
 * Cliente do Discord encapsulando a instância do discord.js.
 * Responsável apenas pela conexão e exposição de eventos brutos.
 * A orquestração (conversão para eventos comuns) é feita pelo Orchestrator.
 */
export class DiscordClient {
  /** Instância interna do discord.js */
  private client: Client;

  /**
   * Cria uma nova instância do cliente Discord.
   * @param token - Token de autenticação do bot no Discord
   */
  constructor(private readonly token: string) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });
  }

  /**
   * Inicializa a conexão com o Discord.
   * Faz login e deixa o cliente pronto para receber eventos.
   */
  public async initialize(): Promise<void> {
    try {
      await this.client.login(this.token);
    } catch (error) {
      // Re-throw para que o orchestrator possa tratar
      throw new Error(`Falha ao conectar ao Discord: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Registra um callback para ser executado quando o bot ficar pronto.
   * @param callback Função a ser chamada no evento 'ready'
   */
  public onReady(callback: () => void): void {
    this.client.on('ready', callback);
  }

  /**
   * Registra um callback para ser executado quando uma mensagem for criada.
   * @param callback Função que recebe a mensagem bruta do discord.js
   */
  public onMessage(callback: (message: any) => void): void {
    this.client.on('messageCreate', callback);
  }

  /**
   * Registra um callback para ser executado quando ocorrer um erro de conexão.
   * @param callback Função que recebe o erro
   */
  public onError(callback: (error: Error) => void): void {
    this.client.on('error', callback);
  }

  /**
   * Desconecta e destrói o cliente, liberando recursos.
   * Importante para ambientes com memória limitada.
   */
  public async destroy(): Promise<void> {
    await this.client.destroy();
  }

  /**
   * Getter expoe a instância interna (uso avançado / testes).
   * Não recomendado para uso comum, pois quebra o encapsulamento.
   */
  public getInternalClient(): Client {
    return this.client;
  }
}