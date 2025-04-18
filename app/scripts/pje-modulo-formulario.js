/**
 * Módulo para preencher o formulário de consulta no PJE Comunicações
 * Usando os seletores específicos fornecidos
 */

const { chromium } = require('playwright');

/**
 * Função para preencher o formulário de consulta
 * @param {import('playwright').Page} page - Instância da página do Playwright
 * @param {Object} dados - Dados para preencher o formulário
 * @param {string} dados.dataInicial - Data inicial no formato DD/MM/YYYY
 * @param {string} dados.dataFinal - Data final no formato DD/MM/YYYY
 * @param {string} dados.numeroOAB - Número da OAB
 * @param {string} dados.ufOAB - UF da OAB
 * @returns {Promise<boolean>} - True se conseguiu preencher e enviar o formulário, false caso contrário
 */
async function preencherFormulario(page, dados = {}) {
  try {
    console.log('Preenchendo formulário de consulta...');
    
    // Valores padrão
    const dataInicial = dados.dataInicial || '11/04/2025';
    const dataFinal = dados.dataFinal || '17/04/2025';
    const numeroOAB = dados.numeroOAB || '34067';
    const ufOAB = dados.ufOAB || 'PE';
    
    // Aguardar um pouco para garantir que o formulário está carregado
    await page.waitForTimeout(2000);
    
    // Tirar screenshot antes de preencher
    await page.screenshot({ path: 'formulario-antes.png' });
    
    // Seletores específicos
    const seletores = {
      dataInicial: 'body > app-root > uikit-layout > mat-sidenav-container > mat-sidenav-content > div.iframe-orientation.ng-star-inserted > app-consulta > div > div > div.col-md-3 > div > form > div > div > div.row > div:nth-child(1) > mat-form-field > div > div.mat-form-field-flex.ng-tns-c22-20',
      dataFinal: 'body > app-root > uikit-layout > mat-sidenav-container > mat-sidenav-content > div.iframe-orientation.ng-star-inserted > app-consulta > div > div > div.col-md-3 > div > form > div > div > div.row > div:nth-child(2) > mat-form-field > div > div.mat-form-field-flex.ng-tns-c22-21',
      numeroOAB: 'body > app-root > uikit-layout > mat-sidenav-container > mat-sidenav-content > div.iframe-orientation.ng-star-inserted > app-consulta > div > div > div.col-md-3 > div > form > div > div > div:nth-child(9) > mat-form-field > div > div.mat-form-field-flex.ng-tns-c22-25 > div.mat-form-field-infix.ng-tns-c22-25',
      ufOAB: 'body > app-root > uikit-layout > mat-sidenav-container > mat-sidenav-content > div.iframe-orientation.ng-star-inserted > app-consulta > div > div > div.col-md-3 > div > form > div > div > div:nth-child(10) > mat-form-field > div > div.mat-form-field-flex.ng-tns-c22-26 > div.mat-form-field-infix.ng-tns-c22-26',
      confirmar: 'body > app-root > uikit-layout > mat-sidenav-container > mat-sidenav-content > div.iframe-orientation.ng-star-inserted > app-consulta > div > div > div.col-md-3 > div > form > div > div > p-footer > div:nth-child(3) > button > span'
    };
    
    // Verificar se os seletores existem
    const seletoresExistem = await page.evaluate((sel) => {
      const resultados = {};
      for (const [campo, seletor] of Object.entries(sel)) {
        resultados[campo] = document.querySelector(seletor) !== null;
      }
      return resultados;
    }, seletores);
    
    console.log('Verificação de seletores:', seletoresExistem);
    
    // Se algum seletor não existir, tentar encontrar campos por placeholder ou label
    if (Object.values(seletoresExistem).some(existe => !existe)) {
      console.log('Alguns seletores não foram encontrados. Tentando alternativas...');
      
      // Encontrar campos de input por placeholder ou label
      const camposEncontrados = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        
        const dataInicial = inputs.find(input => 
          input.placeholder && (
            input.placeholder.includes('Data Inicial') || 
            input.placeholder.includes('data inicial')
          )
        );
        
        const dataFinal = inputs.find(input => 
          input.placeholder && (
            input.placeholder.includes('Data Final') || 
            input.placeholder.includes('data final')
          )
        );
        
        const numeroOAB = inputs.find(input => 
          input.placeholder && (
            input.placeholder.includes('OAB') || 
            input.placeholder.includes('Número')
          )
        );
        
        const ufOAB = inputs.find(input => 
          input.placeholder && (
            input.placeholder.includes('UF') || 
            input.placeholder.includes('Estado')
          )
        );
        
        const botoes = Array.from(document.querySelectorAll('button'));
        const confirmar = botoes.find(botao => 
          botao.textContent && (
            botao.textContent.includes('Confirmar') || 
            botao.textContent.includes('Consultar') ||
            botao.textContent.includes('Pesquisar')
          )
        );
        
        return {
          dataInicial: dataInicial ? true : false,
          dataFinal: dataFinal ? true : false,
          numeroOAB: numeroOAB ? true : false,
          ufOAB: ufOAB ? true : false,
          confirmar: confirmar ? true : false
        };
      });
      
      console.log('Campos encontrados por placeholder/label:', camposEncontrados);
      
      // Se não encontrou os campos, não podemos prosseguir
      if (Object.values(camposEncontrados).some(encontrado => !encontrado)) {
        console.log('Não foi possível encontrar todos os campos do formulário');
        return false;
      }
      
      // Preencher usando os campos encontrados por placeholder
      await preencherPorPlaceholder(page, {
        dataInicial,
        dataFinal,
        numeroOAB,
        ufOAB
      });
    } else {
      // Preencher usando os seletores específicos
      
      // Preencher data inicial
      console.log('Preenchendo data inicial:', dataInicial);
      await page.click(seletores.dataInicial);
      await page.keyboard.type(dataInicial);
      
      // Preencher data final
      console.log('Preenchendo data final:', dataFinal);
      await page.click(seletores.dataFinal);
      await page.keyboard.type(dataFinal);
      
      // Preencher número da OAB
      console.log('Preenchendo número da OAB:', numeroOAB);
      await page.click(seletores.numeroOAB);
      await page.keyboard.type(numeroOAB);
      
      // Preencher UF da OAB
      console.log('Preenchendo UF da OAB:', ufOAB);
      await page.click(seletores.ufOAB);
      await page.keyboard.type(ufOAB);
    }
    
    // Tirar screenshot após preencher
    await page.screenshot({ path: 'formulario-preenchido.png' });
    
    // Clicar no botão confirmar
    console.log('Clicando no botão confirmar');
    if (seletoresExistem.confirmar) {
      await page.click(seletores.confirmar);
    } else {
      // Clicar no botão por texto
      await page.evaluate(() => {
        const botoes = Array.from(document.querySelectorAll('button'));
        const confirmar = botoes.find(botao => 
          botao.textContent && (
            botao.textContent.includes('Confirmar') || 
            botao.textContent.includes('Consultar') ||
            botao.textContent.includes('Pesquisar')
          )
        );
        
        if (confirmar) confirmar.click();
      });
    }
    
    // Aguardar um pouco para a página processar a consulta
    await page.waitForTimeout(5000);
    
    // Tirar screenshot após confirmar
    await page.screenshot({ path: 'formulario-enviado.png' });
    
    // Verificar se a consulta foi realizada com sucesso
    const consultaRealizada = await verificarResultadoConsulta(page);
    
    if (consultaRealizada) {
      console.log('Consulta realizada com sucesso!');
      return true;
    } else {
      console.log('Não foi possível verificar se a consulta foi realizada');
      return false;
    }
  } catch (error) {
    console.error(`Erro ao preencher formulário: ${error.message}`);
    return false;
  }
}

/**
 * Função para preencher o formulário usando placeholder ou label
 * @param {import('playwright').Page} page - Instância da página do Playwright
 * @param {Object} dados - Dados para preencher o formulário
 */
async function preencherPorPlaceholder(page, dados) {
  try {
    console.log('Preenchendo formulário por placeholder/label...');
    
    // Preencher data inicial
    await page.evaluate((data) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      
      const dataInicial = inputs.find(input => 
        input.placeholder && (
          input.placeholder.includes('Data Inicial') || 
          input.placeholder.includes('data inicial')
        )
      );
      
      if (dataInicial) {
        dataInicial.value = data;
        dataInicial.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, dados.dataInicial);
    
    // Preencher data final
    await page.evaluate((data) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      
      const dataFinal = inputs.find(input => 
        input.placeholder && (
          input.placeholder.includes('Data Final') || 
          input.placeholder.includes('data final')
        )
      );
      
      if (dataFinal) {
        dataFinal.value = data;
        dataFinal.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, dados.dataFinal);
    
    // Preencher número da OAB
    await page.evaluate((numero) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      
      const numeroOAB = inputs.find(input => 
        input.placeholder && (
          input.placeholder.includes('OAB') || 
          input.placeholder.includes('Número')
        )
      );
      
      if (numeroOAB) {
        numeroOAB.value = numero;
        numeroOAB.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, dados.numeroOAB);
    
    // Preencher UF da OAB
    await page.evaluate((uf) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      
      const ufOAB = inputs.find(input => 
        input.placeholder && (
          input.placeholder.includes('UF') || 
          input.placeholder.includes('Estado')
        )
      );
      
      if (ufOAB) {
        ufOAB.value = uf;
        ufOAB.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, dados.ufOAB);
  } catch (error) {
    console.error(`Erro ao preencher por placeholder: ${error.message}`);
  }
}

/**
 * Função para verificar se a consulta foi realizada com sucesso
 * @param {import('playwright').Page} page - Instância da página do Playwright
 * @returns {Promise<boolean>} - True se a consulta foi realizada com sucesso, false caso contrário
 */
async function verificarResultadoConsulta(page) {
  try {
    // Verificar se apareceram resultados da consulta
    const resultadosEncontrados = await page.evaluate(() => {
      // Procurar por elementos que indiquem resultados
      const elementos = Array.from(document.querySelectorAll('*'));
      
      // Procurar por tabela de resultados
      const tabela = elementos.some(el => 
        el.tagName === 'TABLE' || 
        (el.className && (
          el.className.includes('table') || 
          el.className.includes('resultado')
        ))
      );
      
      // Procurar por mensagem de resultados
      const mensagemResultados = elementos.some(el => 
        el.textContent && (
          el.textContent.includes('resultado') || 
          el.textContent.includes('encontrado') ||
          el.textContent.includes('publicação')
        )
      );
      
      return tabela || mensagemResultados;
    });
    
    return resultadosEncontrados;
  } catch (error) {
    console.error(`Erro ao verificar resultado da consulta: ${error.message}`);
    return false;
  }
}

// Função para teste independente do módulo
async function testarModulo() {
  console.log('Testando módulo de preenchimento do formulário...');
  
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
      
      // Clicar no TJPE
      console.log('Clicando no TJPE...');
      
      // Usar o seletor específico para o TJPE
      const seletorTJPE = 'body > app-root > uikit-layout > mat-sidenav-container > mat-sidenav-content > div.iframe-orientation.ng-star-inserted > app-pcp > form > div > div > app-mapa > div:nth-child(3) > div > div.parca > div > div > div > div:nth-child(1) > button > div';
      
      // Verificar se o seletor existe
      const seletorTJPEExiste = await page.evaluate((sel) => {
        return document.querySelector(sel) !== null;
      }, seletorTJPE);
      
      if (seletorTJPEExiste) {
        // Clicar no seletor específico do TJPE
        await page.click(seletorTJPE);
        console.log('Clique realizado no TJPE');
        
        // Aguardar um pouco para a página atualizar
        await page.waitForTimeout(2000);
        
        // Preencher o formulário
        const sucessoFormulario = await preencherFormulario(page, {
          dataInicial: '11/04/2025',
          dataFinal: '17/04/2025',
          numeroOAB: '34067',
          ufOAB: 'PE'
        });
        
        if (sucessoFormulario) {
          console.log('Módulo funcionou corretamente!');
        } else {
          console.log('Módulo falhou ao preencher o formulário');
        }
      } else {
        console.log('Erro: Seletor do TJPE não encontrado');
      }
    } else {
      console.log('Erro: Seletor de Pernambuco não encontrado');
    }
    
    // Manter o navegador aberto para visualização
    console.log('Aguardando 30 segundos para visualização...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Erro no teste: ${error.message}`);
    await page.screenshot({ path: 'modulo-formulario-erro.png' });
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Exportar as funções para uso em outros módulos
module.exports = {
  preencherFormulario,
  verificarResultadoConsulta
};

// Se este arquivo for executado diretamente, rodar o teste
if (require.main === module) {
  testarModulo().catch(console.error);
}
