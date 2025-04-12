/**
 * Responsável por extrair dados da página de resultados do TJAL
 */

import { Page } from 'playwright';

interface Movimentacao {
  data?: string;
  descricao?: string;
}

interface Parte {
  tipo?: string;
  nome?: string;
}

interface DadosProcesso {
  numeroProcesso?: string;
  classe?: string;
  assunto?: string;
  distribuicao?: string;
  juiz?: string;
  valorAcao?: string;
  statusProcesso?: string;
  movimentacoes: Movimentacao[];
  partes: Parte[];
  dataConsulta: string;
}

/**
 * Extrai dados da página de resultados da consulta no TJAL
 * @param page Instância da página do Playwright
 * @returns Objeto com os dados extraídos
 */
export async function extrairDados(page: Page): Promise<DadosProcesso> {
  // Extrair informações básicas do processo
  const numeroProcesso = await page.textContent('#numeroProcesso') || undefined;
  const classe = await page.textContent('#classeProcesso') || undefined;
  const assunto = await page.textContent('#assuntoProcesso') || undefined;
  const distribuicao = await page.textContent('div:has-text("Distribuíção") + div.secaoFormBody') || undefined;
  const juiz = await page.textContent('div:has-text("Juiz") + div.secaoFormBody') || undefined;
  const valorAcao = await page.textContent('#valorAcaoProcesso') || undefined;
  
  // Extrair o status do processo
  const statusProcesso = await page.textContent('#situacaoProcesso') || undefined;
  
  // Extrair movimentações
  const movimentacoes = await page.$$eval('table#tabelaTodasMovimentacoes tr:not(.fundoClaro)', (items) => {
    return items.map(item => {
      const dataElement = item.querySelector('td.dataMovimentacao');
      const descricaoElement = item.querySelector('td.descricaoMovimentacao');
      
      return {
        data: dataElement?.textContent?.trim(),
        descricao: descricaoElement?.textContent?.trim()
      };
    });
  }).catch(() => []);
  
  // Extrair partes do processo
  const partes = await page.$$eval('table.secaoFormBody tr:has(td.nomeParteEAdvogado)', (items) => {
    return items.map(item => {
      const tipoElement = item.querySelector('td:first-child');
      const nomeElement = item.querySelector('td.nomeParteEAdvogado span.nomeParteEAdvogado');
      
      return {
        tipo: tipoElement?.textContent?.trim(),
        nome: nomeElement?.textContent?.trim()
      };
    });
  }).catch(() => []);
  
  return {
    numeroProcesso,
    classe,
    assunto,
    distribuicao,
    juiz,
    valorAcao,
    statusProcesso,
    movimentacoes,
    partes,
    dataConsulta: new Date().toISOString()
  };
}
