/**
 * Script de teste para consultar um processo específico no TJAL
 */

import { iniciarNavegador, fecharNavegador } from './browser';
import { realizarLogin } from './login';
import { consultarProcesso } from './consulta';

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// Credenciais para acesso ao TJAL
const credenciais = {
  site: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '847.698.584-34',
  senha: '8476guardia'
};

async function testarConsultaProcesso() {
  console.log(`Iniciando teste de consulta do processo ${NUMERO_PROCESSO}...`);
  
  let browser = null;
  
  try {
    // Iniciar o navegador
    console.log('Iniciando navegador...');
    const browserSetup = await iniciarNavegador();
    browser = browserSetup.browser;
    const { page } = browserSetup;
    console.log('Navegador iniciado com sucesso!');
    
    // Realizar login
    console.log('Realizando login no TJAL...');
    const loginResult = await realizarLogin(page, credenciais);
    
    if (!loginResult.sucesso) {
      throw new Error(`Falha no login: ${loginResult.erro}`);
    }
    console.log('Login realizado com sucesso!');
    
    // Consultar o processo
    console.log(`Consultando processo ${NUMERO_PROCESSO}...`);
    const resultado = await consultarProcesso(page, NUMERO_PROCESSO);
    
    // Exibir o resultado
    console.log('\n===== RESULTADO DA CONSULTA =====');
    console.log(`Sucesso: ${resultado.sucesso}`);
    console.log(`Processo encontrado: ${resultado.encontrado}`);
    
    if (resultado.sucesso && resultado.encontrado) {
      console.log('\n----- DADOS DO PROCESSO -----');
      console.log(`Número: ${resultado.dados.numeroProcesso}`);
      console.log(`Classe: ${resultado.dados.classe}`);
      console.log(`Assunto: ${resultado.dados.assunto}`);
      console.log(`Distribuição: ${resultado.dados.distribuicao}`);
      console.log(`Juiz: ${resultado.dados.juiz}`);
      console.log(`Valor da Ação: ${resultado.dados.valorAcao}`);
      console.log(`Status: ${resultado.dados.statusProcesso}`);
      
      console.log('\n----- PARTES DO PROCESSO -----');
      if (resultado.dados.partes && resultado.dados.partes.length > 0) {
        resultado.dados.partes.forEach((parte: { tipo: string; nome: string }, index: number) => {
          console.log(`${index + 1}. ${parte.tipo}: ${parte.nome}`);
        });
      } else {
        console.log('Nenhuma parte encontrada.');
      }
      
      console.log('\n----- MOVIMENTAÇÕES -----');
      if (resultado.dados.movimentacoes && resultado.dados.movimentacoes.length > 0) {
        resultado.dados.movimentacoes.slice(0, 5).forEach((mov: { data: string; descricao: string }, index: number) => {
          console.log(`${index + 1}. [${mov.data}] ${mov.descricao}`);
        });
        console.log(`... mais ${resultado.dados.movimentacoes.length - 5} movimentações`);
      } else {
        console.log('Nenhuma movimentação encontrada.');
      }
    } else if (!resultado.encontrado) {
      console.log(`Erro: ${resultado.erro}`);
    }
    
    console.log('\n===== FIM DO RESULTADO =====');
    console.log('Teste concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    // Garantir que o navegador seja fechado
    if (browser) {
      console.log('Fechando navegador...');
      await fecharNavegador(browser);
      console.log('Navegador fechado com sucesso!');
    }
  }
}

// Executar o teste
testarConsultaProcesso();
