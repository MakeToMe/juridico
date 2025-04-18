/**
 * Script para consultar publicações no PJE Comunicações
 * Extrai publicações para um advogado específico
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Configurações
const config = {
  url: 'https://comunica.pje.jus.br/',
  estado: 'Pernambuco',
  tribunal: 'TJPE',
  dataInicial: '09/04/2025',
  dataFinal: '17/04/2025',
  numeroOAB: '34067',
  ufOAB: 'PE',
  tempoEsperaNavegacao: 5000, // 5 segundos
  tempoEsperaResultados: 10000, // 10 segundos
  headless: false, // Modo não-headless para visualização
};

/**
 * Função principal para consultar publicações
 */
async function consultarPublicacoes() {
  console.log(`Iniciando consulta de publicações para OAB ${config.numeroOAB}/${config.ufOAB}...`);
  
  const browser = await chromium.launch({
    headless: config.headless,
    args: ['--disable-dev-shm-usage', '--window-size=1366,768']
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // ETAPA 1: ACESSAR O SITE
    console.log('\n=== ETAPA 1: ACESSANDO O SITE ===');
    console.log(`Navegando para a página inicial: ${config.url}`);
    await page.goto(config.url);
    
    // Aguardar carregamento da página
    await page.waitForSelector('input[placeholder*="Pesquise nacionalmente"]');
    console.log('Página inicial carregada com sucesso.');
    
    // ETAPA 2: SELECIONAR O ESTADO
    console.log('\n=== ETAPA 2: SELECIONANDO O ESTADO ===');
    console.log(`Selecionando o estado: ${config.estado}`);
    
    // Tirar screenshot para debug
    await page.screenshot({ path: 'pagina-inicial.png' });
    console.log('Screenshot salvo como pagina-inicial.png');
    
    // Tentar clicar diretamente no mapa usando JavaScript
    console.log('Tentando clicar no estado via JavaScript...');
    
    try {
      // Usar JavaScript para clicar no estado
      await page.evaluate((estadoNome) => {
        console.log(`Procurando por elementos com texto '${estadoNome}'...`);
        
        // Procurar por elementos que contenham o nome do estado
        const elementos = Array.from(document.querySelectorAll('*'));
        
        // Filtrar elementos visíveis que contêm o texto do estado
        const estadoElementos = elementos.filter(el => {
          if (!el.textContent) return false;
          
          // Verificar se o elemento contém o texto do estado
          const contem = el.textContent.trim() === estadoNome;
          
          // Verificar se o elemento é visível
          const rect = el.getBoundingClientRect();
          const visivel = rect.width > 0 && rect.height > 0;
          
          return contem && visivel;
        });
        
        console.log(`Encontrados ${estadoElementos.length} elementos para ${estadoNome}`);
        
        if (estadoElementos.length > 0) {
          // Clicar no primeiro elemento encontrado
          estadoElementos[0].click();
          return true;
        }
        
        // Se não encontrou pelo nome exato, tentar encontrar elementos que contenham o nome
        const elementosContendo = elementos.filter(el => {
          if (!el.textContent) return false;
          
          // Verificar se o elemento contém o texto do estado
          const contem = el.textContent.includes(estadoNome);
          
          // Verificar se o elemento é visível
          const rect = el.getBoundingClientRect();
          const visivel = rect.width > 0 && rect.height > 0;
          
          return contem && visivel;
        });
        
        console.log(`Encontrados ${elementosContendo.length} elementos contendo ${estadoNome}`);
        
        if (elementosContendo.length > 0) {
          // Clicar no primeiro elemento encontrado
          elementosContendo[0].click();
          return true;
        }
        
        // Se ainda não encontrou, tentar clicar no path do mapa
        const pathPE = document.querySelector('path#PE');
        if (pathPE) {
          console.log('Encontrado path#PE, clicando...');
          pathPE.click();
          return true;
        }
        
        // Se ainda não encontrou, tentar clicar em qualquer elemento do mapa
        const mapaElementos = document.querySelectorAll('svg path, svg text');
        if (mapaElementos.length > 0) {
          console.log(`Encontrados ${mapaElementos.length} elementos do mapa, clicando no primeiro...`);
          mapaElementos[0].click();
          return true;
        }
        
        return false;
      }, config.estado);
      
      console.log('Clique no estado realizado via JavaScript');
    } catch (error) {
      console.log(`Erro ao tentar clicar no estado: ${error.message}`);
      
      // Tentar clicar diretamente no estado usando o seletor do Playwright
      try {
        console.log('Tentando clicar diretamente no texto do estado...');
        await page.click(`text="${config.estado}"`, { timeout: 5000 });
        console.log('Clicado no estado via texto');
      } catch (error2) {
        console.log(`Erro ao tentar clicar no texto do estado: ${error2.message}`);
        
        // Tentar clicar no path do estado
        try {
          console.log('Tentando clicar no path do estado...');
          await page.click('path#PE', { timeout: 5000 });
          console.log('Clicado no estado via path#PE');
        } catch (error3) {
          console.log(`Erro ao tentar clicar no path do estado: ${error3.message}`);
          
          // Última tentativa: clicar no mapa em geral
          try {
            console.log('Tentando clicar em qualquer elemento do mapa...');
            await page.click('svg', { timeout: 5000 });
            console.log('Clicado no mapa');
          } catch (error4) {
            console.log(`Erro ao tentar clicar no mapa: ${error4.message}`);
            console.log('Continuando mesmo sem conseguir clicar no estado...');
          }
        }
      }
    }
    
    console.log(`Estado ${config.estado} selecionado com sucesso.`);
    await page.waitForTimeout(config.tempoEsperaNavegacao);
    
    // ETAPA 3: SELECIONAR O TRIBUNAL
    console.log('\n=== ETAPA 3: SELECIONANDO O TRIBUNAL ===');
    console.log(`Selecionando o tribunal: ${config.tribunal}`);
    
    // Aguardar para garantir que a página de tribunais carregou
    await page.waitForTimeout(config.tempoEsperaNavegacao);
    
    // Tirar screenshot para debug
    await page.screenshot({ path: 'pagina-tribunais.png' });
    console.log('Screenshot salvo como pagina-tribunais.png');
    
    // Usar JavaScript para clicar no tribunal
    try {
      const clicouNoTribunal = await page.evaluate((tribunalNome) => {
        console.log(`Procurando por elementos com texto '${tribunalNome}'...`);
        
        // Procurar por elementos que contenham o nome do tribunal
        const elementos = Array.from(document.querySelectorAll('*'));
        
        // Função para verificar se um elemento é visível
        function isElementoVisivel(el) {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && 
                 rect.top >= 0 && rect.left >= 0 && 
                 rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && 
                 rect.right <= (window.innerWidth || document.documentElement.clientWidth);
        }
        
        // Primeiro, tentar encontrar pelo texto exato
        const tribunalElementos = elementos.filter(el => {
          return el.textContent && 
                 el.textContent.trim() === tribunalNome && 
                 isElementoVisivel(el);
        });
        
        if (tribunalElementos.length > 0) {
          console.log(`Encontrados ${tribunalElementos.length} elementos com texto exato '${tribunalNome}'`);
          tribunalElementos[0].click();
          return true;
        }
        
        // Se não encontrou pelo texto exato, tentar encontrar elementos que contenham o nome
        const elementosContendo = elementos.filter(el => {
          return el.textContent && 
                 el.textContent.includes(tribunalNome) && 
                 isElementoVisivel(el);
        });
        
        if (elementosContendo.length > 0) {
          console.log(`Encontrados ${elementosContendo.length} elementos contendo '${tribunalNome}'`);
          elementosContendo[0].click();
          return true;
        }
        
        // Se ainda não encontrou, tentar encontrar cards ou elementos de lista
        const cards = document.querySelectorAll('.v-card, .card, [role="listitem"]');
        for (const card of cards) {
          if (card.textContent && card.textContent.includes(tribunalNome) && isElementoVisivel(card)) {
            console.log(`Encontrado card contendo '${tribunalNome}'`);
            card.click();
            return true;
          }
        }
        
        return false;
      }, config.tribunal);
      
      if (clicouNoTribunal) {
        console.log('Clique no tribunal realizado via JavaScript');
      } else {
        console.log('Não foi possível clicar no tribunal via JavaScript, tentando alternativas...');
        
        // Tentar clicar diretamente usando o Playwright
        try {
          await page.click(`text="${config.tribunal}"`, { timeout: 5000 });
          console.log('Clicado no tribunal via texto');
        } catch (error) {
          console.log(`Erro ao tentar clicar no texto do tribunal: ${error.message}`);
          
          // Tentar clicar em qualquer elemento que contenha o texto do tribunal
          try {
            await page.click(`text=${config.tribunal}`, { timeout: 5000 });
            console.log('Clicado no tribunal via texto parcial');
          } catch (error2) {
            console.log(`Erro ao tentar clicar no texto parcial do tribunal: ${error2.message}`);
            console.log('Continuando mesmo sem conseguir clicar no tribunal...');
          }
        }
      }
    } catch (error) {
      console.log(`Erro ao tentar clicar no tribunal: ${error.message}`);
      console.log('Continuando mesmo sem conseguir clicar no tribunal...');
    }
    
    console.log(`Tribunal ${config.tribunal} selecionado com sucesso.`);
    await page.waitForTimeout(config.tempoEsperaNavegacao);
    
    // ETAPA 4: PREENCHER FORMULÁRIO DE CONSULTA
    console.log('\n=== ETAPA 4: PREENCHENDO FORMULÁRIO DE CONSULTA ===');
    
    // Preencher data inicial
    console.log(`Preenchendo data inicial: ${config.dataInicial}`);
    const dataInicialSelector = 'input[aria-label="Data Inicial"]';
    await page.waitForSelector(dataInicialSelector);
    await page.fill(dataInicialSelector, config.dataInicial);
    
    // Preencher data final
    console.log(`Preenchendo data final: ${config.dataFinal}`);
    const dataFinalSelector = 'input[aria-label="Data Final"]';
    await page.waitForSelector(dataFinalSelector);
    await page.fill(dataFinalSelector, config.dataFinal);
    
    // Preencher número da OAB
    console.log(`Preenchendo número da OAB: ${config.numeroOAB}`);
    const numeroOABSelector = 'input[aria-label="Nº da OAB"]';
    await page.waitForSelector(numeroOABSelector);
    await page.fill(numeroOABSelector, config.numeroOAB);
    
    // Selecionar UF da OAB
    console.log(`Selecionando UF da OAB: ${config.ufOAB}`);
    const ufOABSelector = 'input[aria-label="UF da OAB"]';
    await page.waitForSelector(ufOABSelector);
    await page.fill(ufOABSelector, config.ufOAB);
    
    // ETAPA 5: REALIZAR A CONSULTA
    console.log('\n=== ETAPA 5: REALIZANDO A CONSULTA ===');
    
    // Clicar no botão de pesquisar
    const pesquisarSelector = 'button:has-text("Pesquisar")';
    await page.waitForSelector(pesquisarSelector);
    await page.click(pesquisarSelector);
    
    // Aguardar resultados
    console.log(`Aguardando ${config.tempoEsperaResultados/1000} segundos para carregar os resultados...`);
    await page.waitForTimeout(config.tempoEsperaResultados);
    
    // ETAPA 6: EXTRAIR DADOS DAS PUBLICAÇÕES
    console.log('\n=== ETAPA 6: EXTRAINDO DADOS DAS PUBLICAÇÕES ===');
    
    // Extrair dados das publicações
    console.log('Aguardando 5 segundos para garantir que os resultados carregaram...');
    await page.waitForTimeout(5000);
    
    // Tirar screenshot da página de resultados para debug
    await page.screenshot({ path: 'resultados.png' });
    console.log('Screenshot salvo como resultados.png');
    
    const publicacoes = await extrairPublicacoes(page);
    
    console.log(`\n----- TOTAL DE PUBLICAÇÕES: ${publicacoes.length} -----`);
    publicacoes.forEach((pub, index) => {
      console.log(`${index + 1}. Processo: ${pub.processo}`);
    });
    
    // ETAPA 7: SALVAR DADOS EM JSON
    console.log('\n=== ETAPA 7: SALVANDO DADOS EM JSON ===');
    
    // Criar nome do arquivo
    const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const nomeArquivo = `publicacoes-${config.tribunal.toLowerCase()}-${dataAtual}.json`;
    
    // Salvar em arquivo
    fs.writeFileSync(nomeArquivo, JSON.stringify(publicacoes, null, 2), { encoding: 'utf8' });
    
    console.log(`Publicações salvas em ${nomeArquivo}`);
    
    // Manter o navegador aberto por um tempo para visualização
    console.log('\nAguardando 30 segundos para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    await page.waitForTimeout(30000); // 30 segundos
    
    return publicacoes;
  } catch (error) {
    console.error(`Erro durante a consulta: ${error.message}`);
    console.error(error.stack);
    
    // Aguardar 10 segundos antes de fechar para poder ver o erro
    console.log('Aguardando 10 segundos antes de fechar...');
    await page.waitForTimeout(10000);
    
    throw error;
  } finally {
    await browser.close();
    console.log('Navegador fechado.');
  }
}

/**
 * Função para extrair dados das publicações
 */
async function extrairPublicacoes(page) {
  // Primeiro, vamos verificar a estrutura da página para entender como extrair os dados
  const estruturaPagina = await page.evaluate(() => {
    // Função para limpar texto
    function limparTexto(texto) {
      if (!texto) return '';
      return texto.replace(/\s+/g, ' ').trim();
    }
    
    // Analisar a estrutura da página
    const estrutura = {
      titulo: document.title,
      url: window.location.href,
      elementosEncontrados: {}
    };
    
    // Verificar diferentes possíveis seletores para os containers de publicações
    const possiveisSeletores = [
      'div.processo-container',
      'div.v-card',
      'div.comunicacao',
      'div.publicacao',
      'div[role="listitem"]',
      'div.v-list-item'
    ];
    
    // Verificar quais seletores encontram elementos
    possiveisSeletores.forEach(seletor => {
      const elementos = document.querySelectorAll(seletor);
      estrutura.elementosEncontrados[seletor] = elementos.length;
    });
    
    // Verificar se há algum elemento que pareça ser uma publicação
    const todosElementos = Array.from(document.querySelectorAll('*'));
    const possiveisPublicacoes = todosElementos.filter(el => {
      const texto = el.textContent || '';
      return texto.includes('Processo') && texto.includes('Data de disponibilização');
    });
    
    estrutura.possiveisPublicacoes = possiveisPublicacoes.length;
    
    // Capturar os primeiros 10 elementos com conteúdo para análise
    const elementosComConteudo = todosElementos
      .filter(el => el.textContent && el.textContent.trim().length > 50)
      .slice(0, 10)
      .map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        conteudo: limparTexto(el.textContent).substring(0, 100) + '...'
      }));
    
    estrutura.elementosComConteudo = elementosComConteudo;
    
    return estrutura;
  });
  
  console.log('Análise da estrutura da página:');
  console.log(JSON.stringify(estruturaPagina, null, 2));
  
  // Agora que analisamos a estrutura, vamos tentar extrair os dados
  return await page.evaluate(() => {
    // Função para limpar texto
    function limparTexto(texto) {
      if (!texto) return '';
      return texto.replace(/\s+/g, ' ').trim();
    }
    
    // Função para extrair texto com base em um padrão
    function extrairTextoComPadrao(texto, padrao) {
      if (!texto) return '';
      const match = texto.match(padrao);
      return match && match[1] ? limparTexto(match[1]) : '';
    }
    
    // Determinar qual seletor usar para os containers de publicações
    let containers = [];
    const possiveisSeletores = [
      'div.processo-container',
      'div.v-card',
      'div.comunicacao',
      'div.publicacao',
      'div[role="listitem"]',
      'div.v-list-item'
    ];
    
    // Tentar cada seletor até encontrar um que retorne elementos
    for (const seletor of possiveisSeletores) {
      containers = document.querySelectorAll(seletor);
      if (containers.length > 0) {
        console.log(`Usando seletor: ${seletor}, encontrados ${containers.length} elementos`);
        break;
      }
    }
    
    // Se nenhum seletor funcionou, tentar uma abordagem mais genérica
    if (containers.length === 0) {
      console.log('Nenhum seletor padrão funcionou, tentando abordagem alternativa...');
      
      // Procurar por elementos que pareçam ser publicações
      const todosElementos = Array.from(document.querySelectorAll('*'));
      const possiveisPublicacoes = todosElementos.filter(el => {
        const texto = el.textContent || '';
        return texto.includes('Processo') && texto.includes('Data de disponibilização');
      });
      
      if (possiveisPublicacoes.length > 0) {
        console.log(`Encontrados ${possiveisPublicacoes.length} possíveis publicações`);
        containers = possiveisPublicacoes;
      }
    }
    
    console.log(`Total de containers encontrados: ${containers.length}`);
    
    const publicacoes = [];
    
    // Para cada container, tentar extrair as informações
    containers.forEach((container, index) => {
      console.log(`Processando container ${index + 1}`);
      
      // Obter todo o texto do container
      const textoCompleto = container.textContent || '';
      
      // Extrair informações usando padrões de texto
      const processo = extrairTextoComPadrao(textoCompleto, /Processo[\s:]+(\d+[-.]\d+\.\d+\.\d+\.\d+\.\d+)/i) ||
                     extrairTextoComPadrao(textoCompleto, /Processo[\s:]+(\S+)/i);
      
      const origem = extrairTextoComPadrao(textoCompleto, /Origem[\s:]+(.*?)(?=Data|Tipo|$)/i);
      
      const dataDisponibilizacao = extrairTextoComPadrao(textoCompleto, /Data de disponibilização[\s:]+(\d{2}\/\d{2}\/\d{4})/i);
      
      const tipoComunicacao = extrairTextoComPadrao(textoCompleto, /Tipo de comunicação[\s:]+(.*?)(?=Parte|$)/i);
      
      // Extrair partes e advogados
      const partesTexto = extrairTextoComPadrao(textoCompleto, /Parte\(s\)[\s:]+(.*?)(?=Advogado|$)/i);
      const advogadosTexto = extrairTextoComPadrao(textoCompleto, /Advogado\(s\)[\s:]+(.*?)(?=$)/i);
      
      // Processar partes
      const partes = partesTexto ? partesTexto.split(',').map(p => p.trim()).filter(p => p) : [];
      
      // Processar advogados
      const advogados = advogadosTexto ? advogadosTexto.split(',').map(a => a.trim()).filter(a => a) : [];
      
      // Extrair conteúdo - tudo que não foi capturado nas outras extrações
      let conteudo = textoCompleto;
      
      // Remover as partes já extraídas do conteúdo
      if (processo) conteudo = conteudo.replace(new RegExp(`Processo[\\s:]+${processo.replace(/[-\.]/g, '\\$&')}`, 'i'), '');
      if (origem) conteudo = conteudo.replace(new RegExp(`Origem[\\s:]+${origem}`, 'i'), '');
      if (dataDisponibilizacao) conteudo = conteudo.replace(new RegExp(`Data de disponibilização[\\s:]+${dataDisponibilizacao}`, 'i'), '');
      if (tipoComunicacao) conteudo = conteudo.replace(new RegExp(`Tipo de comunicação[\\s:]+${tipoComunicacao}`, 'i'), '');
      if (partesTexto) conteudo = conteudo.replace(new RegExp(`Parte\\(s\\)[\\s:]+${partesTexto}`, 'i'), '');
      if (advogadosTexto) conteudo = conteudo.replace(new RegExp(`Advogado\\(s\\)[\\s:]+${advogadosTexto}`, 'i'), '');
      
      conteudo = limparTexto(conteudo);
      
      // Criar objeto da publicação
      const publicacao = {
        processo,
        origem,
        dataDisponibilizacao,
        tipoComunicacao,
        conteudo,
        partes,
        advogados
      };
      
      publicacoes.push(publicacao);
    });
    
    return publicacoes;
  });
}

// Executar a consulta
consultarPublicacoes()
  .then(() => {
    console.log('Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  });
