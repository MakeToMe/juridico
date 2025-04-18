/**
 * Script mais preciso que ajusta as coordenadas para clicar especificamente em
 * Pernambuco, evitando os estados vizinhos (Ceará, Piauí, Bahia)
 */

const { chromium } = require('playwright');

async function clicarEmPernambucoPreciso() {
  console.log('Iniciando script para clicar em Pernambuco com coordenadas precisas...');
  
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
    await page.screenshot({ path: 'pe-preciso-antes.png' });
    
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
        
        // Verificar se existe um path específico para Pernambuco
        const pathPE = document.querySelector('path#PE');
        let coordenadasPE = null;
        
        if (pathPE) {
          const rectPE = pathPE.getBoundingClientRect();
          coordenadasPE = {
            x: rectPE.left + (rectPE.width / 2),
            y: rectPE.top + (rectPE.height / 2)
          };
        }
        
        return {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          encontrado: true,
          pathPE: coordenadasPE !== null,
          coordenadasPE
        };
      }
      
      // Se não encontrou SVG grande, usar o centro da página
      return {
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 100,
        width: 300,
        height: 300,
        encontrado: false,
        pathPE: false
      };
    });
    
    console.log('Informações do mapa:', mapInfo);
    
    if (!mapInfo.encontrado) {
      console.log('Não foi possível encontrar o mapa do Brasil. Usando coordenadas aproximadas.');
    }
    
    // Se encontrou o path específico de Pernambuco, clicar diretamente nele
    if (mapInfo.pathPE && mapInfo.coordenadasPE) {
      console.log('Path de Pernambuco encontrado! Clicando diretamente nele...');
      await page.mouse.click(mapInfo.coordenadasPE.x, mapInfo.coordenadasPE.y);
    } else {
      // Calcular coordenadas para Pernambuco
      // Sabendo que clicamos no Ceará, vamos ajustar para clicar mais abaixo
      
      // Centro do mapa
      const centroX = mapInfo.x + (mapInfo.width / 2);
      const centroY = mapInfo.y + (mapInfo.height / 2);
      
      // Pernambuco está no nordeste, abaixo do Ceará
      // Vamos ajustar para clicar mais à direita e mais abaixo que o Ceará
      const pernambucoX = centroX + (mapInfo.width * 0.32); // 32% à direita do centro
      const pernambucoY = centroY - (mapInfo.height * 0.1); // 10% acima do centro (menos que antes, para ficar mais abaixo)
      
      console.log(`Clicando nas coordenadas para Pernambuco: x=${pernambucoX}, y=${pernambucoY}`);
      
      // Clicar em Pernambuco
      await page.mouse.click(pernambucoX, pernambucoY);
    }
    
    // Aguardar para ver se a página atualiza
    console.log('Aguardando atualização da página...');
    await page.waitForTimeout(3000);
    
    // Tirar screenshot após clicar
    await page.screenshot({ path: 'pe-preciso-depois.png' });
    
    // Verificar se apareceram os tribunais de Pernambuco ou de outros estados
    const verificacao = await page.evaluate(() => {
      // Procurar por elementos que contenham textos de tribunais
      const elementos = Array.from(document.querySelectorAll('*'));
      
      // Verificar tribunais de Pernambuco
      const tribunaisPE = [];
      
      // Procurar por TJPE
      const tjpe = elementos.find(el => 
        el.textContent && el.textContent.includes('TJPE')
      );
      if (tjpe) tribunaisPE.push('TJPE');
      
      // Procurar por TRE-PE
      const trePe = elementos.find(el => 
        el.textContent && el.textContent.includes('TRE-PE')
      );
      if (trePe) tribunaisPE.push('TRE-PE');
      
      // Procurar por TRF5
      const trf5 = elementos.find(el => 
        el.textContent && (el.textContent.includes('TRF5') || el.textContent.includes('TRF-5'))
      );
      if (trf5) tribunaisPE.push('TRF5');
      
      // Verificar se há elementos que indiquem que estamos no Ceará
      const ceara = elementos.some(el => 
        el.textContent && (
          el.textContent.includes('TJCE') || 
          el.textContent.includes('Ceará') ||
          el.textContent.includes('TRE-CE')
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
      
      // Verificar se há elementos que indiquem que estamos na Bahia
      const bahia = elementos.some(el => 
        el.textContent && (
          el.textContent.includes('TJBA') || 
          el.textContent.includes('Bahia') ||
          el.textContent.includes('TRE-BA')
        )
      );
      
      // Determinar em qual estado clicamos
      let estadoAtual = 'Desconhecido';
      if (tribunaisPE.length > 0) estadoAtual = 'Pernambuco';
      else if (ceara) estadoAtual = 'Ceará';
      else if (piaui) estadoAtual = 'Piauí';
      else if (bahia) estadoAtual = 'Bahia';
      
      return {
        tribunaisPE,
        sucessoPE: tribunaisPE.length > 0,
        clicouCE: ceara,
        clicouPI: piaui,
        clicouBA: bahia,
        estadoAtual
      };
    });
    
    console.log('Verificação:', verificacao);
    
    if (verificacao.sucessoPE) {
      console.log('SUCESSO! Tribunais de Pernambuco encontrados:', verificacao.tribunaisPE);
    } else if (verificacao.clicouCE) {
      console.log('Clicou no Ceará em vez de Pernambuco. Tentando novamente...');
      
      // Se clicou no Ceará, tentar mais à direita e mais abaixo
      const centroX = mapInfo.x + (mapInfo.width / 2);
      const centroY = mapInfo.y + (mapInfo.height / 2);
      
      const x2 = centroX + (mapInfo.width * 0.32);
      const y2 = centroY; // No centro vertical (mais abaixo que o Ceará)
      
      console.log(`Segunda tentativa. Clicando mais abaixo: x=${x2}, y=${y2}`);
      await page.mouse.click(x2, y2);
      
      // Aguardar novamente
      await page.waitForTimeout(3000);
      
      // Tirar screenshot da segunda tentativa
      await page.screenshot({ path: 'pe-preciso-segunda-tentativa.png' });
    } else if (verificacao.clicouPI) {
      console.log('Clicou no Piauí em vez de Pernambuco. Tentando novamente...');
      
      // Se clicou no Piauí, tentar mais à direita
      const centroX = mapInfo.x + (mapInfo.width / 2);
      const centroY = mapInfo.y + (mapInfo.height / 2);
      
      const x2 = centroX + (mapInfo.width * 0.35);
      const y2 = centroY - (mapInfo.height * 0.15);
      
      console.log(`Segunda tentativa. Clicando mais à direita: x=${x2}, y=${y2}`);
      await page.mouse.click(x2, y2);
      
      // Aguardar novamente
      await page.waitForTimeout(3000);
      
      // Tirar screenshot da segunda tentativa
      await page.screenshot({ path: 'pe-preciso-segunda-tentativa.png' });
    } else if (verificacao.clicouBA) {
      console.log('Clicou na Bahia em vez de Pernambuco. Tentando novamente...');
      
      // Se clicou na Bahia, tentar mais acima
      const centroX = mapInfo.x + (mapInfo.width / 2);
      const centroY = mapInfo.y + (mapInfo.height / 2);
      
      const x2 = centroX + (mapInfo.width * 0.32);
      const y2 = centroY - (mapInfo.height * 0.2);
      
      console.log(`Segunda tentativa. Clicando mais acima: x=${x2}, y=${y2}`);
      await page.mouse.click(x2, y2);
      
      // Aguardar novamente
      await page.waitForTimeout(3000);
      
      // Tirar screenshot da segunda tentativa
      await page.screenshot({ path: 'pe-preciso-segunda-tentativa.png' });
    } else {
      console.log('Não conseguimos identificar em qual estado clicamos. Tentando novamente em outra posição...');
      
      // Tentar clicar em várias posições diferentes no nordeste
      const tentativas = [
        { x: 0.32, y: -0.15 }, // Tentativa 1
        { x: 0.34, y: -0.18 }, // Tentativa 2
        { x: 0.30, y: -0.12 }  // Tentativa 3
      ];
      
      const centroX = mapInfo.x + (mapInfo.width / 2);
      const centroY = mapInfo.y + (mapInfo.height / 2);
      
      for (let i = 0; i < tentativas.length; i++) {
        const t = tentativas[i];
        const x = centroX + (mapInfo.width * t.x);
        const y = centroY + (mapInfo.height * t.y);
        
        console.log(`Tentativa ${i+1}. Clicando em: x=${x}, y=${y}`);
        await page.mouse.click(x, y);
        
        // Aguardar um pouco
        await page.waitForTimeout(3000);
        
        // Tirar screenshot
        await page.screenshot({ path: `pe-preciso-tentativa-${i+1}.png` });
        
        // Verificar se acertamos Pernambuco
        const verificacaoTentativa = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('*')).some(el => 
            el.textContent && (
              el.textContent.includes('TJPE') || 
              el.textContent.includes('TRE-PE')
            )
          );
        });
        
        if (verificacaoTentativa) {
          console.log(`Sucesso na tentativa ${i+1}! Encontramos Pernambuco.`);
          break;
        }
      }
    }
    
    // Manter o navegador aberto para visualização
    console.log('Aguardando 30 segundos para visualização...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    await page.screenshot({ path: 'pe-preciso-erro.png' });
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Executar o script
clicarEmPernambucoPreciso().catch(console.error);
