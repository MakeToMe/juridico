/**
 * Módulo para clicar no estado de Pernambuco no mapa do PJE Comunicações
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Configurações
const config = {
  url: 'https://comunica.pje.jus.br/',
  estado: 'Pernambuco',
  tempoEspera: 5000
};

async function clicarNoEstado() {
  console.log('Iniciando módulo para clicar no estado...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--window-size=1366,768']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 1. Acessar o site
    console.log(`Acessando ${config.url}...`);
    await page.goto(config.url);
    await page.waitForLoadState('networkidle');
    
    // Tirar screenshot para debug
    await page.screenshot({ path: 'modulo1-inicial.png' });
    console.log('Screenshot salvo: modulo1-inicial.png');
    
    // 2. Verificar se o calendário está visível e fechá-lo se estiver
    const calendarioVisivel = await page.evaluate(() => {
      const calendarioElements = document.querySelectorAll('.v-date-picker-table');
      return calendarioElements.length > 0;
    });
    
    if (calendarioVisivel) {
      console.log('Calendário detectado! Tentando fechar...');
      // Clicar fora do calendário para fechá-lo
      await page.mouse.click(10, 10);
      await page.waitForTimeout(1000);
    }
    
    // 3. Clicar em Pernambuco no mapa
    console.log(`Clicando no estado: ${config.estado}`);
    
    // Encontrar o SVG do mapa
    const mapaBounds = await page.evaluate(() => {
      // Procurar pelo mapa do Brasil
      const mapaSVG = document.querySelector('svg');
      if (!mapaSVG) return null;
      
      const rect = mapaSVG.getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      };
    });
    
    if (!mapaBounds) {
      console.log('Mapa não encontrado!');
      throw new Error('Mapa não encontrado');
    }
    
    // Calcular coordenadas para Pernambuco (região nordeste)
    const pernambucoPosX = mapaBounds.x + (mapaBounds.width * 0.8); // 80% da largura (lado direito)
    const pernambucoPosY = mapaBounds.y + (mapaBounds.height * 0.3); // 30% da altura (região nordeste)
    
    console.log(`Clicando nas coordenadas do mapa: x=${pernambucoPosX}, y=${pernambucoPosY}`);
    await page.mouse.click(pernambucoPosX, pernambucoPosY);
    
    // Aguardar carregamento após clicar no estado
    console.log(`Aguardando ${config.tempoEspera/1000} segundos após clicar no estado...`);
    await page.waitForTimeout(config.tempoEspera);
    
    // Tirar screenshot após clicar no estado
    await page.screenshot({ path: 'modulo1-apos-clicar-estado.png' });
    console.log('Screenshot salvo: modulo1-apos-clicar-estado.png');
    
    // 4. Verificar se estamos na página de tribunais de Pernambuco
    const estamosNaPaginaDeTribunais = await page.evaluate((estado) => {
      // Verificar se há elementos que indiquem que estamos na página de tribunais
      const elementos = Array.from(document.querySelectorAll('*'));
      
      // Verificar se há algum elemento com o texto do estado
      const temEstado = elementos.some(el => 
        el.textContent && el.textContent.includes(estado)
      );
      
      // Verificar se há algum elemento com texto de tribunal
      const temTribunal = elementos.some(el => 
        el.textContent && (
          el.textContent.includes('TJPE') || 
          el.textContent.includes('Tribunal') ||
          el.textContent.includes('TRE') ||
          el.textContent.includes('TRT')
        )
      );
      
      return {
        temEstado,
        temTribunal,
        sucesso: temEstado && temTribunal
      };
    }, config.estado);
    
    console.log('Verificação da página de tribunais:');
    console.log(estamosNaPaginaDeTribunais);
    
    if (estamosNaPaginaDeTribunais.sucesso) {
      console.log('SUCESSO: Estamos na página de tribunais de Pernambuco!');
    } else {
      console.log('ATENÇÃO: Não foi possível confirmar que estamos na página de tribunais.');
      
      // Tentar clicar novamente em uma posição ligeiramente diferente
      const novaPosX = pernambucoPosX - 20;
      const novaPosY = pernambucoPosY - 20;
      
      console.log(`Tentando novamente com coordenadas: x=${novaPosX}, y=${novaPosY}`);
      await page.mouse.click(novaPosX, novaPosY);
      
      // Aguardar carregamento
      await page.waitForTimeout(config.tempoEspera);
      await page.screenshot({ path: 'modulo1-segunda-tentativa.png' });
      console.log('Screenshot salvo: modulo1-segunda-tentativa.png');
      
      // Verificar novamente
      const segundaVerificacao = await page.evaluate((estado) => {
        const elementos = Array.from(document.querySelectorAll('*'));
        
        const temEstado = elementos.some(el => 
          el.textContent && el.textContent.includes(estado)
        );
        
        const temTribunal = elementos.some(el => 
          el.textContent && (
            el.textContent.includes('TJPE') || 
            el.textContent.includes('Tribunal') ||
            el.textContent.includes('TRE') ||
            el.textContent.includes('TRT')
          )
        );
        
        return {
          temEstado,
          temTribunal,
          sucesso: temEstado && temTribunal
        };
      }, config.estado);
      
      console.log('Segunda verificação:');
      console.log(segundaVerificacao);
      
      if (segundaVerificacao.sucesso) {
        console.log('SUCESSO na segunda tentativa: Estamos na página de tribunais de Pernambuco!');
      } else {
        console.log('FALHA: Não conseguimos chegar à página de tribunais de Pernambuco.');
      }
    }
    
    // 5. Manter o navegador aberto para visualização
    console.log('Aguardando 30 segundos para visualização...');
    await page.waitForTimeout(30000);
    
    return {
      sucesso: estamosNaPaginaDeTribunais.sucesso,
      mensagem: estamosNaPaginaDeTribunais.sucesso 
        ? 'Clique no estado realizado com sucesso!' 
        : 'Clique no estado realizado, mas não foi possível confirmar a página de tribunais.'
    };
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    
    // Tirar screenshot em caso de erro
    await page.screenshot({ path: 'modulo1-erro.png' });
    console.log('Screenshot de erro salvo: modulo1-erro.png');
    
    return {
      sucesso: false,
      mensagem: `Erro ao clicar no estado: ${error.message}`
    };
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Executar o módulo
clicarNoEstado()
  .then(resultado => {
    console.log('Resultado do módulo:');
    console.log(resultado);
    process.exit(resultado.sucesso ? 0 : 1);
  })
  .catch(error => {
    console.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  });
