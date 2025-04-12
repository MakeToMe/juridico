/**
 * Script para extrair dados de processo do TJAL e salvar em JSON com o número do processo no nome
 * Usa a navegação direta para a página de consulta após o login
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0701552-85.2024.8.02.0001';

// URL direta do processo (após login)
const URL_CONSULTA = 'https://www2.tjal.jus.br/cpopg/show.do';

// Credenciais para acesso ao TJAL
const credenciais = {
  site: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '847.698.584-34',
  senha: '8476guardia'
};

// Configurações de tempo
const config = {
  tempoEsperaLogin: 3000,      // 3 segundos
  tempoEsperaConsulta: 2000,   // 2 segundos
  tempoEsperaVisualizacao: 60000 // 1 minuto
};

// Função principal
async function consultarProcesso() {
  console.log(`Iniciando extração de dados do processo ${NUMERO_PROCESSO} no TJAL`);
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-dev-shm-usage']
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 1. Acessar página de login
    console.log('Acessando página de login...');
    await page.goto(credenciais.site);
    
    // 2. Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    
    // 3. Clicar no botão de login
    console.log('Fazendo login...');
    await page.click('#pbEntrar');
    
    // 4. Aguardar redirecionamento após o login
    console.log(`Aguardando ${config.tempoEsperaLogin/1000} segundos após o login...`);
    await page.waitForTimeout(config.tempoEsperaLogin);
    
    // 5. Navegar diretamente para a página de consulta
    console.log('Navegando para a página de consulta...');
    await page.goto(URL_CONSULTA);
    
    // 6. Selecionar opção de número unificado
    console.log('Selecionando opção de número unificado...');
    await page.evaluate(() => {
      const radioNumeroUnificado = document.querySelector('#radioNumeroUnificado');
      if (radioNumeroUnificado) {
        radioNumeroUnificado.click();
      }
    });
    
    // 7. Extrair as partes do número do processo
    const partes = NUMERO_PROCESSO.split('.');
    const primeiraParte = partes.slice(0, 2).join('.');
    const ultimaParte = partes[3];
    
    // 8. Preencher o número do processo
    console.log(`Preenchendo número do processo: ${primeiraParte} / ${ultimaParte}`);
    await page.fill('#numeroDigitoAnoUnificado', primeiraParte);
    await page.fill('#foroNumeroUnificado', ultimaParte);
    
    // 9. Clicar no botão de consulta
    console.log('Clicando no botão de consulta...');
    await page.click('#botaoConsultarProcessos');
    
    // 10. Aguardar carregamento da página de detalhes
    console.log('Aguardando carregamento da página de detalhes...');
    await page.waitForSelector('#tableTodasPartes, #tablePartesPrincipais', { timeout: 30000 });
    
    // 11. Aguardar um pouco mais para garantir que a página carregou completamente
    console.log(`Aguardando ${config.tempoEsperaConsulta/1000} segundos para garantir carregamento completo...`);
    await page.waitForTimeout(config.tempoEsperaConsulta);
    
    // 12. Extrair dados do processo
    console.log('Extraindo dados do processo...');
    const dadosProcesso = await extrairDadosProcesso(page);
    
    // 13. Extrair movimentações
    console.log('Extraindo movimentações...');
    const movimentacoes = await extrairMovimentacoes(page);
    
    // 14. Criar objeto com todos os dados
    const dadosCompletos = {
      processo: dadosProcesso.dadosBasicos,
      partes: dadosProcesso.partes,
      movimentacoes
    };
    
    // 15. Salvar em arquivo JSON com o número do processo no nome
    const numeroProcessoFormatado = NUMERO_PROCESSO.replace(/[^0-9]/g, '');
    const nomeArquivo = `tjal-${numeroProcessoFormatado}.json`;
    const caminhoArquivo = path.join(__dirname, '..', 'dados', nomeArquivo);
    
    // Criar diretório se não existir
    const diretorio = path.join(__dirname, '..', 'dados');
    if (!fs.existsSync(diretorio)) {
      fs.mkdirSync(diretorio, { recursive: true });
    }
    
    // Salvar arquivo
    fs.writeFileSync(caminhoArquivo, JSON.stringify(dadosCompletos, null, 2), 'utf8');
    console.log(`Dados salvos em: ${caminhoArquivo}`);
    
    // 16. Aguardar para visualização manual
    console.log(`\nAguardando ${config.tempoEsperaVisualizacao/1000} segundos para visualização manual...`);
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    await page.waitForTimeout(config.tempoEsperaVisualizacao);
    
  } catch (error) {
    console.error('Erro durante a consulta:', error);
  } finally {
    await browser.close();
  }
}

/**
 * Extrai os dados básicos do processo e as partes envolvidas
 */
async function extrairDadosProcesso(page) {
  return await page.evaluate(() => {
    // Função auxiliar para extrair texto com label
    function extrairTextoComLabel(seletor) {
      const elemento = document.querySelector(seletor);
      if (!elemento) return '';
      
      // Remover o label e retornar apenas o valor
      const textoCompleto = elemento.innerText.trim();
      const partes = textoCompleto.split(':');
      
      if (partes.length > 1) {
        return partes.slice(1).join(':').trim();
      }
      
      return textoCompleto;
    }
    
    // Extrair dados básicos do processo
    const numeroProcesso = document.querySelector('.labelClass:nth-child(1)')?.innerText.trim() || '';
    const classeProcesso = document.querySelector('.labelClass:nth-child(2)')?.innerText.trim() || '';
    const assuntoProcesso = document.querySelector('.labelClass:nth-child(3)')?.innerText.trim() || '';
    
    // Extrair campos adicionais
    const foro = extrairTextoComLabel('#labelForoProcesso') || '';
    const vara = extrairTextoComLabel('#labelVaraProcesso') || '';
    const juiz = extrairTextoComLabel('#labelJuizProcesso') || '';
    const area = document.querySelector('#areaProcesso')?.innerText.trim() || '';
    const valorAcao = document.querySelector('#valorAcaoProcesso')?.innerText.trim() || '';
    const distribuicao = document.querySelector('#dataHoraDistribuicaoProcesso')?.innerText.trim() || '';
    
    // Extrair partes do processo
    const partesArray = [];
    
    // Função para extrair texto de um elemento
    function extrairTexto(elemento) {
      return elemento.textContent.trim();
    }
    
    // Abordagem 1: Procurar por tabelas de partes
    const secaoPartes = document.querySelector('#tablePartesPrincipais, #tableTodasPartes');
    if (secaoPartes) {
      const linhas = secaoPartes.querySelectorAll('tr');
      let tipoAtual = null;
      
      for (const linha of linhas) {
        const texto = linha.textContent.trim();
        
        // Identificar o tipo da parte
        if (texto === 'Autor' || texto.includes('Autor:') || 
            texto === 'Requerente' || texto.includes('Requerente:') ||
            texto === 'Exequente' || texto.includes('Exequente:') ||
            texto === 'Impetrante' || texto.includes('Impetrante:') ||
            texto === 'Embargante' || texto.includes('Embargante:') ||
            texto === 'Reclamante' || texto.includes('Reclamante:')) {
          tipoAtual = 'Autor';
          continue;
        } else if (texto === 'Réu' || texto.includes('Réu:') ||
                   texto === 'Requerido' || texto.includes('Requerido:') ||
                   texto === 'Executado' || texto.includes('Executado:') ||
                   texto === 'Impetrado' || texto.includes('Impetrado:') ||
                   texto === 'Embargado' || texto.includes('Embargado:') ||
                   texto === 'Reclamado' || texto.includes('Reclamado:')) {
          tipoAtual = 'Réu';
          continue;
        }
        
        // Se temos um tipo definido e a linha não é de cabeçalho
        if (tipoAtual && !texto.includes('PARTES DO PROCESSO') && !texto.includes('Recolher')) {
          // Extrair nome e advogados
          let nome = texto;
          let advogados = [];
          
          // Verificar se o texto contém informações de advogado
          if (texto.includes('Advogado:') || texto.includes('Advogada:')) {
            // Lidar com ambos os casos: Advogado e Advogada
            let partes = [];
            if (texto.includes('Advogado:')) {
              partes = texto.split('Advogado:');
            } else if (texto.includes('Advogada:')) {
              partes = texto.split('Advogada:');
            }
            
            nome = partes[0].trim();
            
            // Extrair múltiplos advogados
            const textoAdvogados = partes.slice(1).join(' ');
            advogados = textoAdvogados.split(/Advogado:|Advogada:|e\s+\d+\.\d+\.\d+-\d+/g)
              .map(adv => adv.trim())
              .filter(adv => adv);
          }
          
          // Adicionar ao array de partes
          if (nome) {
            const parteExistente = partesArray.find(p => p.nome === nome && p.tipo === tipoAtual);
            if (!parteExistente) {
              partesArray.push({
                tipo: tipoAtual,
                nome,
                advogados
              });
            }
          }
        }
      }
    }
    
    // Organizar partes por tipo
    const partes = {};
    
    // Limpar e organizar partes
    partesArray.forEach(parte => {
      // Limpar nome
      parte.nome = parte.nome
        .replace(/\t+/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Limpar advogados
      parte.advogados = parte.advogados.map(adv => 
        adv.replace(/\t+/g, '')
           .replace(/\n+/g, ' ')
           .replace(/\s+/g, ' ')
           .trim()
      );
      
      // Remover duplicatas de advogados
      const advogadosUnicos = [];
      parte.advogados.forEach(adv => {
        if (adv && !advogadosUnicos.some(a => a.toLowerCase() === adv.toLowerCase())) {
          advogadosUnicos.push(adv);
        }
      });
      parte.advogados = advogadosUnicos;
      
      // Determinar categoria
      const tipoNormalizado = parte.tipo.toLowerCase();
      let categoria = 'outros';
      
      if (tipoNormalizado.includes('autor') || 
          tipoNormalizado.includes('requerente') || 
          tipoNormalizado.includes('exequente') ||
          tipoNormalizado.includes('impetrante') ||
          tipoNormalizado.includes('embargante') ||
          tipoNormalizado.includes('reclamante')) {
        categoria = 'autores';
      } else if (tipoNormalizado.includes('réu') || 
                 tipoNormalizado.includes('requerido') || 
                 tipoNormalizado.includes('executado') ||
                 tipoNormalizado.includes('impetrado') ||
                 tipoNormalizado.includes('embargado') ||
                 tipoNormalizado.includes('reclamado')) {
        categoria = 'reus';
      }
      
      // Inicializar categoria se necessário
      if (!partes[categoria]) {
        partes[categoria] = [];
      }
      
      // Verificar se a parte já existe na categoria
      const parteExistente = partes[categoria].find(p => 
        p.nome.toLowerCase() === parte.nome.toLowerCase()
      );
      
      if (!parteExistente) {
        // Adicionar parte
        partes[categoria].push(parte);
      }
    });
    
    return {
      dadosBasicos: {
        numero: numeroProcesso,
        classe: classeProcesso,
        assunto: assuntoProcesso,
        foro: foro,
        vara: vara,
        juiz: juiz,
        area: area,
        valorAcao: valorAcao,
        distribuicao: distribuicao
      },
      partes
    };
  });
}

/**
 * Função para extrair movimentações
 */
async function extrairMovimentacoes(page) {
  // Tentar expandir todas as movimentações
  await page.evaluate(() => {
    const botaoTodasMovimentacoes = document.querySelector('a[onclick*="tabelaTodasMovimentacoes"]');
    if (botaoTodasMovimentacoes) {
      console.log('Clicando no botão para mostrar todas as movimentações...');
      botaoTodasMovimentacoes.click();
    }
  });
  
  // Aguardar carregamento
  await page.waitForTimeout(2000);
  
  // Extrair movimentações
  return await page.evaluate(() => {
    const movimentacoes = [];
    
    // Selecionar todas as linhas de movimentação
    const linhasMovimentacao = document.querySelectorAll('tr.containerMovimentacao');
    console.log(`Total de movimentações encontradas: ${linhasMovimentacao.length}`);
    
    // Processar cada linha
    linhasMovimentacao.forEach((linha, index) => {
      // Extrair data
      const dataElement = linha.querySelector('td:first-child');
      const data = dataElement ? dataElement.textContent.trim() : '';
      
      // Extrair descrição
      const descricaoElement = linha.querySelector('.descricaoMovimentacao');
      let descricao = descricaoElement ? descricaoElement.innerHTML : '';
      
      // Limpar a descrição (substituir <br> por quebras de linha)
      descricao = descricao.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
      
      // Adicionar à lista de movimentações
      if (data) {
        movimentacoes.push({ data, descricao });
      }
    });
    
    // Exibir total de movimentações
    console.log(`----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoes.length} -----`);
    
    // Exibir as primeiras 10 movimentações para debug
    movimentacoes.slice(0, 10).forEach((mov, index) => {
      console.log(`${index + 1}. [${mov.data}] ${mov.descricao.substring(0, 30)}...`);
    });
    
    return movimentacoes;
  });
}

// Executar a função principal
consultarProcesso();
