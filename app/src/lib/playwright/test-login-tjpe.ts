/**
 * Script de teste para verificar o login no sistema PJe do TJPE
 */

import { iniciarNavegador, fecharNavegador } from './browser';
import { realizarLoginTJPE } from './login-tjpe';

// Credenciais para acesso ao TJPE
const credenciais = {
  site: 'https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/auth?response_type=code&client_id=pje-tjpe-1g-cloud&redirect_uri=https%3A%2F%2Fpje.cloud.tjpe.jus.br%2F1g%2Flogin.seam&state=343712ee-6903-45d6-a262-7e64eb0e7f08&login=true&scope=openid',
  usuario: '84769858434',
  senha: '8476guardia'
};

async function testarLoginTJPE() {
  console.log('Iniciando teste de login no TJPE...');
  
  let browser = null;
  
  try {
    // Iniciar o navegador
    console.log('Iniciando navegador...');
    const browserSetup = await iniciarNavegador();
    browser = browserSetup.browser;
    const { page } = browserSetup;
    console.log('Navegador iniciado com sucesso!');
    
    // Realizar login
    console.log('Realizando login no TJPE...');
    const loginResult = await realizarLoginTJPE(page, credenciais);
    
    // Exibir o resultado
    console.log('\n===== RESULTADO DO LOGIN =====');
    console.log(`Sucesso: ${loginResult.sucesso}`);
    
    if (!loginResult.sucesso) {
      console.log(`Erro: ${loginResult.erro}`);
    } else {
      console.log('Login realizado com sucesso!');
      
      // Aguardar para visualização manual
      console.log('\nAguardando 30 segundos para visualização manual...');
      await new Promise(resolve => setTimeout(resolve, 30000));
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
testarLoginTJPE();
