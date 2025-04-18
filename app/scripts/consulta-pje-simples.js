/**
 * Script simplificado para consultar publicações no PJE Comunicações
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Configurações
const config = {
  url: 'https://comunica.pje.jus.br/',
  dataInicial: '09/04/2025',
  dataFinal: '17/04/2025',
  numeroOAB: '34067',
  ufOAB: 'PE',
  tempoEspera: 3000
};

async function consultarPublicacoes() {
  console.log('Iniciando consulta de publicações...');
  
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
    await page.screenshot({ path: 'pagina-inicial.png' });
    
    // 2. Clicar em Pernambuco no mapa
    console.log('Clicando em Pernambuco no mapa...');
    
    // Tentar clicar em Pernambuco usando o Playwright diretamente
    try {
      console.log('Tentando clicar no texto Pernambuco...');
      await page.click('text=Pernambuco', { timeout: 5000 });
      console.log('Clicado no texto Pernambuco');
    } catch (error) {
      console.log(`Não foi possível clicar no texto Pernambuco: ${error.message}`);
      
      try {
        console.log('Tentando clicar no path#PE...');
        await page.click('path#PE', { timeout: 5000 });
        console.log('Clicado no path#PE');
      } catch (error2) {
        console.log(`Não foi possível clicar no path#PE: ${error2.message}`);
        
        // Tentar usar coordenadas aproximadas para Pernambuco no mapa
        try {
          console.log('Tentando clicar usando coordenadas aproximadas para Pernambuco...');
          // Encontrar o elemento SVG do mapa
          const svgBounds = await page.evaluate(() => {
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
          
          if (svgBounds) {
            // Calcular coordenadas aproximadas para Pernambuco (região nordeste, lado direito)
            const x = svgBounds.x + (svgBounds.width * 0.8); // 80% da largura (lado direito)
            const y = svgBounds.y + (svgBounds.height * 0.3); // 30% da altura (região nordeste)
            
            await page.mouse.click(x, y);
            console.log(`Clicado nas coordenadas x=${x}, y=${y}`);
          } else {
            console.log('Não foi possível encontrar o SVG do mapa');
          }
        } catch (error3) {
          console.log(`Erro ao tentar clicar nas coordenadas: ${error3.message}`);
        }
      }
    }
    
    // Aguardar carregamento após clicar no estado
    await page.waitForTimeout(config.tempoEspera);
    await page.screenshot({ path: 'apos-clicar-estado.png' });
    
    // 3. Clicar no TJPE
    console.log('Clicando no TJPE...');
    
    try {
      console.log('Tentando clicar no texto TJPE...');
      await page.click('text=TJPE', { timeout: 5000 });
      console.log('Clicado no texto TJPE');
    } catch (error) {
      console.log(`Não foi possível clicar no texto TJPE: ${error.message}`);
      
      try {
        console.log('Tentando clicar em elementos que contenham TJPE...');
        
        // Usar JavaScript para encontrar coordenadas de elementos com TJPE
        const coordenadas = await page.evaluate(() => {
          const elementos = Array.from(document.querySelectorAll('*'));
          const elementoTJPE = elementos.find(el => 
            el.textContent && 
            el.textContent.includes('TJPE') && 
            el.getBoundingClientRect().width > 0
          );
          
          if (elementoTJPE) {
            const rect = elementoTJPE.getBoundingClientRect();
            return {
              x: rect.left + (rect.width / 2),
              y: rect.top + (rect.height / 2)
            };
          }
          
          return null;
        });
        
        if (coordenadas) {
          await page.mouse.click(coordenadas.x, coordenadas.y);
          console.log(`Clicado nas coordenadas x=${coordenadas.x}, y=${coordenadas.y}`);
        } else {
          console.log('Não foi possível encontrar coordenadas para TJPE');
        }
      } catch (error2) {
        console.log(`Erro ao tentar clicar em TJPE: ${error2.message}`);
      }
    }
    
    // Aguardar carregamento após clicar no tribunal
    await page.waitForTimeout(config.tempoEspera);
    await page.screenshot({ path: 'apos-clicar-tribunal.png' });
    
    // 4. Preencher o formulário
    console.log('Preenchendo formulário de consulta...');
    
    // Data inicial
    await page.fill('input[aria-label="Data Inicial"], input[placeholder*="Data Inicial"]', config.dataInicial);
    
    // Data final
    await page.fill('input[aria-label="Data Final"], input[placeholder*="Data Final"]', config.dataFinal);
    
    // Número da OAB
    await page.fill('input[aria-label="Nº da OAB"], input[placeholder*="OAB"]', config.numeroOAB);
    
    // UF da OAB
    await page.fill('input[aria-label="UF da OAB"], input[placeholder*="UF"]', config.ufOAB);
    
    // Tirar screenshot do formulário preenchido
    await page.screenshot({ path: 'formulario-preenchido.png' });
    
    // 5. Clicar no botão de pesquisar
    console.log('Clicando no botão de pesquisar...');
    
    await page.click('button:has-text("Pesquisar")');
    
    // Aguardar carregamento dos resultados
    console.log('Aguardando carregamento dos resultados...');
    await page.waitForTimeout(5000);
    
    // Tirar screenshot dos resultados
    await page.screenshot({ path: 'resultados.png' });
    
    // 6. Extrair dados das publicações
    console.log('Extraindo dados das publicações...');
    
    const publicacoes = await page.evaluate(() => {
      // Função para limpar texto
      function limparTexto(texto) {
        if (!texto) return '';
        return texto.replace(/\s+/g, ' ').trim();
      }
      
      // Procurar por elementos que pareçam ser publicações
      const elementos = Array.from(document.querySelectorAll('*'));
      const possiveisPublicacoes = elementos.filter(el => {
        const texto = el.textContent || '';
        return texto.includes('Processo') && 
               texto.includes('Data de disponibilização') &&
               el.getBoundingClientRect().width > 0;
      });
      
      console.log(`Encontrados ${possiveisPublicacoes.length} possíveis publicações`);
      
      // Extrair dados de cada publicação
      return possiveisPublicacoes.map(el => {
        const textoCompleto = el.textContent || '';
        
        // Extrair número do processo
        const processoMatch = textoCompleto.match(/Processo[\s:]+(\d+[-.]\d+\.\d+\.\d+\.\d+\.\d+)/i) ||
                             textoCompleto.match(/Processo[\s:]+(\S+)/i);
        const processo = processoMatch ? processoMatch[1] : '';
        
        // Extrair data de disponibilização
        const dataMatch = textoCompleto.match(/Data de disponibilização[\s:]+(\d{2}\/\d{2}\/\d{4})/i);
        const dataDisponibilizacao = dataMatch ? dataMatch[1] : '';
        
        // Extrair tipo de comunicação
        const tipoMatch = textoCompleto.match(/Tipo de comunicação[\s:]+(.*?)(?=Parte|$)/i);
        const tipoComunicacao = tipoMatch ? limparTexto(tipoMatch[1]) : '';
        
        // Extrair conteúdo (todo o texto)
        const conteudo = limparTexto(textoCompleto);
        
        return {
          processo,
          dataDisponibilizacao,
          tipoComunicacao,
          conteudo
        };
      });
    });
    
    console.log(`Encontradas ${publicacoes.length} publicações`);
    
    // 7. Salvar em arquivo JSON
    const nomeArquivo = 'publicacoes-pje.json';
    fs.writeFileSync(nomeArquivo, JSON.stringify(publicacoes, null, 2), { encoding: 'utf8' });
    
    console.log(`Dados salvos em ${nomeArquivo}`);
    
    // Manter o navegador aberto por um tempo para visualização
    console.log('Aguardando 30 segundos para visualização...');
    await page.waitForTimeout(30000);
    
    return publicacoes;
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    
    // Tirar screenshot em caso de erro
    await page.screenshot({ path: 'erro.png' });
    
    throw error;
  } finally {
    await browser.close();
    console.log('Navegador fechado');
  }
}

// Executar a consulta
consultarPublicacoes()
  .then(publicacoes => {
    console.log(`Consulta concluída com ${publicacoes.length} publicações encontradas`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  });
