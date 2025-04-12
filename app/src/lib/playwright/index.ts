/**
 * Módulo principal que orquestra todo o processo de automação
 */

import { Browser, Page } from 'playwright';
import { iniciarNavegador, fecharNavegador } from './browser';
import { realizarLogin } from './login';
import { consultarProcesso } from './consulta';

interface Processo {
  id: string;
  numero: string;
}

interface Credenciais {
  site: string;
  usuario: string;
  senha: string;
}

interface ResultadoConsulta {
  sucesso: boolean;
  encontrado?: boolean;
  dados?: any;
  erro?: string;
  processoId?: string;
  numeroProcesso?: string;
}

/**
 * Salva o resultado da consulta no Supabase
 * Esta função será implementada posteriormente
 */
async function salvarResultado(resultado: ResultadoConsulta): Promise<void> {
  // Implementação futura para salvar no Supabase
  console.log('Salvando resultado:', resultado.numeroProcesso);
}

/**
 * Executa consultas para uma lista de processos
 * @param processos Lista de processos a serem consultados
 * @param credenciais Credenciais para acesso ao site
 * @returns Lista com os resultados das consultas
 */
export async function executarConsultas(processos: Processo[], credenciais: Credenciais): Promise<ResultadoConsulta[]> {
  const resultados: ResultadoConsulta[] = [];
  let browser: Browser | null = null;
  let page: Page | null = null;
  
  try {
    // Iniciar o navegador
    const { browser: browserInstance, page: pageInstance } = await iniciarNavegador();
    browser = browserInstance;
    page = pageInstance;
    
    // Realizar login
    const loginResult = await realizarLogin(page, credenciais);
    if (!loginResult.sucesso) {
      throw new Error(`Falha no login: ${loginResult.erro}`);
    }
    
    // Consultar cada processo
    for (const processo of processos) {
      console.log(`Consultando processo: ${processo.numero}`);
      
      const resultado = await consultarProcesso(page, processo.numero);
      
      // Adicionar informações do processo ao resultado
      resultado.processoId = processo.id;
      resultado.numeroProcesso = processo.numero;
      
      // Salvar resultado no Supabase
      if (resultado.sucesso && resultado.encontrado) {
        await salvarResultado(resultado);
      }
      
      resultados.push(resultado);
    }
  } catch (error) {
    console.error('Erro durante a execução das consultas:', error);
  } finally {
    // Garantir que o navegador seja fechado mesmo em caso de erro
    if (browser) {
      await fecharNavegador(browser);
    }
  }
  
  return resultados;
}

/**
 * Executa uma única consulta para um processo específico
 * @param processo Processo a ser consultado
 * @param credenciais Credenciais para acesso ao site
 * @returns Resultado da consulta
 */
export async function executarConsultaUnica(processo: Processo, credenciais: Credenciais): Promise<ResultadoConsulta> {
  const resultados = await executarConsultas([processo], credenciais);
  return resultados[0] || {
    sucesso: false,
    erro: 'Falha ao executar consulta'
  };
}
