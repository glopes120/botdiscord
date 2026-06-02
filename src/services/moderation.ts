/**
 * SERVIÇO DE MODERAÇÃO
 * * Intenção: Isolar a lógica de moderação e validação de texto.
 * Permite facilmente expandir para usar expressões regulares avançadas ou
 * integração com APIs externas (ex: detecção de toxicidade) no futuro.
 */

export class ModerationService {
  // Lista de palavras proibidas de exemplo
  private badWords: string[] = [
    'palavrão',
    'insulto',
    'spam'
  ];

  constructor(customBadWords?: string[]) {
    if (customBadWords) {
      this.badWords = customBadWords;
    }
  }

  /**
   * Verifica se o texto é limpo (não contém palavras proibidas)
   * @param content A mensagem a ser testada
   * @returns true se a mensagem é válida, false se tiver conteúdo bloqueado
   */
  public isClean(content: string): boolean {
    const lowerContent = content.toLowerCase();

    for (const word of this.badWords) {
      // Verificação simples. Para algo avançado, podíamos usar RegEx para boundaries (\\b)
      if (lowerContent.includes(word.toLowerCase())) {
        return false;
      }
    }

    return true;
  }
}
