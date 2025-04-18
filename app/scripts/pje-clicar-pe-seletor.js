/**
 * Script para clicar em Pernambuco usando o seletor específico
 * #map > g > a:nth-child(4) > path:nth-child(4)
 */

const { chromium } = require('playwright');

async function clicarPernambuco() {
  console.log('Iniciando script para clicar em Pernambuco usando seletor específico...');
  
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
    await page.screenshot({ path: 'pe-seletor-antes.png' });
    
    // Verificar se o seletor existe
    console.log('Verificando se o seletor existe...');
    const seletorExiste = await page.evaluate(() => {
      return document.querySelector('#map > g > a:nth-child(4) > path:nth-child(4)') !== null;
    });
    
    if (seletorExiste) {
      console.log('Seletor encontrado! Clicando em Pernambuco...');
      
      // Clicar no seletor específico de Pernambuco
      await page.click('#map > g > a:nth-child(4) > path:nth-child(4)');
      
      console.log('Clique realizado no seletor específico');
    } else {
      console.log('Seletor não encontrado. Buscando alternativas...');
      
      // Verificar outros seletores possíveis
      const seletoresAlternativos = [
        '#map path[id="PE"]',
        'path[id="PE"]',
        'svg path[id="PE"]',
        '#map > g > a[href*="PE"]',
        'a[href*="PE"] > path'
      ];
      
      let encontrou = false;
      
      for (const seletor of seletoresAlternativos) {
        const existe = await page.evaluate((sel) => {
          return document.querySelector(sel) !== null;
        }, seletor);
        
        if (existe) {
          console.log(`Seletor alternativo encontrado: ${seletor}`);
          await page.click(seletor);
          encontrou = true;
          break;
        }
      }
      
      if (!encontrou) {
        console.log('Nenhum seletor alternativo encontrado. Analisando a estrutura do mapa...');
        
        // Analisar a estrutura do mapa para encontrar Pernambuco
        const estruturaMapa = await page.evaluate(() => {
          // Encontrar o mapa
          const mapa = document.querySelector('#map') || document.querySelector('svg');
          
          if (!mapa) return { encontrado: false };
          
          // Listar todos os paths dentro do mapa
          const paths = Array.from(mapa.querySelectorAll('path'));
          
          // Informações sobre os paths
          const infoPaths = paths.map((path, index) => {
            return {
              index,
              id: path.id || '',
              classes: path.className?.baseVal || '',
              parentTagName: path.parentElement?.tagName || '',
              parentClasses: path.parentElement?.className?.baseVal || '',
              seletor: `${path.parentElement?.tagName?.toLowerCase() || ''} > path:nth-child(${index + 1})`,
              href: path.parentElement?.getAttribute('href') || ''
            };
          });
          
          // Encontrar possíveis paths de Pernambuco
          const possiveisPE = infoPaths.filter(p => 
            p.id === 'PE' || 
            p.href.includes('PE') || 
            p.classes.includes('PE')
          );
          
          return {
            encontrado: possiveisPE.length > 0,
            possiveisPE,
            todosOsPaths: infoPaths
          };
        });
        
        console.log('Estrutura do mapa:', JSON.stringify(estruturaMapa, null, 2));
        
        if (estruturaMapa.encontrado) {
          const primeiroPE = estruturaMapa.possiveisPE[0];
          console.log(`Path de Pernambuco encontrado! Índice: ${primeiroPE.index}`);
          
          // Construir um seletor baseado nas informações encontradas
          let seletorPE;
          
          if (primeiroPE.id) {
            seletorPE = `path#${primeiroPE.id}`;
          } else if (primeiroPE.href) {
            seletorPE = `a[href*="${primeiroPE.href}"] > path`;
          } else {
            seletorPE = `#map ${primeiroPE.seletor}`;
          }
          
          console.log(`Usando seletor construído: ${seletorPE}`);
          await page.click(seletorPE);
        } else {
          console.log('Não foi possível encontrar Pernambuco. Tentando clicar no nordeste...');
          
          // Encontrar o mapa e clicar na região nordeste
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
          
          if (mapInfo) {
            // Clicar na região nordeste (ajustado para Pernambuco)
            const x = mapInfo.x + (mapInfo.width * 0.75);
            const y = mapInfo.y + (mapInfo.height * 0.35);
            
            console.log(`Clicando nas coordenadas do nordeste: x=${x}, y=${y}`);
            await page.mouse.click(x, y);
          }
        }
      }
    }
    
    // Aguardar para ver se a página atualiza
    console.log('Aguardando atualização da página...');
    await page.waitForTimeout(3000);
    
    // Tirar screenshot após clicar
    await page.screenshot({ path: 'pe-seletor-depois.png' });
    
    // Verificar se apareceram os tribunais de Pernambuco
    const verificacao = await page.evaluate(() => {
      // Procurar por elementos que contenham textos de tribunais de Pernambuco
      const elementos = Array.from(document.querySelectorAll('*'));
      
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
      
      // Verificar outros estados
      const outrosEstados = {
        CE: elementos.some(el => el.textContent && (el.textContent.includes('TJCE') || el.textContent.includes('Ceará'))),
        PI: elementos.some(el => el.textContent && (el.textContent.includes('TJPI') || el.textContent.includes('Piauí'))),
        BA: elementos.some(el => el.textContent && (el.textContent.includes('TJBA') || el.textContent.includes('Bahia'))),
        MG: elementos.some(el => el.textContent && (el.textContent.includes('TJMG') || el.textContent.includes('Minas Gerais')))
      };
      
      // Determinar qual estado foi clicado
      let estadoClicado = 'Desconhecido';
      if (tribunaisPE.length > 0) estadoClicado = 'Pernambuco';
      else if (outrosEstados.CE) estadoClicado = 'Ceará';
      else if (outrosEstados.PI) estadoClicado = 'Piauí';
      else if (outrosEstados.BA) estadoClicado = 'Bahia';
      else if (outrosEstados.MG) estadoClicado = 'Minas Gerais';
      
      return {
        tribunaisPE,
        sucessoPE: tribunaisPE.length > 0,
        estadoClicado,
        outrosEstados
      };
    });
    
    console.log('Verificação:', verificacao);
    
    if (verificacao.sucessoPE) {
      console.log('SUCESSO! Tribunais de Pernambuco encontrados:', verificacao.tribunaisPE);
    } else {
      console.log(`Clicou em ${verificacao.estadoClicado} em vez de Pernambuco.`);
    }
    
    // Manter o navegador aberto para visualização
    console.log('Aguardando 30 segundos para visualização...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    await page.screenshot({ path: 'pe-seletor-erro.png' });
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Executar o script
clicarPernambuco().catch(console.error);
