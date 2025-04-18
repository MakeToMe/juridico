/**
 * Script ajustado para clicar especificamente em Pernambuco
 * Ajustando as coordenadas para ficar entre Ceará e Minas Gerais
 */

const { chromium } = require('playwright');

async function clicarEmPernambuco() {
  console.log('Iniciando script ajustado para clicar em Pernambuco...');
  
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
    await page.screenshot({ path: 'pe-ajustado-antes.png' });
    
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
      // Sabendo que clicamos muito abaixo (MG), vamos ajustar para clicar mais acima
      
      // Centro do mapa
      const centroX = mapInfo.x + (mapInfo.width / 2);
      const centroY = mapInfo.y + (mapInfo.height / 2);
      
      // Pernambuco está no nordeste, entre CE e MG
      // Vamos ajustar para clicar mais à direita e um pouco acima do centro
      const pernambucoX = centroX + (mapInfo.width * 0.32); // 32% à direita do centro
      const pernambucoY = centroY - (mapInfo.height * 0.2); // 20% acima do centro
      
      console.log(`Clicando nas coordenadas para Pernambuco: x=${pernambucoX}, y=${pernambucoY}`);
      
      // Clicar em Pernambuco
      await page.mouse.click(pernambucoX, pernambucoY);
    }
    
    // Aguardar para ver se a página atualiza
    console.log('Aguardando atualização da página...');
    await page.waitForTimeout(3000);
    
    // Tirar screenshot após clicar
    await page.screenshot({ path: 'pe-ajustado-depois.png' });
    
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
      
      // Verificar se há elementos que indiquem que estamos em Minas Gerais
      const minasGerais = elementos.some(el => 
        el.textContent && (
          el.textContent.includes('TJMG') || 
          el.textContent.includes('Minas Gerais') ||
          el.textContent.includes('TRE-MG')
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
      else if (minasGerais) estadoAtual = 'Minas Gerais';
      else if (bahia) estadoAtual = 'Bahia';
      
      return {
        tribunaisPE,
        sucessoPE: tribunaisPE.length > 0,
        clicouCE: ceara,
        clicouMG: minasGerais,
        clicouBA: bahia,
        estadoAtual
      };
    });
    
    console.log('Verificação:', verificacao);
    
    if (verificacao.sucessoPE) {
      console.log('SUCESSO! Tribunais de Pernambuco encontrados:', verificacao.tribunaisPE);
    } else if (verificacao.clicouCE) {
      console.log('Clicou no Ceará em vez de Pernambuco. Tentando novamente...');
      
      // Se clicou no Ceará, tentar mais abaixo
      const centroX = mapInfo.x + (mapInfo.width / 2);
      const centroY = mapInfo.y + (mapInfo.height / 2);
      
      const x2 = centroX + (mapInfo.width * 0.32);
      const y2 = centroY - (mapInfo.height * 0.1); // Menos acima (mais abaixo)
      
      console.log(`Segunda tentativa. Clicando mais abaixo: x=${x2}, y=${y2}`);
      await page.mouse.click(x2, y2);
    } else if (verificacao.clicouMG) {
      console.log('Clicou em Minas Gerais em vez de Pernambuco. Tentando novamente...');
      
      // Se clicou em MG, tentar mais acima e mais à direita
      const centroX = mapInfo.x + (mapInfo.width / 2);
      const centroY = mapInfo.y + (mapInfo.height / 2);
      
      const x2 = centroX + (mapInfo.width * 0.35); // Mais à direita
      const y2 = centroY - (mapInfo.height * 0.25); // Mais acima
      
      console.log(`Segunda tentativa. Clicando mais acima e à direita: x=${x2}, y=${y2}`);
      await page.mouse.click(x2, y2);
    } else if (verificacao.clicouBA) {
      console.log('Clicou na Bahia em vez de Pernambuco. Tentando novamente...');
      
      // Se clicou na Bahia, tentar mais acima e mais à direita
      const centroX = mapInfo.x + (mapInfo.width / 2);
      const centroY = mapInfo.y + (mapInfo.height / 2);
      
      const x2 = centroX + (mapInfo.width * 0.35); // Mais à direita
      const y2 = centroY - (mapInfo.height * 0.3); // Mais acima
      
      console.log(`Segunda tentativa. Clicando mais acima e à direita: x=${x2}, y=${y2}`);
      await page.mouse.click(x2, y2);
    } else {
      console.log('Não conseguimos identificar em qual estado clicamos. Tentando várias posições...');
      
      // Tentar clicar em várias posições diferentes no nordeste
      const tentativas = [
        { x: 0.35, y: -0.25 }, // Tentativa 1 - Nordeste superior
        { x: 0.33, y: -0.2 },  // Tentativa 2 - Nordeste central
        { x: 0.38, y: -0.22 }  // Tentativa 3 - Mais à direita
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
        await page.screenshot({ path: `pe-ajustado-tentativa-${i+1}.png` });
        
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
    
    // Aguardar para ver se a segunda tentativa funcionou
    await page.waitForTimeout(3000);
    
    // Tirar screenshot final
    await page.screenshot({ path: 'pe-ajustado-final.png' });
    
    // Manter o navegador aberto para visualização
    console.log('Aguardando 30 segundos para visualização...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    await page.screenshot({ path: 'pe-ajustado-erro.png' });
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Executar o script
clicarEmPernambuco().catch(console.error);
