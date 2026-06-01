import { PlatformEvent } from '../../shared/types/platformEvents';

export interface TwitchClientConfig {
  channelId: string;
  nickname: string;
  token: string;
}

export class TwitchClient {
  constructor(private config: TwitchClientConfig) {}

  public async initialize(): Promise<void> {
    // TODO: Implementar conexão com a Twitch
  }

  public onMessage(callback: (message: PlatformEvent) => void): void {
    // TODO: Implementar listener de mensagens da Twitch
  }

  public onError(callback: (error: Error) => void): void {
    // TODO: Implementar listener de erros da Twitch
  }

  public async disconnect(): Promise<void> {
    // TODO: Implementar desconexão da Twitch
  }
}
