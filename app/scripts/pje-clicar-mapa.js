/**
 * Script para clicar diretamente no mapa do Brasil no PJE Comunicações
 * Evitando completamente interagir com o calendário
 */

const { chromium } = require('playwright');

async function clicarNoMapa() {
  console.log('Iniciando script para clicar no mapa...');
  
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
    
    // Aguardar carregamento completo
    await page.waitForLoadState('networkidle');
    console.log('Página carregada');
    
    // Tirar screenshot inicial
    await page.screenshot({ path: 'mapa-antes.png' });
    
    // IMPORTANTE: Primeiro clicar em algum lugar neutro da página para garantir foco
    // e evitar que o calendário seja ativado
    console.log('Clicando em área neutra para garantir foco...');
    await page.mouse.click(50, 50);
    await page.waitForTimeout(1000);
    
    // Encontrar o SVG do mapa
    console.log('Localizando o mapa...');
    const mapInfo = await page.evaluate(() => {
      const svg = document.querySelector('svg');
      if (!svg) return null;
      
      const rect = svg.getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      };
    });
    
    if (!mapInfo) {
      throw new Error('Mapa não encontrado');
    }
    
    console.log('Mapa encontrado:', mapInfo);
    
    // Calcular coordenadas para a região de Pernambuco
    // Ajustando para clicar mais no centro do estado
    const x = mapInfo.x + (mapInfo.width * 0.75); // 75% da largura (região nordeste)
    const y = mapInfo.y + (mapInfo.height * 0.35); // 35% da altura (região nordeste)
    
    console.log(`Clicando nas coordenadas: x=${x}, y=${y}`);
    await page.mouse.click(x, y);
    
    // Aguardar para ver se a página atualiza
    console.log('Aguardando atualização da página...');
    await page.waitForTimeout(3000);
    
    // Tirar screenshot após clicar
    await page.screenshot({ path: 'mapa-depois.png' });
    
    // Verificar se apareceram os tribunais
    const tribunaisEncontrados = await page.evaluate(() => {
      // Procurar por elementos que contenham textos de tribunais de Pernambuco
      const elementos = Array.from(document.querySelectorAll('*'));
      
      const tribunais = [];
      
      // Procurar por TJPE
      const tjpe = elementos.find(el => 
        el.textContent && el.textContent.includes('TJPE')
      );
      if (tjpe) tribunais.push('TJPE');
      
      // Procurar por TRE-PE
      const trePe = elementos.find(el => 
        el.textContent && el.textContent.includes('TRE-PE')
      );
      if (trePe) tribunais.push('TRE-PE');
      
      // Procurar por TRF5
      const trf5 = elementos.find(el => 
        el.textContent && el.textContent.includes('TRF5') || el.textContent && el.textContent.includes('TRF-5')
      );
      if (trf5) tribunais.push('TRF5');
      
      return {
        tribunaisEncontrados: tribunais,
        sucesso: tribunais.length > 0
      };
    });
    
    console.log('Verificação dos tribunais:', tribunaisEncontrados);
    
    if (tribunaisEncontrados.sucesso) {
      console.log('SUCESSO! Tribunais de Pernambuco encontrados:', tribunaisEncontrados.tribunaisEncontrados);
    } else {
      console.log('Não foram encontrados tribunais de Pernambuco. Tentando novamente...');
      
      // Tentar clicar em uma posição ligeiramente diferente
      const x2 = x - 20;
      const y2 = y - 20;
      
      console.log(`Segunda tentativa. Clicando nas coordenadas: x=${x2}, y=${y2}`);
      await page.mouse.click(x2, y2);
      
      // Aguardar novamente
      await page.waitForTimeout(3000);
      
      // Tirar screenshot da segunda tentativa
      await page.screenshot({ path: 'mapa-segunda-tentativa.png' });
    }
    
    // Manter o navegador aberto para visualização
    console.log('Aguardando 30 segundos para visualização...');
    await page.waitForTimeout(30000);
    
    return {
      sucesso: tribunaisEncontrados.sucesso,
      tribunais: tribunaisEncontrados.tribunaisEncontrados
    };
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    await page.screenshot({ path: 'mapa-erro.png' });
    throw error;
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Executar o script
clicarNoMapa()
  .then(resultado => {
    console.log('Resultado final:', resultado);
  })
  .catch(error => {
    console.error('Erro fatal:', error);
  });
