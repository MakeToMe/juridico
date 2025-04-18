/**
 * Script para clicar especificamente no mapa do Brasil no PJE Comunicações
 * Evitando clicar no menu ou no calendário
 */

const { chromium } = require('playwright');

async function clicarNoMapaBrasil() {
  console.log('Iniciando script para clicar no mapa do Brasil...');
  
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
    await page.screenshot({ path: 'brasil-antes.png' });
    
    // Encontrar o mapa do Brasil (SVG principal no centro da página)
    console.log('Procurando o mapa do Brasil...');
    
    // Usar JavaScript para encontrar o SVG do mapa do Brasil
    const mapInfo = await page.evaluate(() => {
      // Procurar por todos os SVGs na página
      const svgs = Array.from(document.querySelectorAll('svg'));
      
      // Filtrar apenas os SVGs que parecem ser o mapa do Brasil (maior tamanho e no centro)
      const mapasSvg = svgs.filter(svg => {
        const rect = svg.getBoundingClientRect();
        // Verificar se o SVG tem tamanho razoável (maior que 100x100)
        return rect.width > 100 && rect.height > 100;
      });
      
      // Se encontrou algum SVG grande, retornar o primeiro
      if (mapasSvg.length > 0) {
        const mapa = mapasSvg[0];
        const rect = mapa.getBoundingClientRect();
        return {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          encontrado: true
        };
      }
      
      // Se não encontrou SVG grande, procurar por elementos que possam conter o mapa
      const possiveisMapas = Array.from(document.querySelectorAll('*')).filter(el => {
        // Verificar se o elemento tem "mapa" ou "map" no ID ou classe
        const id = el.id || '';
        const className = el.className || '';
        return id.includes('map') || className.includes('map') || 
               id.includes('mapa') || className.includes('mapa');
      });
      
      if (possiveisMapas.length > 0) {
        const mapa = possiveisMapas[0];
        const rect = mapa.getBoundingClientRect();
        return {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          encontrado: true
        };
      }
      
      // Se ainda não encontrou, retornar as coordenadas do centro da página
      return {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        width: 300,
        height: 300,
        encontrado: false
      };
    });
    
    console.log('Informações do mapa:', mapInfo);
    
    if (!mapInfo.encontrado) {
      console.log('Não foi possível encontrar o mapa do Brasil. Usando coordenadas aproximadas.');
    }
    
    // Calcular coordenadas para a região nordeste (Pernambuco)
    // Ajustando para clicar mais no centro-direita do mapa
    const centroX = mapInfo.x + (mapInfo.width / 2);
    const centroY = mapInfo.y + (mapInfo.height / 2);
    
    // Pernambuco fica no nordeste, então vamos clicar na região direita superior do mapa
    const pernambucoX = centroX + (mapInfo.width * 0.25); // 25% à direita do centro
    const pernambucoY = centroY - (mapInfo.height * 0.15); // 15% acima do centro
    
    console.log(`Clicando nas coordenadas para Pernambuco: x=${pernambucoX}, y=${pernambucoY}`);
    
    // Clicar na região de Pernambuco
    await page.mouse.click(pernambucoX, pernambucoY);
    
    // Aguardar para ver se a página atualiza
    console.log('Aguardando atualização da página...');
    await page.waitForTimeout(3000);
    
    // Tirar screenshot após clicar
    await page.screenshot({ path: 'brasil-depois.png' });
    
    // Verificar se apareceram os tribunais de Pernambuco
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
        el.textContent && (el.textContent.includes('TRF5') || el.textContent.includes('TRF-5'))
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
      const x2 = pernambucoX + 20;
      const y2 = pernambucoY + 20;
      
      console.log(`Segunda tentativa. Clicando nas coordenadas: x=${x2}, y=${y2}`);
      await page.mouse.click(x2, y2);
      
      // Aguardar novamente
      await page.waitForTimeout(3000);
      
      // Tirar screenshot da segunda tentativa
      await page.screenshot({ path: 'brasil-segunda-tentativa.png' });
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
    await page.screenshot({ path: 'brasil-erro.png' });
    throw error;
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Executar o script
clicarNoMapaBrasil()
  .then(resultado => {
    console.log('Resultado final:', resultado);
  })
  .catch(error => {
    console.error('Erro fatal:', error);
  });
