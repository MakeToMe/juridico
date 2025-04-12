/**
 * Script simples para fazer login no TJAL e consultar processo
 * Foca apenas nas etapas essenciais
 */

const { chromium } = require('playwright');

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// URL da página de consulta de processos
const URL_CONSULTA = 'https://www2.tjal.jus.br/cpopg/open.do';

// Credenciais para acesso ao TJAL
const credenciais = {
  site: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '84769858434',
  senha: '8476guardia'
};

async function consultarProcesso() {
  console.log(`Iniciando consulta do processo ${NUMERO_PROCESSO}`);
  
  // Iniciar navegador em modo visível
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. FAZER LOGIN
    console.log('1. Fazendo login...');
    await page.goto(credenciais.site);
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    await page.click('#pbEntrar');
    
    // Aguardar um pouco após o login
    await page.waitForTimeout(5000);
    console.log('Login realizado');
    
    // 2. NAVEGAR PARA PÁGINA DE CONSULTA
    console.log('2. Navegando para página de consulta...');
    await page.goto(URL_CONSULTA);
    
    // Aguardar carregamento da página
    await page.waitForSelector('#radioNumeroUnificado');
    console.log('Página de consulta carregada');
    
    // 3. PREENCHER PROCESSO
    console.log('3. Preenchendo dados do processo...');
    
    // Selecionar opção "Unificado"
    await page.click('#radioNumeroUnificado');
    
    // Extrair partes do número do processo
    const partes = NUMERO_PROCESSO.split('.');
    const primeiraParte = partes[0]; // 0727108-89.2024
    const ultimaParte = partes[2];   // 0001
    
    console.log(`Preenchendo: Primeira parte=${primeiraParte}, Última parte=${ultimaParte}`);
    
    // Limpar e preencher os campos
    await page.fill('#numeroDigitoAnoUnificado', '');
    await page.fill('#numeroDigitoAnoUnificado', primeiraParte);
    
    await page.fill('#foroNumeroUnificado', '');
    await page.fill('#foroNumeroUnificado', ultimaParte);
    
    // Verificar valor do campo do meio
    const campoMeio = await page.$eval('#local', el => el.value);
    console.log(`Campo do meio (já preenchido): ${campoMeio}`);
    
    // Tirar screenshot antes de consultar
    await page.screenshot({ path: 'antes-consulta.png' });
    console.log('Screenshot salvo em antes-consulta.png');
    
    // 4. CONSULTAR
    console.log('4. Clicando no botão de consulta...');
    await page.click('#botaoConsultarProcessos');
    
    // Aguardar carregamento da página de resultados
    try {
      await page.waitForSelector('#containerDadosPrincipaisProcesso', { timeout: 30000 });
      console.log('Página de detalhes do processo carregada com sucesso');
      
      // Tirar screenshot da página de resultados
      await page.screenshot({ path: 'resultado-consulta.png', fullPage: true });
      console.log('Screenshot salvo em resultado-consulta.png');
      
      // 5. EXTRAIR MOVIMENTAÇÕES
      console.log('5. Extraindo movimentações...');
      
      // Verificar se há botão para expandir todas as movimentações
      const botaoExpandir = await page.$('#todasMovimentacoes');
      if (botaoExpandir) {
        console.log('Clicando no botão para expandir todas as movimentações');
        await botaoExpandir.click();
        await page.waitForTimeout(3000);
      }
      
      // Contar movimentações usando o seletor tr.containerMovimentacao
      const contagem = await page.evaluate(() => {
        const movs = document.querySelectorAll('tr.containerMovimentacao');
        return movs.length;
      });
      
      console.log(`Encontradas ${contagem} movimentações`);
      
    } catch (error) {
      console.log('Erro ao aguardar carregamento da página de detalhes');
      console.log(error.message);
      
      // Tirar screenshot do erro
      await page.screenshot({ path: 'erro-consulta.png', fullPage: true });
      console.log('Screenshot do erro salvo em erro-consulta.png');
    }
    
    // Aguardar para visualização manual
    console.log('\nAguardando 3 minutos para visualização manual...');
    console.log('Pressione Ctrl+C para encerrar o script antes do tempo');
    await page.waitForTimeout(180000); // 3 minutos
    
  } catch (error) {
    console.error('Erro durante a execução:', error);
  } finally {
    console.log('Encerrando navegador...');
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Executar consulta
consultarProcesso()
  .then(() => console.log('Script finalizado'))
  .catch(error => console.error('Erro fatal:', error));
