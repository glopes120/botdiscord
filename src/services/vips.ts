import * as fs from 'fs';
import * as path from 'path';

export class VipService {
  private dataPath: string;
  private vips: Record<string, string> = {};
  private greetedSession: Set<string> = new Set(); // Guarda quem já foi recebido

  constructor() {
    this.dataPath = path.join(process.cwd(), 'data', 'vips.json');
    this.loadVips();
  }

  private loadVips(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const fileContent = fs.readFileSync(this.dataPath, 'utf-8');
        const rawVips = JSON.parse(fileContent);
        // Converter todas as chaves para minúsculas para evitar erros de case-sensitive
        this.vips = {};
        for (const [key, value] of Object.entries(rawVips)) {
          this.vips[key.toLowerCase()] = value as string;
        }
      } else {
        this.vips = {};
      }
    } catch (error) {
      console.error('[VIP] Erro ao carregar vips.json', error);
      this.vips = {};
    }
  }

  /**
   * Verifica se o utilizador é VIP e se ainda não foi recebido nesta sessão.
   * Se sim, devolve a mensagem e marca-o como recebido.
   * Se não, devolve null.
   */
  public checkGreeting(username: string): string | null {
    const usernameLower = username.toLowerCase();
    
    // Se não está na lista de VIPs ou já foi recebido hoje/na sessão
    if (!this.vips[usernameLower] || this.greetedSession.has(usernameLower)) {
      return null;
    }

    // Marca como recebido e devolve a mensagem
    this.greetedSession.add(usernameLower);
    return this.vips[usernameLower];
  }

  /**
   * Recarrega o ficheiro para o caso de teres adicionado alguém novo manualmente
   */
  public reload(): void {
    this.loadVips();
  }
}
