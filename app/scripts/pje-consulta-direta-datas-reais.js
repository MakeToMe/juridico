/**
 * Script otimizado para consultar publicações no PJE Comunicações
 * Acessando diretamente a URL com os parâmetros de consulta
 * Usando datas reais para tentar encontrar publicações existentes
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * Função para consultar publicações no PJE Comunicações
 * @param {Object} parametros - Parâmetros da consulta
 * @param {string} parametros.tribunal - Sigla do tribunal (ex: TJPE)
 * @param {string} parametros.dataInicio - Data inicial no formato YYYY-MM-DD
 * @param {string} parametros.dataFim - Data final no formato YYYY-MM-DD
 * @param {string} parametros.numeroOab - Número da OAB
 * @param {string} parametros.ufOab - UF da OAB
 * @param {string} parametros.arquivoSaida - Caminho para o arquivo de saída (JSON)
 * @returns {Promise<Object>} - Resultado da consulta
 */
async function consultarPublicacoes(parametros) {
  // Valores padrão
  const tribunal = parametros.tribunal || 'TJPE';
  const dataInicio = parametros.dataInicio || '2023-04-11';
  const dataFim = parametros.dataFim || '2023-04-17';
  const numeroOab = parametros.numeroOab || '34067';
  const ufOab = parametros.ufOab || 'pe';
  const arquivoSaida = parametros.arquivoSaida || 'publicacoes-pje.json';
  
  console.log(`Consultando publicações no ${tribunal} de ${dataInicio} a ${dataFim} para OAB ${numeroOab}/${ufOab}`);
  
  // Construir a URL com os parâmetros
  const url = `https://comunica.pje.jus.br/consulta?siglaTribunal=${tribunal}&dataDisponibilizacaoInicio=${dataInicio}&dataDisponibilizacaoFim=${dataFim}&numeroOab=${numeroOab}&ufOab=${ufOab}`;
  
  console.log(`URL de consulta: ${url}`);
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1366,768']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Acessar diretamente a URL de consulta
    console.log('Acessando a URL de consulta...');
    await page.goto(url);
    
    // Aguardar carregamento completo da página
    await page.waitForLoadState('networkidle');
    console.log('Página carregada');
    
    // Tirar screenshot da página de resultados
    await page.screenshot({ path: 'resultados-consulta.png' });
    
    // Aguardar um pouco para garantir que os resultados foram carregados
    await page.waitForTimeout(3000);
    
    // Extrair os dados das publicações
    console.log('Extraindo dados das publicações...');
    const publicacoes = await extrairPublicacoes(page);
    
    // Salvar os dados em um arquivo JSON
    if (publicacoes.length > 0) {
      console.log(`Encontradas ${publicacoes.length} publicações. Salvando em ${arquivoSaida}...`);
      await salvarPublicacoes(publicacoes, arquivoSaida);
    } else {
      console.log('Nenhuma publicação encontrada');
    }
    
    return {
      sucesso: true,
      publicacoes,
      quantidade: publicacoes.length
    };
  } catch (error) {
    console.error(`Erro ao consultar publicações: ${error.message}`);
    await page.screenshot({ path: 'erro-consulta.png' });
    
    return {
      sucesso: false,
      erro: error.message
    };
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

/**
 * Função para extrair os dados das publicações da página
 * @param {import('playwright').Page} page - Instância da página do Playwright
 * @returns {Promise<Array>} - Array com os dados das publicações
 */
async function extrairPublicacoes(page) {
  try {
    // Extrair os dados usando JavaScript no contexto da página
    const publicacoes = await page.evaluate(() => {
      // Procurar pela tabela de resultados
      const tabelas = Array.from(document.querySelectorAll('table'));
      
      if (tabelas.length === 0) {
        // Verificar se há mensagem de nenhum resultado
        const mensagens = Array.from(document.querySelectorAll('*'));
        const semResultados = mensagens.some(el => 
          el.textContent && (
            el.textContent.includes('Nenhum resultado') || 
            el.textContent.includes('Não foram encontrados')
          )
        );
        
        if (semResultados) {
          return [];
        }
        
        // Se não encontrou tabela nem mensagem, tentar outra abordagem
        const divs = Array.from(document.querySelectorAll('div[class*="resultado"], div[class*="publicacao"]'));
        
        if (divs.length === 0) {
          return [];
        }
        
        // Extrair dados das divs
        return divs.map(div => {
          const textoCompleto = div.textContent || '';
          
          // Tentar extrair informações do texto
          const numeroProcesso = extrairRegex(textoCompleto, /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
          const dataPublicacao = extrairRegex(textoCompleto, /\d{2}\/\d{2}\/\d{4}/);
          
          return {
            numeroProcesso,
            dataPublicacao,
            textoCompleto
          };
        });
      }
      
      // Encontrou tabela, extrair dados das linhas
      const tabelaResultados = tabelas[0];
      const linhas = Array.from(tabelaResultados.querySelectorAll('tr'));
      
      // Remover a primeira linha (cabeçalho)
      if (linhas.length > 0) {
        linhas.shift();
      }
      
      // Extrair dados de cada linha
      return linhas.map(linha => {
        const colunas = Array.from(linha.querySelectorAll('td'));
        
        if (colunas.length === 0) {
          return null;
        }
        
        // Extrair dados das colunas
        const dados = {};
        
        // Tentar identificar as colunas pelo conteúdo
        colunas.forEach((coluna, index) => {
          const texto = coluna.textContent.trim();
          
          // Identificar o tipo de dado pela posição ou conteúdo
          if (texto.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/)) {
            dados.numeroProcesso = texto;
          } else if (texto.match(/\d{2}\/\d{2}\/\d{4}/)) {
            dados.dataPublicacao = texto;
          } else if (index === 0) {
            dados.tribunal = texto;
          } else if (index === colunas.length - 1) {
            dados.textoPublicacao = texto;
          } else {
            // Adicionar como um campo genérico
            dados[`coluna${index}`] = texto;
          }
        });
        
        return dados;
      }).filter(item => item !== null);
      
      // Função auxiliar para extrair texto usando regex
      function extrairRegex(texto, regex) {
        const match = texto.match(regex);
        return match ? match[0] : '';
      }
    });
    
    return publicacoes;
  } catch (error) {
    console.error(`Erro ao extrair publicações: ${error.message}`);
    return [];
  }
}

/**
 * Função para salvar as publicações em um arquivo JSON
 * @param {Array} publicacoes - Array com os dados das publicações
 * @param {string} arquivoSaida - Caminho para o arquivo de saída
 * @returns {Promise<void>}
 */
async function salvarPublicacoes(publicacoes, arquivoSaida) {
  try {
    // Criar o diretório se não existir
    const diretorio = path.dirname(arquivoSaida);
    await fs.mkdir(diretorio, { recursive: true });
    
    // Salvar os dados em um arquivo JSON
    await fs.writeFile(
      arquivoSaida,
      JSON.stringify(publicacoes, null, 2),
      'utf8'
    );
    
    console.log(`Dados salvos com sucesso em ${arquivoSaida}`);
  } catch (error) {
    console.error(`Erro ao salvar publicações: ${error.message}`);
  }
}

// Função principal para executar o script
async function main() {
  try {
    // Parâmetros da consulta com datas reais (passadas) para tentar encontrar publicações
    const parametros = {
      tribunal: 'TJPE',
      dataInicio: '2023-01-01',
      dataFim: '2023-12-31',
      numeroOab: '34067',
      ufOab: 'pe',
      arquivoSaida: path.join(__dirname, '..', 'data', 'publicacoes-pje.json')
    };
    
    // Consultar publicações
    const resultado = await consultarPublicacoes(parametros);
    
    if (resultado.sucesso) {
      console.log(`Consulta realizada com sucesso! Encontradas ${resultado.quantidade} publicações.`);
    } else {
      console.log(`Falha na consulta: ${resultado.erro}`);
    }
  } catch (error) {
    console.error(`Erro na execução do script: ${error.message}`);
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

// Exportar funções para uso em outros módulos
module.exports = {
  consultarPublicacoes,
  extrairPublicacoes,
  salvarPublicacoes
};
