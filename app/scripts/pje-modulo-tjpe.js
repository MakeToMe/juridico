/**
 * Módulo para clicar no tribunal TJPE no PJE Comunicações
 * Usando o seletor específico fornecido
 */

const { chromium } = require('playwright');

/**
 * Função para clicar no tribunal TJPE após selecionar Pernambuco
 * @param {import('playwright').Page} page - Instância da página do Playwright
 * @returns {Promise<boolean>} - True se conseguiu clicar no TJPE, false caso contrário
 */
async function clicarNoTJPE(page) {
  try {
    console.log('Clicando no tribunal TJPE...');
    
    // Aguardar um pouco para garantir que a página carregou os tribunais
    await page.waitForTimeout(2000);
    
    // Usar o seletor específico para o TJPE
    const seletorTJPE = 'body > app-root > uikit-layout > mat-sidenav-container > mat-sidenav-content > div.iframe-orientation.ng-star-inserted > app-pcp > form > div > div > app-mapa > div:nth-child(3) > div > div.parca > div > div > div > div:nth-child(1) > button > div';
    
    // Verificar se o seletor existe
    const seletorExiste = await page.evaluate((sel) => {
      return document.querySelector(sel) !== null;
    }, seletorTJPE);
    
    if (seletorExiste) {
      // Clicar no seletor específico do TJPE
      await page.click(seletorTJPE);
      console.log('Clique realizado no seletor específico do TJPE');
      
      // Aguardar um pouco para a página atualizar
      await page.waitForTimeout(2000);
      
      // Verificar se o formulário de consulta apareceu
      const formularioApareceu = await verificarFormularioConsulta(page);
      
      if (formularioApareceu) {
        console.log('Sucesso! Formulário de consulta encontrado');
        return true;
      } else {
        console.log('Erro: Não encontramos o formulário de consulta após clicar no TJPE');
        
        // Tentar um seletor alternativo
        console.log('Tentando seletor alternativo...');
        
        // Procurar por um botão ou link que contenha "TJPE"
        const tjpeEncontrado = await page.evaluate(() => {
          const elementos = Array.from(document.querySelectorAll('button, a, div'));
          const tjpe = elementos.find(el => 
            el.textContent && el.textContent.includes('TJPE')
          );
          
          if (tjpe) {
            tjpe.click();
            return true;
          }
          
          return false;
        });
        
        if (tjpeEncontrado) {
          console.log('Clicou em elemento alternativo com texto TJPE');
          
          // Aguardar um pouco para a página atualizar
          await page.waitForTimeout(2000);
          
          // Verificar novamente se o formulário apareceu
          const formularioApareceuTentativa2 = await verificarFormularioConsulta(page);
          
          if (formularioApareceuTentativa2) {
            console.log('Sucesso na segunda tentativa! Formulário de consulta encontrado');
            return true;
          }
        }
        
        return false;
      }
    } else {
      console.log('Erro: Seletor do TJPE não encontrado');
      
      // Tentar encontrar o TJPE pelo texto
      console.log('Tentando encontrar TJPE pelo texto...');
      
      const tjpeEncontrado = await page.evaluate(() => {
        const elementos = Array.from(document.querySelectorAll('*'));
        const tjpe = elementos.find(el => 
          el.textContent && (
            el.textContent.includes('TJPE') || 
            el.textContent.includes('Tribunal de Justiça do Estado de Pernambuco')
          )
        );
        
        if (tjpe) {
          tjpe.click();
          return true;
        }
        
        return false;
      });
      
      if (tjpeEncontrado) {
        console.log('Clicou em elemento com texto TJPE');
        
        // Aguardar um pouco para a página atualizar
        await page.waitForTimeout(2000);
        
        // Verificar se o formulário de consulta apareceu
        const formularioApareceu = await verificarFormularioConsulta(page);
        
        if (formularioApareceu) {
          console.log('Sucesso! Formulário de consulta encontrado');
          return true;
        }
      }
      
      return false;
    }
  } catch (error) {
    console.error(`Erro ao clicar no TJPE: ${error.message}`);
    return false;
  }
}

/**
 * Função para verificar se o formulário de consulta foi carregado
 * @param {import('playwright').Page} page - Instância da página do Playwright
 * @returns {Promise<boolean>} - True se encontrou o formulário, false caso contrário
 */
async function verificarFormularioConsulta(page) {
  try {
    // Verificar se o formulário de consulta apareceu
    const formularioApareceu = await page.evaluate(() => {
      // Procurar por elementos que indiquem que estamos no formulário de consulta
      const elementos = Array.from(document.querySelectorAll('*'));
      
      // Procurar por campos de data
      const campoData = elementos.some(el => 
        el.placeholder && (
          el.placeholder.includes('data') || 
          el.placeholder.includes('Data')
        )
      );
      
      // Procurar por campo de OAB
      const campoOAB = elementos.some(el => 
        el.placeholder && el.placeholder.includes('OAB')
      );
      
      // Procurar por botão de consulta
      const botaoConsulta = elementos.some(el => 
        el.textContent && (
          el.textContent.includes('Consultar') || 
          el.textContent.includes('Pesquisar')
        )
      );
      
      return campoData || campoOAB || botaoConsulta;
    });
    
    return formularioApareceu;
  } catch (error) {
    console.error(`Erro ao verificar formulário: ${error.message}`);
    return false;
  }
}

// Função para teste independente do módulo
async function testarModulo() {
  console.log('Testando módulo de clique no TJPE...');
  
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
    
    // Aguardar carregamento completo da página
    await page.waitForLoadState('networkidle');
    
    // Primeiro clicar em Pernambuco
    console.log('Primeiro clicando em Pernambuco...');
    
    // Usar o seletor específico que funciona para Pernambuco
    const seletorPE = '#map > g > a:nth-child(4) > path:nth-child(4)';
    
    // Verificar se o seletor existe
    const seletorPEExiste = await page.evaluate((sel) => {
      return document.querySelector(sel) !== null;
    }, seletorPE);
    
    if (seletorPEExiste) {
      // Clicar no seletor específico de Pernambuco
      await page.click(seletorPE);
      console.log('Clique realizado em Pernambuco');
      
      // Aguardar um pouco para a página atualizar
      await page.waitForTimeout(2000);
      
      // Tirar screenshot após clicar em Pernambuco
      await page.screenshot({ path: 'modulo-tjpe-pe.png' });
      
      // Clicar no TJPE
      const sucessoTJPE = await clicarNoTJPE(page);
      
      // Tirar screenshot após clicar no TJPE
      await page.screenshot({ path: 'modulo-tjpe-depois.png' });
      
      if (sucessoTJPE) {
        console.log('Módulo funcionou corretamente!');
      } else {
        console.log('Módulo falhou ao clicar no TJPE');
      }
    } else {
      console.log('Erro: Seletor de Pernambuco não encontrado');
    }
    
    // Manter o navegador aberto para visualização
    console.log('Aguardando 30 segundos para visualização...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Erro no teste: ${error.message}`);
    await page.screenshot({ path: 'modulo-tjpe-erro.png' });
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Exportar as funções para uso em outros módulos
module.exports = {
  clicarNoTJPE,
  verificarFormularioConsulta
};

// Se este arquivo for executado diretamente, rodar o teste
if (require.main === module) {
  testarModulo().catch(console.error);
}
