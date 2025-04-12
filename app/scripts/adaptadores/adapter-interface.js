/**
 * Interface que todos os adaptadores de tribunal devem implementar
 */
class TribunalAdapter {
  /**
   * Converte o JSON específico do tribunal para o formato padronizado
   * @param {Object} jsonOriginal - JSON original do tribunal
   * @returns {Object} JSON no formato padronizado
   */
  converterParaFormatoPadrao(jsonOriginal) {
    throw new Error('Método não implementado');
  }
  
  /**
   * Nome do tribunal
   * @returns {string} Nome do tribunal
   */
  getNomeTribunal() {
    throw new Error('Método não implementado');
  }
  
  /**
   * Extrai o número do processo do JSON original
   * @param {Object} jsonOriginal - JSON original do tribunal
   * @returns {string} Número do processo
   */
  extrairNumeroProcesso(jsonOriginal) {
    throw new Error('Método não implementado');
  }
  
  /**
   * Formata o número do processo para uso em nomes de arquivo
   * @param {string} numeroProcesso - Número do processo original
   * @returns {string} Número do processo formatado para uso em nomes de arquivo
   */
  formatarNumeroProcessoParaArquivo(numeroProcesso) {
    // Implementação padrão: remove caracteres especiais
    return numeroProcesso.replace(/[^0-9]/g, '');
  }
}

module.exports = TribunalAdapter;
