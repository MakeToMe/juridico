require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { salvarDadosProcesso } = require('./importacao/importar-processo');

// Configurações - USANDO AS CREDENCIAIS CORRETAS
const config = {
  url: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '847.698.584-34',
  senha: '8476guardia',
  numeroProcesso: '0701552-85.2024.8.02.0001',
  primeiraParte: '0701552-85.2024',
  ultimaParte: '0001',
  tempoEsperaLogin: 3000, // 3 segundos
  tempoEsperaConsulta: 2000, // 2 segundos
  tempoEsperaVisualizacao: 180000, // 3 minutos
};

// Diretório para salvar os dados
const diretorioDados = path.join(__dirname, '..', 'dados');

// Função principal
async function consultarProcesso() {
  console.log(`Iniciando extração de movimentações do processo ${config.numeroProcesso} no TJAL`);
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Etapa 1: Navegar para a página de login
    await page.goto(config.url);
    console.log('=== ETAPA 1: NAVEGANDO PARA PÁGINA DE LOGIN ===');
    
    // Etapa 2: Preencher credenciais
    console.log('=== ETAPA 2: PREENCHENDO CREDENCIAIS ===');
    await page.fill('#usernameForm', config.usuario);
    await page.fill('#passwordForm', config.senha);
    console.log('Preenchendo credenciais...');
    
    // Etapa 3: Clicar no botão de login
    console.log('=== ETAPA 3: FAZENDO LOGIN ===');
    await page.click('#pbEntrar');
    
    // Aguardar redirecionamento após o login
    await page.waitForTimeout(config.tempoEsperaLogin);
    
    // Etapa 4: Navegar para a página de consulta e preencher o número do processo
    console.log('=== ETAPA 4: CONSULTANDO PROCESSO ===');
    
    // Selecionar opção de número unificado
    await page.evaluate(() => {
      const radioNumeroUnificado = document.querySelector('#radioNumeroUnificado');
      if (radioNumeroUnificado) {
        radioNumeroUnificado.click();
      }
    });
    console.log('Selecionando opção de número unificado...');
    
    // Preencher o número do processo (primeira parte)
    await page.fill('#numeroDigitoAnoUnificado', config.primeiraParte);
    
    // Preencher a última parte do número do processo
    await page.fill('#foroNumeroUnificado', config.ultimaParte);
    
    console.log(`Preenchendo número do processo: Primeira parte="${config.primeiraParte}", Última parte="${config.ultimaParte}"`);
    
    // Clicar no botão de consulta
    await page.click('#botaoConsultarProcessos');
    console.log('Clicando no botão de consulta...');
    
    // Aguardar carregamento da página de detalhes
    console.log('Aguardando carregamento da página de detalhes...');
    await page.waitForSelector('#tableTodasPartes, #tablePartesPrincipais', { timeout: 30000 });
    
    // Aguardar um pouco mais para garantir que a página carregou completamente
    console.log('Aguardando 2 segundos para garantir que a página carregou completamente...');
    await page.waitForTimeout(config.tempoEsperaConsulta);
    
    console.log('Página de detalhes do processo carregada com sucesso!');
    
    // Etapa 5: Extrair movimentações
    console.log('=== ETAPA 5: EXTRAINDO MOVIMENTAÇÕES ===');
    console.log('Extraindo movimentações...');
    
    // Extrair dados do processo e movimentações
    const dadosProcesso = await extrairDadosProcesso(page);
    const movimentacoes = await extrairMovimentacoes(page);
    
    // Criar objeto com todos os dados
    const dadosCompletos = {
      processo: dadosProcesso.dadosBasicos,
      partes: dadosProcesso.partes,
      movimentacoes
    };
    
    // Salvar os dados em um arquivo JSON com o número do processo no nome
    const caminhoJson = salvarDadosProcesso('TJAL', dadosCompletos, diretorioDados);
    
    console.log(`Movimentações salvas em ${caminhoJson}`);
    
    // Aguardar para visualização manual
    console.log(`\nAguardando ${config.tempoEsperaVisualizacao / 1000} segundos (${config.tempoEsperaVisualizacao / 60000} minutos) para visualização manual...`);
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
    
    // Abordagem 2: Procurar por todos os elementos que podem conter 'Autor' ou 'Réu'
    const todosAutores = [];
    const todosReus = [];
    
    // Procurar por todos os elementos que podem conter 'Autor' ou 'Réu'
    const todosElementos = document.querySelectorAll('*');
    
    for (let i = 0; i < todosElementos.length; i++) {
      const elemento = todosElementos[i];
      const texto = elemento.textContent.trim();
      
      // Se encontramos um elemento com 'Autor' ou outros tipos de parte autora
      if (texto === 'Autor' || texto === 'Requerente' || texto === 'Exequente' || texto === 'Impetrante' || texto === 'Embargante' || texto === 'Reclamante') {
        // Verificar o próximo elemento irmão ou o próximo elemento na DOM
        let proximoElemento = elemento.nextElementSibling;
        if (!proximoElemento && i + 1 < todosElementos.length) {
          proximoElemento = todosElementos[i + 1];
        }
        
        if (proximoElemento) {
          const textoProximo = proximoElemento.textContent.trim();
          if (textoProximo && !textoProximo.includes('Autor') && !textoProximo.includes('Réu')) {
            // Extrair nome e advogados
            let nome = textoProximo;
            let advogados = [];
            
            // Verificar se o texto contém informações de advogado (Advogado ou Advogada)
            if (textoProximo.includes('Advogado:') || textoProximo.includes('Advogada:')) {
              let partes = [];
              if (textoProximo.includes('Advogado:')) {
                partes = textoProximo.split('Advogado:');
              } else if (textoProximo.includes('Advogada:')) {
                partes = textoProximo.split('Advogada:');
              }
              
              nome = partes[0].trim();
              
              // Extrair advogados
              const textoAdvogados = partes.slice(1).join(' ');
              advogados = textoAdvogados.split(/Advogado:|Advogada:|e\s+\d+\.\d+\.\d+-\d+/g)
                .map(adv => adv.trim())
                .filter(adv => adv);
            }
            
            // Limpar o nome de caracteres de tabulação e quebras de linha
            nome = nome.replace(/\t+/g, '');
            nome = nome.replace(/\n+/g, ' ');
            nome = nome.replace(/\s+/g, ' '); // Substituir múltiplos espaços por um único
            nome = nome.trim();
            
            // Adicionar ao array de autores
            if (nome) {
              const autorExistente = todosAutores.find(a => a.nome === nome);
              if (!autorExistente) {
                todosAutores.push({
                  tipo: 'Autor',
                  nome,
                  advogados
                });
              }
            }
          }
        }
      }
      
      // Se encontramos um elemento com 'Réu' ou outros tipos de parte ré
      if (texto === 'Réu' || texto === 'Requerido' || texto === 'Executado' || texto === 'Impetrado' || texto === 'Embargado' || texto === 'Reclamado') {
        // Verificar o próximo elemento irmão ou o próximo elemento na DOM
        let proximoElemento = elemento.nextElementSibling;
        if (!proximoElemento && i + 1 < todosElementos.length) {
          proximoElemento = todosElementos[i + 1];
        }
        
        if (proximoElemento) {
          const textoProximo = proximoElemento.textContent.trim();
          if (textoProximo && !textoProximo.includes('Autor') && !textoProximo.includes('Réu')) {
            // Extrair nome e advogados
            let nome = textoProximo;
            let advogados = [];
            
            // Verificar se o texto contém informações de advogado (Advogado ou Advogada)
            if (textoProximo.includes('Advogado:') || textoProximo.includes('Advogada:')) {
              let partes = [];
              if (textoProximo.includes('Advogado:')) {
                partes = textoProximo.split('Advogado:');
              } else if (textoProximo.includes('Advogada:')) {
                partes = textoProximo.split('Advogada:');
              }
              
              nome = partes[0].trim();
              
              // Extrair advogados
              const textoAdvogados = partes.slice(1).join(' ');
              advogados = textoAdvogados.split(/Advogado:|Advogada:|e\s+\d+\.\d+\.\d+-\d+/g)
                .map(adv => adv.trim())
                .filter(adv => adv);
            }
            
            // Limpar o nome de caracteres de tabulação e quebras de linha
            nome = nome.replace(/\t+/g, '');
            nome = nome.replace(/\n+/g, ' ');
            nome = nome.replace(/\s+/g, ' '); // Substituir múltiplos espaços por um único
            nome = nome.trim();
            
            // Adicionar ao array de réus
            if (nome) {
              const reuExistente = todosReus.find(r => r.nome === nome);
              if (!reuExistente) {
                todosReus.push({
                  tipo: 'Réu',
                  nome,
                  advogados
                });
              }
            }
          }
        }
      }
    }
    
    // Combinar resultados das duas abordagens
    for (const autor of todosAutores) {
      const autorExistente = partesArray.find(p => p.nome === autor.nome && (p.tipo === 'Autor' || p.tipo === autor.tipo));
      if (!autorExistente) {
        partesArray.push(autor);
      }
    }
    
    for (const reu of todosReus) {
      const reuExistente = partesArray.find(p => p.nome === reu.nome && (p.tipo === 'Réu' || p.tipo === reu.tipo));
      if (!reuExistente) {
        partesArray.push(reu);
      }
    }
    
    // Organizar partes por tipo e remover duplicações
    const partes = {};
    const partesProcessadas = {};
    
    // Primeiro, limpar todos os nomes e extrair advogados
    partesArray.forEach(parte => {
      let nome = parte.nome;
      
      // Limpar o nome para remover caracteres de tabulação e quebras de linha
      if (nome) {
        nome = nome.replace(/\t+/g, '');
        nome = nome.replace(/\n+/g, ' ');
        nome = nome.replace(/\s+/g, ' '); // Substituir múltiplos espaços por um único
        nome = nome.trim();
        
        // Se o nome ainda contém 'Advogado:' ou 'Advogada:', limpar novamente
        if (nome.includes('Advogado:') || nome.includes('Advogada:')) {
          const partes = nome.split(/Advogado:|Advogada:/);
          nome = partes[0].trim();
          
          // Extrair advogados se ainda não foram extraídos
          if (!parte.advogados || parte.advogados.length === 0) {
            const textoAdvogados = partes.slice(1).join(' ');
            parte.advogados = textoAdvogados.split(/Advogado:|Advogada:|e\s+\d+\.\d+\.\d+-\d+/g)
              .map(adv => adv.trim())
              .filter(adv => adv);
          }
        }
        
        // Atualizar o nome limpo
        parte.nome = nome;
      }
    });
    
    // Agora organizar as partes por categoria
    partesArray.forEach(parte => {
      const tipoNormalizado = parte.tipo.toLowerCase();
      const nome = parte.nome;
      
      // Limpar e normalizar advogados
      if (parte.advogados && parte.advogados.length > 0) {
        parte.advogados = parte.advogados.map(adv => {
          // Limpar advogado
          return adv.replace(/\t+/g, '')
                   .replace(/\n+/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim();
        });
        
        // Remover duplicatas
        const advogadosUnicos = [];
        parte.advogados.forEach(adv => {
          if (!advogadosUnicos.some(a => a.toLowerCase() === adv.toLowerCase())) {
            advogadosUnicos.push(adv);
          }
        });
        parte.advogados = advogadosUnicos;
      }
      
      // Determinar a categoria da parte
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
      
      // Inicializar a categoria se não existir
      if (!partes[categoria]) {
        partes[categoria] = [];
      }
      
      // Verificar se já temos esta parte na categoria (evitar duplicação)
      const chave = `${categoria}:${nome}`;
      if (!partesProcessadas[chave]) {
        partesProcessadas[chave] = true;
        
        partes[categoria].push({
          tipo: parte.tipo,
          nome: nome,
          advogados: parte.advogados || []
        });
      } else {
        // Se a parte já existe, verificar se há novos advogados para adicionar
        const parteExistente = partes[categoria].find(p => p.nome === nome);
        if (parteExistente && parte.advogados && parte.advogados.length > 0) {
          // Adicionar advogados que ainda não estão na lista
          parte.advogados.forEach(adv => {
            if (!parteExistente.advogados.some(a => a.toLowerCase() === adv.toLowerCase())) {
              parteExistente.advogados.push(adv);
            }
          });
        }
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
  
  // Antes de extrair as movimentações, vamos salvar o HTML da página para debug
  await page.evaluate(() => {
    // Criar um elemento para armazenar o HTML
    const htmlContent = document.documentElement.outerHTML;
    // Armazenar no localStorage para debug
    localStorage.setItem('paginaHTML', htmlContent);
  });
  
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
