/**
 * Responsável por realizar o login no sistema PJe do TJPE
 */

import { Page } from 'playwright';

interface Credenciais {
  usuario: string;
  senha: string;
}

interface ResultadoLogin {
  sucesso: boolean;
  erro?: string;
}

/**
 * Realiza o login no sistema PJe do TJPE acessando a URL direta
 * @param page Instância da página do Playwright
 * @param credenciais Credenciais para acesso ao site
 * @returns Objeto indicando sucesso ou falha no login
 */
export async function realizarLoginTJPE(page: Page, credenciais: Credenciais): Promise<ResultadoLogin> {
  try {
    console.log('Navegando para a página de login do TJPE...');
    
    // URL direta para o PJe do TJPE (que redirecionará para o SSO)
    const urlPje = 'https://pje.tjpe.jus.br/1g/login.seam';
    
    // Navegar para o site do PJe com timeout aumentado
    await page.goto(urlPje, { 
      timeout: 60000, 
      waitUntil: 'networkidle' 
    });
    
    console.log('Verificando se o formulário de login está presente...');
    // Aguardar até que o formulário de login esteja disponível
    await page.waitForSelector('#username', { timeout: 30000 });
    
    console.log('Preenchendo credenciais...');
    // Preencher formulário de login do TJPE
    await page.fill('#username', credenciais.usuario);
    await page.fill('#password', credenciais.senha);
    
    console.log('Clicando no botão de login...');
    // Clicar no botão de login
    await Promise.all([
      // Esperar pelo evento de navegação que ocorre após o clique
      page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
      // Clicar no botão
      page.click('#kc-login')
    ]);
    
    console.log('Verificando resultado do login...');
    
    // Verificar se estamos na página correta após o login
    const url = page.url();
    console.log(`URL após login: ${url}`);
    
    // Verificar se há algum elemento que indique erro de login
    const erroLogin = await page.$('.alert-error, .alert-danger, .error-message');
    if (erroLogin) {
      const mensagemErro = await erroLogin.textContent();
      return { sucesso: false, erro: `Erro de login: ${mensagemErro || 'Credenciais inválidas'}` };
    }
    
    // Verificar se estamos em uma página válida após o login
    if (url.includes('pje') && url.includes('tjpe.jus.br')) {
      console.log('Login realizado com sucesso!');
      
      // Navegar para a página de consulta de processos
      console.log('Navegando para a página de consulta de processos...');
      await page.goto('https://pje.tjpe.jus.br/1g/Processo/ConsultaProcesso/listView.seam', {
        timeout: 60000,
        waitUntil: 'networkidle'
      });
      
      return { sucesso: true };
    } else {
      console.log('Redirecionamento após login não ocorreu como esperado');
      return { sucesso: false, erro: 'Redirecionamento após login não ocorreu como esperado' };
    }
  } catch (error) {
    console.error('Erro durante o login:', error);
    return { 
      sucesso: false, 
      erro: error instanceof Error ? error.message : 'Erro desconhecido durante o login'
    };
  }
}
