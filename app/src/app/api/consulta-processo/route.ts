import { NextRequest, NextResponse } from 'next/server';
import { iniciarNavegador, fecharNavegador } from '@/lib/playwright/browser';
import { realizarLogin } from '@/lib/playwright/login';
import { consultarProcesso } from '@/lib/playwright/consulta';
import { Browser } from 'playwright';

// Credenciais hardcoded para teste
const credenciais = {
  site: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '847.698.584-34',
  senha: '8476guardia'
};

// Tempo limite para a consulta completa (3 minutos)
const TIMEOUT_CONSULTA = 3 * 60 * 1000;

/**
 * Valida o formato do número do processo no padrão CNJ
 * @param numeroProcesso Número do processo a ser validado
 * @returns true se o formato for válido, false caso contrário
 */
function validarFormatoProcesso(numeroProcesso: string): boolean {
  // Formato CNJ: NNNNNNN-NN.NNNN.N.NN.NNNN
  const regexCNJ = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
  return regexCNJ.test(numeroProcesso);
}

export async function POST(request: NextRequest) {
  let browser: Browser | null = null;
  
  try {
    // Obter o número do processo do corpo da requisição
    const { numeroProcesso } = await request.json();
    
    // Validar se o número do processo foi informado
    if (!numeroProcesso) {
      return NextResponse.json(
        { sucesso: false, erro: 'Número do processo não informado' },
        { status: 400 }
      );
    }
    
    // Validar o formato do número do processo
    if (!validarFormatoProcesso(numeroProcesso)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Formato de número de processo inválido. Use o formato CNJ: NNNNNNN-NN.NNNN.N.NN.NNNN' },
        { status: 400 }
      );
    }

    // Criar um timeout para a consulta completa
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Tempo limite excedido para a consulta do processo'));
      }, TIMEOUT_CONSULTA);
    });

    // Iniciar o navegador
    const browserSetup = await iniciarNavegador();
    browser = browserSetup.browser;
    const { page } = browserSetup;
    
    // Executar a consulta com timeout
    const consultaPromise = async () => {
      try {
        // Realizar login
        console.log(`Iniciando login no TJAL para consulta do processo ${numeroProcesso}...`);
        const loginResult = await realizarLogin(page, credenciais);
        
        if (!loginResult.sucesso) {
          throw new Error(`Falha no login: ${loginResult.erro}`);
        }
        
        console.log('Login realizado com sucesso. Consultando processo...');
        
        // Consultar o processo
        const resultadoConsulta = await consultarProcesso(page, numeroProcesso);
        
        console.log(`Consulta finalizada: ${resultadoConsulta.sucesso ? 'Sucesso' : 'Falha'}`);
        
        return resultadoConsulta;
      } catch (error) {
        console.error('Erro durante a consulta:', error);
        throw error;
      }
    };

    // Executar a consulta com timeout
    const resultado = await Promise.race([consultaPromise(), timeoutPromise]);
    
    // Retornar o resultado
    return NextResponse.json(resultado);
  } catch (error) {
    console.error('Erro ao processar consulta:', error);
    
    return NextResponse.json(
      { 
        sucesso: false, 
        erro: error instanceof Error ? error.message : 'Erro desconhecido durante a consulta' 
      },
      { status: 500 }
    );
  } finally {
    // Garantir que o navegador seja fechado mesmo em caso de erro
    if (browser) {
      try {
        await fecharNavegador(browser);
      } catch (error) {
        console.error('Erro ao fechar o navegador:', error);
      }
    }
  }
}
