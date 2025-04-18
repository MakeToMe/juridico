/**
 * Script simples para clicar no estado de Pernambuco no PJE Comunicações
 * Usando o seletor específico path-shape
 */

const { chromium } = require('playwright');

async function clicarEstado() {
  console.log('Iniciando script para clicar no estado...');
  
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
    await page.waitForLoadState('networkidle');
    
    // Tirar screenshot inicial
    await page.screenshot({ path: 'estado-antes.png' });
    
    // Aguardar um pouco para garantir que a página carregou completamente
    await page.waitForTimeout(2000);
    
    // Tentar clicar no elemento path-shape (seletor que você identificou)
    console.log('Tentando clicar no estado usando o seletor path-shape...');
    
    // Verificar se o elemento existe
    const elementoExiste = await page.evaluate(() => {
      return document.querySelector('path-shape') !== null;
    });
    
    if (elementoExiste) {
      console.log('Elemento path-shape encontrado! Clicando...');
      await page.click('path-shape');
    } else {
      console.log('Elemento path-shape não encontrado. Tentando alternativas...');
      
      // Tentar clicar diretamente no path de Pernambuco
      const pathPEExiste = await page.evaluate(() => {
        return document.querySelector('path#PE') !== null;
      });
      
      if (pathPEExiste) {
        console.log('Elemento path#PE encontrado! Clicando...');
        await page.click('path#PE');
      } else {
        console.log('Elemento path#PE não encontrado. Tentando clicar nas coordenadas...');
        
        // Encontrar as coordenadas do mapa
        const coordenadas = await page.evaluate(() => {
          const svg = document.querySelector('svg');
          if (!svg) return null;
          
          const rect = svg.getBoundingClientRect();
          return {
            x: rect.left + (rect.width * 0.8), // Região de Pernambuco (nordeste)
            y: rect.top + (rect.height * 0.3)
          };
        });
        
        if (coordenadas) {
          console.log(`Clicando nas coordenadas: x=${coordenadas.x}, y=${coordenadas.y}`);
          await page.mouse.click(coordenadas.x, coordenadas.y);
        } else {
          console.log('Não foi possível encontrar o mapa.');
        }
      }
    }
    
    // Aguardar para ver se a página muda
    console.log('Aguardando 5 segundos para ver se a página muda...');
    await page.waitForTimeout(5000);
    
    // Tirar screenshot após clicar
    await page.screenshot({ path: 'estado-depois.png' });
    
    // Verificar se a página mudou
    const paginaMudou = await page.evaluate(() => {
      // Verificar se há elementos que indiquem que estamos na página de tribunais
      const elementos = Array.from(document.querySelectorAll('*'));
      
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
        temTribunal,
        url: window.location.href
      };
    });
    
    console.log('Verificação da mudança de página:');
    console.log(paginaMudou);
    
    // Manter o navegador aberto para visualização
    console.log('Aguardando 30 segundos para visualização...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    await page.screenshot({ path: 'erro.png' });
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Executar o script
clicarEstado().catch(console.error);
