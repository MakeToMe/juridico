/**
 * Script para clicar especificamente em Pernambuco no mapa do Brasil
 * Ajustando as coordenadas para evitar clicar em estados vizinhos (BA, PI)
 */

const { chromium } = require('playwright');

async function clicarEmPernambuco() {
  console.log('Iniciando script para clicar em Pernambuco...');
  
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
    await page.screenshot({ path: 'pernambuco-antes.png' });
    
    // Encontrar o mapa do Brasil
    console.log('Procurando o mapa do Brasil...');
    
    // Usar JavaScript para encontrar o SVG do mapa do Brasil
    const mapInfo = await page.evaluate(() => {
      // Procurar por todos os SVGs na página
      const svgs = Array.from(document.querySelectorAll('svg'));
      
      // Filtrar apenas os SVGs que parecem ser o mapa do Brasil (maior tamanho)
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
      
      // Se não encontrou SVG grande, usar o centro da página
      return {
        x: window.innerWidth / 2 - 150, // Ajustado para a esquerda do centro
        y: window.innerHeight / 2 - 100, // Ajustado para cima do centro
        width: 300,
        height: 300,
        encontrado: false
      };
    });
    
    console.log('Informações do mapa:', mapInfo);
    
    if (!mapInfo.encontrado) {
      console.log('Não foi possível encontrar o mapa do Brasil. Usando coordenadas aproximadas.');
    }
    
    // Calcular coordenadas para Pernambuco
    // Ajustando para evitar clicar em BA ou PI
    // Pernambuco está mais à direita e um pouco mais acima que a Bahia
    
    // Centro do mapa
    const centroX = mapInfo.x + (mapInfo.width / 2);
    const centroY = mapInfo.y + (mapInfo.height / 2);
    
    // Pernambuco está no nordeste, um pouco mais à direita e acima que a Bahia
    // Vamos ajustar para clicar mais à direita e um pouco mais acima
    const pernambucoX = centroX + (mapInfo.width * 0.3); // 30% à direita do centro
    const pernambucoY = centroY - (mapInfo.height * 0.25); // 25% acima do centro
    
    console.log(`Clicando nas coordenadas para Pernambuco: x=${pernambucoX}, y=${pernambucoY}`);
    
    // Clicar em Pernambuco
    await page.mouse.click(pernambucoX, pernambucoY);
    
    // Aguardar para ver se a página atualiza
    console.log('Aguardando atualização da página...');
    await page.waitForTimeout(3000);
    
    // Tirar screenshot após clicar
    await page.screenshot({ path: 'pernambuco-depois.png' });
    
    // Verificar se apareceram os tribunais de Pernambuco
    const verificacao = await page.evaluate(() => {
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
      
      // Verificar se há elementos que indiquem que estamos na Bahia
      const bahia = elementos.some(el => 
        el.textContent && (
          el.textContent.includes('TJBA') || 
          el.textContent.includes('Bahia') ||
          el.textContent.includes('TRE-BA')
        )
      );
      
      // Verificar se há elementos que indiquem que estamos no Piauí
      const piaui = elementos.some(el => 
        el.textContent && (
          el.textContent.includes('TJPI') || 
          el.textContent.includes('Piauí') ||
          el.textContent.includes('TRE-PI')
        )
      );
      
      return {
        tribunaisPE: tribunais,
        sucessoPE: tribunais.length > 0,
        clicouBA: bahia,
        clicouPI: piaui,
        estadoAtual: bahia ? 'Bahia' : (piaui ? 'Piauí' : (tribunais.length > 0 ? 'Pernambuco' : 'Desconhecido'))
      };
    });
    
    console.log('Verificação:', verificacao);
    
    if (verificacao.sucessoPE) {
      console.log('SUCESSO! Tribunais de Pernambuco encontrados:', verificacao.tribunaisPE);
    } else if (verificacao.clicouBA) {
      console.log('Clicou na Bahia em vez de Pernambuco. Tentando novamente...');
      
      // Se clicou na Bahia, tentar mais à direita e mais acima
      const x2 = pernambucoX + 20;
      const y2 = pernambucoY - 20;
      
      console.log(`Segunda tentativa. Clicando mais à direita e acima: x=${x2}, y=${y2}`);
      await page.mouse.click(x2, y2);
      
      // Aguardar novamente
      await page.waitForTimeout(3000);
      
      // Tirar screenshot da segunda tentativa
      await page.screenshot({ path: 'pernambuco-segunda-tentativa.png' });
    } else if (verificacao.clicouPI) {
      console.log('Clicou no Piauí em vez de Pernambuco. Tentando novamente...');
      
      // Se clicou no Piauí, tentar mais à direita e mais abaixo
      const x2 = pernambucoX + 20;
      const y2 = pernambucoY + 10;
      
      console.log(`Segunda tentativa. Clicando mais à direita e abaixo: x=${x2}, y=${y2}`);
      await page.mouse.click(x2, y2);
      
      // Aguardar novamente
      await page.waitForTimeout(3000);
      
      // Tirar screenshot da segunda tentativa
      await page.screenshot({ path: 'pernambuco-segunda-tentativa.png' });
    } else {
      console.log('Não conseguimos identificar em qual estado clicamos. Tentando novamente em outra posição...');
      
      // Tentar clicar em uma posição diferente
      const x2 = centroX + (mapInfo.width * 0.35); // Mais à direita
      const y2 = centroY - (mapInfo.height * 0.2); // Um pouco acima
      
      console.log(`Segunda tentativa com novas coordenadas: x=${x2}, y=${y2}`);
      await page.mouse.click(x2, y2);
      
      // Aguardar novamente
      await page.waitForTimeout(3000);
      
      // Tirar screenshot da segunda tentativa
      await page.screenshot({ path: 'pernambuco-segunda-tentativa.png' });
    }
    
    // Manter o navegador aberto para visualização
    console.log('Aguardando 30 segundos para visualização...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    await page.screenshot({ path: 'pernambuco-erro.png' });
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Executar o script
clicarEmPernambuco().catch(console.error);
