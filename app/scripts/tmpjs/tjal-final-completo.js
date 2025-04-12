/**
 * Script final para extrair todas as movimentações de um processo no TJAL
 * e salvar no Supabase
 */

const { chromium } = require('playwright');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const dotenv = require('dotenv');
// Carregar variáveis de ambiente do arquivo .env.local
dotenv.config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não encontradas!');
  console.error('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas no arquivo .env.local');
  process.exit(1);
}

console.log(`Conectando ao Supabase: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey);

// ID da empresa
const EMPRESA_UID = '807d031b-d08e-492e-94ba-428b28fb604e';

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// Credenciais para acesso ao TJAL
const credenciais = {
  site: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '847.698.584-34',
  senha: '8476guardia'
};

/**
 * Função para limpar texto (remover espaços extras, quebras de linha, etc.)
 */
function limparTexto(texto) {
  if (!texto) return '';
  return texto.replace(/\s+/g, ' ').trim();
}

/**
 * Função para extrair dados do processo
 */
async function extrairDadosProcesso(page) {
  return await page.evaluate(() => {
    // Função para extrair texto de um seletor
    function extrairTexto(seletor) {
      const elemento = document.querySelector(seletor);
      return elemento ? elemento.textContent.trim() : '';
    }
    
    // Função para limpar texto
    function limparTexto(texto) {
      if (!texto) return '';
      return texto.replace(/\s+/g, ' ').trim();
    }
    
    // Extrair dados básicos do processo
    const numeroProcesso = extrairTexto('#numeroProcesso');
    const classeProcesso = extrairTexto('#classeProcesso');
    const assuntoProcesso = extrairTexto('#assuntoProcesso');
    const dataDistribuicao = extrairTexto('#dataDistribuicao');
    const juiz = extrairTexto('#juiz');
    const valorAcao = extrairTexto('#valorAcao');
    
    // Extrair partes do processo
    const partes = [];
    const secaoPartes = document.querySelector('#tablePartesPrincipais, #tableTodasPartes');
    
    if (secaoPartes) {
      const linhasPartes = secaoPartes.querySelectorAll('tr');
      
      for (const linha of linhasPartes) {
        const colunas = linha.querySelectorAll('td, th');
        
        if (colunas.length >= 2) {
          const tipo = limparTexto(colunas[0].textContent);
          let nome = limparTexto(colunas[1].textContent);
          
          // Separar nome da parte e advogados
          let advogados = [];
          if (nome.includes('Advogado:')) {
            const partes = nome.split('Advogado:');
            nome = limparTexto(partes[0]);
            
            // Extrair múltiplos advogados se existirem
            const textoAdvogados = partes.slice(1).join('Advogado:');
            advogados = textoAdvogados.split(/Advogado:|e\s+\d+\.\d+\.\d+-\d+/g)
              .map(adv => limparTexto(adv))
              .filter(adv => adv);
          }
          
          if (tipo && nome) {
            partes.push({
              tipo,
              nome,
              advogados
            });
          }
        }
      }
    }
    
    return {
      numeroProcesso,
      classeProcesso,
      assuntoProcesso,
      dataDistribuicao,
      juiz,
      valorAcao,
      partes
    };
  });
}

/**
 * Função para extrair movimentações
 */
async function extrairMovimentacoes(page) {
  // Adicionar um script para expandir todas as movimentações
  await page.evaluate(() => {
    // Tentar expandir todas as movimentações se houver um botão para isso
    const botaoTodasMovimentacoes = document.querySelector('a[onclick*="tabelaTodasMovimentacoes"]');
    if (botaoTodasMovimentacoes) {
      console.log('Clicando no botão para mostrar todas as movimentações...');
      botaoTodasMovimentacoes.click();
    }
  });
  
  // Aguardar um momento para que as movimentações sejam carregadas
  await page.waitForTimeout(2000);
  
  // Clicar em cada link de movimentação para expandir detalhes, se houver
  await page.evaluate(() => {
    const linksExpansao = document.querySelectorAll('a[onclick*="abrirMovimentacao"]');
    console.log(`Encontrados ${linksExpansao.length} links de expansão de movimentações.`);
    
    linksExpansao.forEach(link => {
      try {
        link.click();
      } catch (e) {
        console.log('Erro ao clicar em link de expansão:', e);
      }
    });
  });
  
  // Aguardar um momento para que os detalhes sejam carregados
  await page.waitForTimeout(2000);
  
  // Agora extrair as movimentações
  return await page.evaluate(() => {
    const movimentacoes = [];
    console.log('Iniciando extração de movimentações...');
    
    // Obter a tabela de movimentações
    const tabela = document.querySelector('#tabelaTodasMovimentacoes, #tabelaUltimasMovimentacoes');
    
    if (!tabela) {
      console.log('Tabela de movimentações não encontrada!');
      return [];
    }
    
    console.log('Tabela de movimentações encontrada.');
    
    // Obter todas as linhas de movimentação
    const linhas = tabela.querySelectorAll('tr.containerMovimentacao');
    console.log(`Encontradas ${linhas.length} linhas de movimentação.`);
    
    // Para cada linha, extrair data e descrição
    linhas.forEach((linha, index) => {
      try {
        // Extrair data da coluna com classe dataMovimentacao
        const colData = linha.querySelector('td.dataMovimentacao');
        // Extrair descrição usando o seletor .descricaoMovimentacao
        const colDescricao = linha.querySelector('.descricaoMovimentacao');
        
        if (colData) {
          const data = colData.textContent.trim();
          // Se encontrou o elemento com classe descricaoMovimentacao, usar ele
          // Caso contrário, tentar pegar da segunda coluna
          let descricao = '';
          if (colDescricao) {
            descricao = colDescricao.textContent.trim().replace(/\s+/g, ' ');
          } else {
            const segundaColuna = linha.querySelectorAll('td')[1];
            if (segundaColuna) {
              descricao = segundaColuna.textContent.trim().replace(/\s+/g, ' ');
            }
          }
          
          // Verificar se a data está no formato correto (DD/MM/AAAA)
          if (data.match(/\d{2}\/\d{2}\/\d{4}/)) {
            movimentacoes.push({ data, descricao });
            console.log(`Movimentação ${index + 1}: Data=${data}, Descrição=${descricao ? descricao.substring(0, 50) + '...' : 'N/A'}`);
          }
        }
      } catch (e) {
        console.log(`Erro ao processar linha ${index + 1}:`, e);
      }
    });
    
    // Se não encontrou movimentações, tentar uma abordagem alternativa
    if (movimentacoes.length === 0) {
      console.log('Tentando abordagem alternativa para extração de movimentações...');
      
      // Procurar por qualquer tabela que contenha movimentações
      const todasTabelas = document.querySelectorAll('table');
      
      todasTabelas.forEach((tabela, idxTabela) => {
        console.log(`Analisando tabela ${idxTabela + 1}...`);
        
        // Verificar se a tabela tem linhas
        const linhas = tabela.querySelectorAll('tr');
        
        if (linhas.length > 1) { // Pelo menos uma linha além do cabeçalho
          console.log(`Tabela ${idxTabela + 1} tem ${linhas.length} linhas.`);
          
          // Verificar cada linha
          linhas.forEach((linha, idxLinha) => {
            // Pular a primeira linha (geralmente é o cabeçalho)
            if (idxLinha === 0) return;
            
            const colunas = linha.querySelectorAll('td');
            
            if (colunas.length >= 2) {
              const dataTexto = colunas[0].textContent.trim();
              
              // Verificar se a primeira coluna parece uma data (DD/MM/AAAA)
              if (dataTexto.match(/\d{2}\/\d{2}\/\d{4}/)) {
                const data = dataTexto;
                const descricao = colunas[1].textContent.trim();
                
                movimentacoes.push({ data, descricao });
                console.log(`Movimentação alternativa ${movimentacoes.length}: Data=${data}, Descrição=${descricao.substring(0, 50)}...`);
              }
            }
          });
        }
      });
    }
    
    console.log(`Total de ${movimentacoes.length} movimentações extraídas.`);
    return movimentacoes;
  });
}

/**
 * Função para processar as movimentações
 */
function processarMovimentacoes(movimentacoes) {
  // Mapear por data para manter apenas as entradas com descrição
  const mapaPorData = new Map();
  
  for (const mov of movimentacoes) {
    if (!mov.data) continue;
    
    // Se a descrição estiver vazia, ignorar a menos que não tenhamos nada para esta data
    if (!mov.descricao && mapaPorData.has(mov.data)) continue;
    
    // Se já temos uma entrada para esta data e a atual tem descrição, atualizar
    if (mapaPorData.has(mov.data)) {
      const movExistente = mapaPorData.get(mov.data);
      if (!movExistente.descricao && mov.descricao) {
        mapaPorData.set(mov.data, mov);
      }
    } else {
      mapaPorData.set(mov.data, mov);
    }
  }
  
  // Converter o mapa de volta para array
  const movimentacoesProcessadas = Array.from(mapaPorData.values());
  
  // Ordenar por data (mais recente primeiro)
  movimentacoesProcessadas.sort((a, b) => {
    const dataA = a.data.split('/').reverse().join('');
    const dataB = b.data.split('/').reverse().join('');
    return dataB.localeCompare(dataA);
  });
  
  return movimentacoesProcessadas;
}

/**
 * Salva os dados do processo no Supabase
 */
async function salvarProcessoSupabase(dadosProcesso, movimentacoes) {
  try {
    console.log('\n=== SALVANDO DADOS NO SUPABASE ===');
    
    // Inserir o processo na tabela processos
    const { data: processo, error: processoError } = await supabase
      .from('alnpp.processos')
      .insert([
        {
          tribunal: 'TJAL',
          comarca: '',
          processo: dadosProcesso.numeroProcesso,
          vara: '',
          classe: dadosProcesso.classeProcesso,
          assunto: dadosProcesso.assuntoProcesso,
          juiz: dadosProcesso.juiz,
          autor: dadosProcesso.partes.filter(p => p.tipo.includes('Autor')).map(p => p.nome),
          adv_autor: dadosProcesso.partes.filter(p => p.tipo.includes('Autor')).flatMap(p => p.advogados),
          empresa: EMPRESA_UID
        }
      ])
      .select();
    
    if (processoError) {
      throw new Error(`Erro ao salvar processo: ${processoError.message}`);
    }
    
    console.log(`Processo salvo com sucesso! UID: ${processo[0].uid}`);
    
    // Inserir as movimentações na tabela movimentacoes
    if (movimentacoes && movimentacoes.length > 0) {
      // Filtrar apenas movimentações com descrição
      const movimentacoesComDescricao = movimentacoes.filter(mov => mov.descricao);
      
      if (movimentacoesComDescricao.length > 0) {
        const movimentacoesParaInserir = movimentacoesComDescricao.map(mov => ({
          processo_uid: processo[0].uid,
          data: mov.data ? new Date(mov.data.split('/').reverse().join('-')) : null,
          movimentacao: mov.descricao,
          empresa: EMPRESA_UID
        }));
        
        const { data: movs, error: movsError } = await supabase
          .from('alnpp.movimentacoes')
          .insert(movimentacoesParaInserir);
        
        if (movsError) {
          throw new Error(`Erro ao salvar movimentações: ${movsError.message}`);
        }
        
        console.log(`${movimentacoesParaInserir.length} movimentações salvas com sucesso!`);
      } else {
        console.log('Nenhuma movimentação com descrição para salvar.');
      }
    } else {
      console.log('Nenhuma movimentação para salvar.');
    }
    
    return processo[0].uid;
  } catch (error) {
    console.error('Erro ao salvar dados no Supabase:', error);
    return null;
  }
}

/**
 * Função principal para extrair movimentações do TJAL
 */
async function extrairMovimentacoesTJAL() {
  console.log(`Iniciando extração de movimentações do processo ${NUMERO_PROCESSO} no TJAL...`);
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-dev-shm-usage'],
    timeout: 60000,
  });
  
  let page;
  
  try {
    console.log('Configurando contexto do navegador...');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      ignoreHTTPSErrors: true,
      navigationTimeout: 90000,
      timeout: 90000
    });
    
    page = await context.newPage();
    
    // ETAPA 1: FAZER LOGIN
    console.log('\n=== ETAPA 1: FAZENDO LOGIN ===');
    console.log(`Navegando para a página de login: ${credenciais.site}`);
    await page.goto(credenciais.site);
    
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    
    console.log('Clicando no botão de login...');
    await page.click('#pbEntrar');
    
    // Aguardar apenas 3 segundos após o login
    console.log('Aguardando 3 segundos após o login...');
    await page.waitForTimeout(3000);
    
    // ETAPA 2: NAVEGAR PARA PÁGINA DE CONSULTA
    console.log('\n=== ETAPA 2: NAVEGANDO PARA PÁGINA DE CONSULTA ===');
    const urlConsulta = 'https://www2.tjal.jus.br/cpopg/open.do';
    console.log(`Navegando para a página de consulta: ${urlConsulta}`);
    await page.goto(urlConsulta);
    
    console.log('Página de consulta carregada com sucesso.');
    
    // ETAPA 3: PREENCHER DADOS DO PROCESSO
    console.log('\n=== ETAPA 3: PREENCHENDO DADOS DO PROCESSO ===');
    console.log('Selecionando opção de número unificado...');
    await page.click('#radioNumeroUnificado');
    
    // Olhando a imagem, preciso preencher exatamente:
    // Primeiro campo: "0727108-89.2024"
    // Último campo: "0001"
    
    console.log('Preenchendo o número do processo exatamente como na imagem');
    const primeiroCampo = '0727108-89.2024';
    const ultimoCampo = '0001';
    
    console.log(`Preenchendo número do processo: Primeira parte="${primeiroCampo}", Última parte="${ultimoCampo}"`);
    
    // Preencher os campos do número do processo exatamente como na imagem
    await page.fill('#numeroDigitoAnoUnificado', primeiroCampo);
    await page.fill('#foroNumeroUnificado', ultimoCampo);
    
    // ETAPA 4: CONSULTAR PROCESSO
    console.log('\n=== ETAPA 4: CONSULTANDO PROCESSO ===');
    console.log('Clicando no botão de consulta...');
    await page.click('#botaoConsultarProcessos');
    
    console.log('Aguardando carregamento da página de detalhes...');
    
    // Aumentar o timeout para 60 segundos e aguardar com mais segurança
    try {
      await page.waitForSelector('#containerDadosPrincipaisProcesso', { timeout: 60000 });
    } catch (error) {
      console.log('Timeout ao aguardar seletor de dados do processo, mas vamos continuar...');
    }
    
    // Aguardar mais 5 segundos para garantir que a página carregou completamente
    console.log('Aguardando mais 5 segundos para garantir que a página carregou completamente...');
    await page.waitForTimeout(5000);
    
    console.log('Página de detalhes do processo carregada com sucesso!');
    
    // ETAPA 5: EXTRAIR DADOS E MOVIMENTAÇÕES
    console.log('\n=== ETAPA 5: EXTRAINDO MOVIMENTAÇÕES ===');
    
    // Salvar HTML da página para análise
    console.log('Salvando HTML da página para análise...');
    const htmlContent = await page.content();
    fs.writeFileSync('pagina-tjal.html', htmlContent);
    
    // Tirar screenshot da página
    console.log('Tirando screenshot da página...');
    await page.screenshot({ path: 'pagina-tjal.png', fullPage: true });
    
    // Extrair dados do processo
    const dadosProcesso = await extrairDadosProcesso(page);
    
    // Extrair movimentações
    console.log('Extraindo movimentações usando o seletor tr.containerMovimentacao...');
    const movimentacoesRaw = await extrairMovimentacoes(page);
    
    // Processar movimentações
    const movimentacoes = processarMovimentacoes(movimentacoesRaw);
    
    console.log(`\n----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoes.length} -----`);
    movimentacoes.forEach((mov, index) => {
      console.log(`${index + 1}. [${mov.data}] ${mov.descricao.substring(0, 50)}${mov.descricao.length > 50 ? '...' : ''}`);
    });
    
    // Salvar movimentações em arquivo JSON
    console.log('Salvando movimentações em arquivo JSON...');
    try {
      // Garantir que os dados estão em formato válido para JSON
      const dadosProcessoLimpos = JSON.parse(JSON.stringify(dadosProcesso));
      const movimentacoesLimpas = JSON.parse(JSON.stringify(movimentacoes));
      
      // Criar objeto para salvar
      const dadosParaSalvar = {
        dadosProcesso: dadosProcessoLimpos,
        movimentacoes: movimentacoesLimpas
      };
      
      // Salvar em arquivo
      fs.writeFileSync('movimentacoes-extraidas.json', JSON.stringify(dadosParaSalvar, null, 2));
      console.log('Arquivo JSON salvo com sucesso!');
    } catch (error) {
      console.error(`Erro ao salvar arquivo JSON: ${error.message}`);
      // Tentar salvar de forma simplificada
      fs.writeFileSync('movimentacoes-extraidas-simples.json', JSON.stringify({
        numeroProcesso: dadosProcesso.numeroProcesso || '',
        totalMovimentacoes: movimentacoes.length
      }));
      console.log('Arquivo JSON simplificado salvo como backup.');
    }
    
    console.log('\nMovimentações salvas em movimentacoes-extraidas.json');
    
    // ETAPA 6: SALVAR NO SUPABASE
    await salvarProcessoSupabase(dadosProcesso, movimentacoes);
    
    // Manter o navegador aberto por um tempo para visualização
    console.log('\nAguardando 180 segundos (3 minutos) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    await page.waitForTimeout(180000); // 3 minutos
    
    return {
      dadosProcesso,
      movimentacoes
    };
  } catch (error) {
    console.error(`Erro durante a extração: ${error.message}`);
    console.error(error.stack); // Mostrar a pilha de erros completa para depuração
    
    // Tentar salvar screenshot do erro
    try {
      await page.screenshot({ path: 'erro.png' });
      console.log('Screenshot do erro salvo como erro.png');
      
      // Aguardar 10 segundos antes de fechar para poder ver o erro
      console.log('Aguardando 10 segundos antes de fechar para visualização do erro...');
      await page.waitForTimeout(10000);
    } catch (screenshotError) {
      console.error(`Erro ao salvar screenshot: ${screenshotError.message}`);
    }
    
    throw error;
  } finally {
    // Fechar o navegador apenas se não houver erro
    if (!process.exitCode) {
      await browser.close();
      console.log('Navegador fechado.');
    } else {
      console.log('Mantendo o navegador aberto devido a erro.');
    }
  }
}

// Executar a extração de movimentações
extrairMovimentacoesTJAL()
  .then(() => {
    console.log('Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  });
