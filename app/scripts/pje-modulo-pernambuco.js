/**
 * Módulo para clicar no estado de Pernambuco no PJE Comunicações
 * Usando o seletor específico que funciona
 */

const { chromium } = require('playwright');

/**
 * Função para clicar no estado de Pernambuco no mapa do Brasil
 * @param {import('playwright').Page} page - Instância da página do Playwright
 * @returns {Promise<boolean>} - True se conseguiu clicar em Pernambuco, false caso contrário
 */
async function clicarEmPernambuco(page) {
  try {
    console.log('Clicando no estado de Pernambuco...');
    
    // Aguardar carregamento completo da página
    await page.waitForLoadState('networkidle');
    
    // Usar o seletor específico que funciona
    const seletor = '#map > g > a:nth-child(4) > path:nth-child(4)';
    
    // Verificar se o seletor existe
    const seletorExiste = await page.evaluate((sel) => {
      return document.querySelector(sel) !== null;
    }, seletor);
    
    if (seletorExiste) {
      // Clicar no seletor específico de Pernambuco
      await page.click(seletor);
      console.log('Clique realizado no seletor específico de Pernambuco');
      
      // Aguardar um pouco para a página atualizar
      await page.waitForTimeout(2000);
      
      // Verificar se apareceram os tribunais de Pernambuco
      const sucessoPE = await verificarTribunaisPernambuco(page);
      
      if (sucessoPE) {
        console.log('Sucesso! Tribunais de Pernambuco encontrados');
        return true;
      } else {
        console.log('Erro: Não encontramos os tribunais de Pernambuco após clicar');
        return false;
      }
    } else {
      console.log('Erro: Seletor de Pernambuco não encontrado');
      return false;
    }
  } catch (error) {
    console.error(`Erro ao clicar em Pernambuco: ${error.message}`);
    return false;
  }
}

/**
 * Função para verificar se os tribunais de Pernambuco foram carregados
 * @param {import('playwright').Page} page - Instância da página do Playwright
 * @returns {Promise<boolean>} - True se encontrou tribunais de Pernambuco, false caso contrário
 */
async function verificarTribunaisPernambuco(page) {
  try {
    // Verificar se apareceram os tribunais de Pernambuco
    const verificacao = await page.evaluate(() => {
      // Procurar por elementos que contenham textos de tribunais de Pernambuco
      const elementos = Array.from(document.querySelectorAll('*'));
      
      // Procurar por TJPE
      const tjpe = elementos.some(el => 
        el.textContent && el.textContent.includes('TJPE')
      );
      
      // Procurar por TRE-PE
      const trePe = elementos.some(el => 
        el.textContent && el.textContent.includes('TRE-PE')
      );
      
      // Procurar por TRF5
      const trf5 = elementos.some(el => 
        el.textContent && (el.textContent.includes('TRF5') || el.textContent.includes('TRF-5'))
      );
      
      return tjpe || trePe || trf5;
    });
    
    return verificacao;
  } catch (error) {
    console.error(`Erro ao verificar tribunais: ${error.message}`);
    return false;
  }
}

// Função para teste independente do módulo
async function testarModulo() {
  console.log('Testando módulo de clique em Pernambuco...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1366,768']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Acessar o site
    console.log('Acessando o site...');
    await page.goto('https://comunica.pje.jus.br/');
    
    // Tirar screenshot inicial
    await page.screenshot({ path: 'modulo-pe-antes.png' });
    
    // Clicar em Pernambuco
    const sucesso = await clicarEmPernambuco(page);
    
    // Tirar screenshot após clicar
    await page.screenshot({ path: 'modulo-pe-depois.png' });
    
    if (sucesso) {
      console.log('Módulo funcionou corretamente!');
    } else {
      console.log('Módulo falhou ao clicar em Pernambuco');
    }
    
    // Manter o navegador aberto para visualização
    console.log('Aguardando 30 segundos para visualização...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Erro no teste: ${error.message}`);
    await page.screenshot({ path: 'modulo-pe-erro.png' });
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Exportar as funções para uso em outros módulos
module.exports = {
  clicarEmPernambuco,
  verificarTribunaisPernambuco
};

// Se este arquivo for executado diretamente, rodar o teste
if (require.main === module) {
  testarModulo().catch(console.error);
}
