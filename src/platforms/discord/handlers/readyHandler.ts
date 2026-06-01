/**
 * Handler responsável pelo evento "ready" do Discord.
 *
 * Quando o bot fica pronto, este handler:
 * - Exibe informação útil para debugging
 * - Serve como ponto de verificação de saúde
 * - Pode ser estendido para lógica pós-conexão (ex: comandos slash)
 */

export function handleDiscordReady(): void {
  const readyMessage = `
    ┌──────────────────────────────────────┐
    │        BOT DO DISCORD PRONTO        │
    └──────────────────────────────────────┘
  `;
  console.log(readyMessage);
}