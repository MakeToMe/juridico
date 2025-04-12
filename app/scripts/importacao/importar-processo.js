require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Importar adaptadores
const TJALAdapter = require('../adaptadores/tjal-adapter');

// Importar serviços
const ProcessoService = require('../services/processo-service');

/**
 * Importa um processo para o Supabase
 * @param {string} tribunal - Sigla do tribunal (ex: TJAL)
 * @param {string} caminhoJson - Caminho para o arquivo JSON com os dados do processo
 * @returns {Promise<Object>} Resultado da importação
 */
async function importarProcesso(tribunal, caminhoJson) {
  try {
    console.log(`Iniciando importação de processo do ${tribunal}...`);
    console.log(`Arquivo JSON: ${caminhoJson}`);
    
    // Selecionar o adaptador correto com base no tribunal
    let adapter;
    switch (tribunal.toUpperCase()) {
      case 'TJAL':
        adapter = new TJALAdapter();
        break;
      // Adicionar outros tribunais aqui quando implementados
      default:
        throw new Error(`Adaptador não encontrado para o tribunal: ${tribunal}`);
    }
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(caminhoJson)) {
      throw new Error(`Arquivo não encontrado: ${caminhoJson}`);
    }
    
    // Ler o JSON
    const jsonOriginal = JSON.parse(fs.readFileSync(caminhoJson, 'utf8'));
    
    // Converter para formato padronizado
    const dadosPadronizados = adapter.converterParaFormatoPadrao(jsonOriginal);
    
    // Salvar no Supabase
    const processoService = new ProcessoService();
    const resultado = await processoService.salvarProcesso(dadosPadronizados);
    
    console.log(`
    ========== IMPORTAÇÃO CONCLUÍDA ==========
    Tribunal: ${tribunal}
    Processo: ${resultado.numeroProcesso}
    UID: ${resultado.processoUid}
    Novas movimentações: ${resultado.novasMovimentacoes}
    Movimentações já existentes: ${resultado.movimentacoesExistentes}
    ==========================================
    `);
    
    return resultado;
    
  } catch (error) {
    console.error('Erro ao importar processo:', error);
    throw error;
  }
}

/**
 * Gera um nome de arquivo JSON baseado no número do processo
 * @param {string} tribunal - Sigla do tribunal
 * @param {string} numeroProcesso - Número do processo
 * @returns {string} Nome do arquivo JSON
 */
function gerarNomeArquivoJson(tribunal, numeroProcesso) {
  // Remover caracteres especiais do número do processo
  const numeroProcessoFormatado = numeroProcesso.replace(/[^0-9]/g, '');
  return `${tribunal.toLowerCase()}-${numeroProcessoFormatado}.json`;
}

/**
 * Salva os dados extraídos em um arquivo JSON com o número do processo no nome
 * @param {string} tribunal - Sigla do tribunal
 * @param {Object} dados - Dados extraídos do processo
 * @param {string} diretorio - Diretório onde o arquivo será salvo
 * @returns {string} Caminho completo do arquivo salvo
 */
function salvarDadosProcesso(tribunal, dados, diretorio = '../dados') {
  try {
    // Criar diretório se não existir
    const dirCompleto = path.resolve(__dirname, diretorio);
    if (!fs.existsSync(dirCompleto)) {
      fs.mkdirSync(dirCompleto, { recursive: true });
    }
    
    // Extrair número do processo
    let numeroProcesso;
    switch (tribunal.toUpperCase()) {
      case 'TJAL':
        const adapter = new TJALAdapter();
        numeroProcesso = adapter.extrairNumeroProcesso(dados);
        break;
      default:
        throw new Error(`Adaptador não encontrado para o tribunal: ${tribunal}`);
    }
    
    // Gerar nome do arquivo
    const nomeArquivo = gerarNomeArquivoJson(tribunal, numeroProcesso);
    const caminhoCompleto = path.join(dirCompleto, nomeArquivo);
    
    // Salvar arquivo
    fs.writeFileSync(caminhoCompleto, JSON.stringify(dados, null, 2), 'utf8');
    console.log(`Dados salvos em: ${caminhoCompleto}`);
    
    return caminhoCompleto;
  } catch (error) {
    console.error('Erro ao salvar dados do processo:', error);
    throw error;
  }
}

// Se o script for executado diretamente
if (require.main === module) {
  // Verificar argumentos da linha de comando
  const [,, tribunal, caminhoJson] = process.argv;
  
  if (!tribunal || !caminhoJson) {
    console.error('Uso: node importar-processo.js <tribunal> <caminho-json>');
    console.error('Exemplo: node importar-processo.js TJAL ../movimentacoes-tjal.json');
    process.exit(1);
  }
  
  // Executar importação
  importarProcesso(tribunal, caminhoJson)
    .then(() => console.log('Importação concluída com sucesso!'))
    .catch(err => {
      console.error('Erro na importação:', err);
      process.exit(1);
    });
}

module.exports = {
  importarProcesso,
  salvarDadosProcesso,
  gerarNomeArquivoJson
};
