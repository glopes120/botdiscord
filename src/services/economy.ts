import { promises as fs } from 'fs';
import * as path from 'path';

interface EconomyData {
  [username: string]: number;
}

export class EconomyService {
  private dataFile = path.join(process.cwd(), 'data', 'economy.json');
  private balances: EconomyData = {};

  constructor() {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      const fileContent = await fs.readFile(this.dataFile, 'utf-8');
      this.balances = JSON.parse(fileContent);
    } catch (error) {
      // Se o ficheiro não existir, inicia vazio
      this.balances = {};
    }
  }

  private async saveData(): Promise<void> {
    try {
      await fs.writeFile(this.dataFile, JSON.stringify(this.balances, null, 2), 'utf-8');
    } catch (error) {
      console.error('[ECONOMIA] Erro ao guardar ficheiro:', error);
    }
  }

  public addPoints(username: string, amount: number): void {
    const user = username.toLowerCase();
    if (!this.balances[user]) {
      this.balances[user] = 0;
    }
    this.balances[user] += amount;
    this.saveData(); // Save immediately or periodically
  }

  public getPoints(username: string): number {
    const user = username.toLowerCase();
    return this.balances[user] || 0;
  }
}
