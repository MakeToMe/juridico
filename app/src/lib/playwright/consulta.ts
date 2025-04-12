/**
 * Responsável por realizar consultas de processos no site do TJAL
 */

import { Page } from 'playwright';
import { extrairDados } from './extrator';

interface ResultadoConsulta {
  sucesso: boolean;
  erro?: string;
  encontrado?: boolean;
  dados?: any;
  processoId?: string;
  numeroProcesso?: string;
}

/**
 * Verifica se o número do processo está no formato CNJ
 * @param numeroProcesso Número do processo a ser verificado
 * @returns Verdadeiro se o formato for válido
 */
function validarFormatoCNJ(numeroProcesso: string): boolean {
  // Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
  const regexCNJ = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
  return regexCNJ.test(numeroProcesso);
}

/**
 * Realiza a consulta de um processo no site do TJAL
 * @param page Instância da página do Playwright
 * @param numeroProcesso Número do processo no formato CNJ
 * @returns Objeto com o resultado da consulta
 */
export async function consultarProcesso(page: Page, numeroProcesso: string): Promise<ResultadoConsulta> {
  try {
    console.log(`Iniciando consulta do processo: ${numeroProcesso}`);
    
    // Validar formato CNJ
    if (!validarFormatoCNJ(numeroProcesso)) {
      console.error('Formato CNJ inválido:', numeroProcesso);
      return { 
        sucesso: false, 
        erro: 'Número de processo inválido. Use o formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO' 
      };
    }

    console.log('Navegando para a página de consulta...');
    // Navegar para a página de consulta com timeout aumentado
    await page.goto('https://www2.tjal.jus.br/cpopg/search.do', { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    console.log('Aguardando carregamento do formulário de consulta...');
    // Aguardar até que o formulário de consulta esteja disponível
    await page.waitForSelector('#numeroDigitoAnoUnificado', { timeout: 30000 });
    
    console.log('Preenchendo o número do processo...');
    // Extrair as partes do número do processo corretamente
    // Formato: NNNNNNN-DD.AAAA [J.TR] OOOO
    // Exemplo: 0727108-89.2024 [8.02] 0001
    const partePrimeiroCampo = numeroProcesso.substring(0, 15); // NNNNNNN-DD.AAAA (0727108-89.2024)
    const parteTerceiroCampo = numeroProcesso.substring(21);    // OOOO (0001)
    
    console.log(`Parte primeira: ${partePrimeiroCampo}, Parte terceira: ${parteTerceiroCampo}`);
    
    // Preencher o número do processo
    await page.fill('#numeroDigitoAnoUnificado', partePrimeiroCampo);
    await page.fill('#foroNumeroUnificado', parteTerceiroCampo);
    
    // Garantir que o radio button "Unificado" esteja selecionado
    // Usando o ID correto identificado pelo diagnóstico
    await page.check('#radioNumeroUnificado');
    
    console.log('Clicando no botão de consultar...');
    // Clicar no botão de consultar e aguardar a navegação
    await Promise.all([
      page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
      page.click('#botaoConsultarProcessos')
    ]);
    
    console.log('Verificando resultado da consulta...');
    // Verificar se o processo foi encontrado
    const mensagemErro = await page.$('.mensagemErro');
    if (mensagemErro) {
      const textoErro = await mensagemErro.textContent();
      console.log(`Processo não encontrado: ${textoErro}`);
      return { sucesso: true, encontrado: false, erro: textoErro || 'Processo não encontrado' };
    }
    
    // Verificar se estamos na página de detalhes do processo
    const cabecalhoProcesso = await page.$('.cabecalhoProcesso');
    if (!cabecalhoProcesso) {
      console.log('Página de detalhes do processo não carregada corretamente');
      return { 
        sucesso: false, 
        erro: 'Página de detalhes do processo não carregada corretamente' 
      };
    }
    // Extrair dados usando o extrator
    const dados = await extrairDados(page);
    
    return {
      sucesso: true,
      encontrado: true,
      dados
    };
  } catch (error) {
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido durante a consulta'
    };
  }
}
