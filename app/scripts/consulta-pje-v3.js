/**
 * Script para consultar publicações no PJE Comunicações
 * Versão 3 - Evitando interação com o calendário até o momento certo
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
  tempoEspera: 5000
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
    console.log('Screenshot salvo: pagina-inicial.png');
    
    // IMPORTANTE: Evitar clicar no calendário
    // Vamos primeiro verificar se o calendário está visível e, se estiver, fechá-lo
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
    
    // 2. Clicar em Pernambuco no mapa
    console.log('Clicando em Pernambuco no mapa...');
    
    // Clicar diretamente no mapa na região de Pernambuco
    // Primeiro, vamos verificar se o mapa está visível
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
    const pernambucoPosX = mapaBounds.x + (mapaBounds.width * 0.8);
    const pernambucoPosY = mapaBounds.y + (mapaBounds.height * 0.3);
    
    console.log(`Clicando nas coordenadas do mapa: x=${pernambucoPosX}, y=${pernambucoPosY}`);
    await page.mouse.click(pernambucoPosX, pernambucoPosY);
    
    // Aguardar carregamento após clicar no estado
    console.log('Aguardando carregamento após clicar no estado...');
    await page.waitForTimeout(config.tempoEspera);
    
    // Tirar screenshot após clicar no estado
    await page.screenshot({ path: 'apos-clicar-estado.png' });
    console.log('Screenshot salvo: apos-clicar-estado.png');
    
    // 3. Verificar se estamos na página de tribunais de Pernambuco
    const estamosNaPaginaDeTribunais = await page.evaluate(() => {
      // Verificar se há elementos que indiquem que estamos na página de tribunais
      const elementos = Array.from(document.querySelectorAll('*'));
      return elementos.some(el => 
        el.textContent && 
        (el.textContent.includes('TJPE') || el.textContent.includes('Tribunal de Justiça'))
      );
    });
    
    if (!estamosNaPaginaDeTribunais) {
      console.log('Não estamos na página de tribunais! Tentando novamente...');
      
      // Tentar clicar novamente em uma posição ligeiramente diferente
      const novaPosX = pernambucoPosX - 10;
      const novaPosY = pernambucoPosY - 10;
      
      console.log(`Tentando novamente com coordenadas: x=${novaPosX}, y=${novaPosY}`);
      await page.mouse.click(novaPosX, novaPosY);
      
      // Aguardar carregamento
      await page.waitForTimeout(config.tempoEspera);
      await page.screenshot({ path: 'segunda-tentativa-estado.png' });
      console.log('Screenshot salvo: segunda-tentativa-estado.png');
    }
    
    // 4. Clicar no TJPE
    console.log('Clicando no TJPE...');
    
    // Procurar por cards na página
    const cardTJPE = await page.evaluate(() => {
      // Procurar por cards ou elementos que possam conter o TJPE
      const cards = document.querySelectorAll('.v-card, .card, [role="listitem"]');
      
      for (const card of cards) {
        if (card.textContent && card.textContent.includes('TJPE')) {
          const rect = card.getBoundingClientRect();
          return {
            x: rect.left + (rect.width / 2),
            y: rect.top + (rect.height / 2),
            width: rect.width,
            height: rect.height,
            text: card.textContent.substring(0, 50)
          };
        }
      }
      
      // Se não encontrou nos cards, procurar em qualquer elemento
      const elementos = Array.from(document.querySelectorAll('*'));
      const elementoTJPE = elementos.find(el => 
        el.textContent && 
        el.textContent.includes('TJPE') && 
        el.getBoundingClientRect().width > 0 &&
        el.getBoundingClientRect().height > 0
      );
      
      if (elementoTJPE) {
        const rect = elementoTJPE.getBoundingClientRect();
        return {
          x: rect.left + (rect.width / 2),
          y: rect.top + (rect.height / 2),
          width: rect.width,
          height: rect.height,
          text: elementoTJPE.textContent.substring(0, 50)
        };
      }
      
      return null;
    });
    
    if (!cardTJPE) {
      console.log('Card do TJPE não encontrado!');
      throw new Error('Card do TJPE não encontrado');
    }
    
    console.log(`Card do TJPE encontrado: ${JSON.stringify(cardTJPE)}`);
    console.log(`Clicando nas coordenadas: x=${cardTJPE.x}, y=${cardTJPE.y}`);
    
    await page.mouse.click(cardTJPE.x, cardTJPE.y);
    
    // Aguardar carregamento após clicar no tribunal
    console.log('Aguardando carregamento após clicar no tribunal...');
    await page.waitForTimeout(config.tempoEspera);
    
    // Tirar screenshot após clicar no tribunal
    await page.screenshot({ path: 'apos-clicar-tribunal.png' });
    console.log('Screenshot salvo: apos-clicar-tribunal.png');
    
    // 5. Verificar se estamos na página de formulário
    const estamosNaPaginaDeFormulario = await page.evaluate(() => {
      // Verificar se há campos de formulário
      const campoDataInicial = document.querySelector('input[aria-label="Data Inicial"], input[placeholder*="Data Inicial"]');
      const campoOAB = document.querySelector('input[aria-label="Nº da OAB"], input[placeholder*="OAB"]');
      
      return campoDataInicial !== null || campoOAB !== null;
    });
    
    if (!estamosNaPaginaDeFormulario) {
      console.log('Não estamos na página de formulário! Algo deu errado.');
      throw new Error('Página de formulário não encontrada');
    }
    
    // 6. Preencher o formulário
    console.log('Preenchendo formulário de consulta...');
    
    // Preencher OAB primeiro (para evitar interação com calendário)
    console.log('Preenchendo número da OAB...');
    await page.fill('input[aria-label="Nº da OAB"], input[placeholder*="OAB"]', config.numeroOAB);
    
    // Preencher UF da OAB
    console.log('Preenchendo UF da OAB...');
    await page.fill('input[aria-label="UF da OAB"], input[placeholder*="UF"]', config.ufOAB);
    
    // Agora preencher as datas
    console.log('Preenchendo data inicial...');
    await page.fill('input[aria-label="Data Inicial"], input[placeholder*="Data Inicial"]', config.dataInicial);
    
    console.log('Preenchendo data final...');
    await page.fill('input[aria-label="Data Final"], input[placeholder*="Data Final"]', config.dataFinal);
    
    // Tirar screenshot do formulário preenchido
    await page.screenshot({ path: 'formulario-preenchido.png' });
    console.log('Screenshot salvo: formulario-preenchido.png');
    
    // 7. Clicar no botão de pesquisar
    console.log('Clicando no botão de pesquisar...');
    
    await page.click('button:has-text("Pesquisar")');
    
    // Aguardar carregamento dos resultados
    console.log('Aguardando carregamento dos resultados...');
    await page.waitForTimeout(config.tempoEspera);
    
    // Tirar screenshot dos resultados
    await page.screenshot({ path: 'resultados.png' });
    console.log('Screenshot salvo: resultados.png');
    
    // 8. Extrair dados das publicações
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
        const processoMatch = textoCompleto.match(/Processo[\s:]+([\d\.-]+)/i);
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
    
    // 9. Salvar em arquivo JSON
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
    console.log('Screenshot de erro salvo: erro.png');
    
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
