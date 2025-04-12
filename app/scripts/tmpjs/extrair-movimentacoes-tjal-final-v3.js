/**
 * Script final para extrair todas as movimentações de um processo no TJAL
 * e salvar diretamente no Supabase usando a chave de serviço
 * Versão 3 - Com correção do ID da empresa
 */

const { chromium } = require('playwright');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// URL direta do processo
const URL_PROCESSO = `https://www2.tjal.jus.br/cpopg/show.do?processo.codigo=01001NT870000&processo.foro=1&processo.numero=${NUMERO_PROCESSO}`;

// ID correto da empresa
const EMPRESA_UID = '807d031b-d08e-492e-94ba-428b28fb604e';

// Configuração do Supabase com a chave de serviço
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Criar cliente Supabase com a chave de serviço (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'alnpp' }
});

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
 * Função para extrair movimentações do HTML usando regex
 */
function extrairMovimentacoesDoHTML(html) {
  const movimentacoes = [];
  
  // Regex para encontrar tabelas de movimentações
  const regexTabela = /<table[^>]*id=["']?(tabelaTodasMovimentacoes|tabelaUltimasMovimentacoes)["']?[^>]*>([\s\S]*?)<\/table>/gi;
  const matchTabela = regexTabela.exec(html);
  
  if (matchTabela) {
    const conteudoTabela = matchTabela[0];
    
    // Regex para extrair linhas da tabela
    const regexLinhas = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let matchLinha;
    
    while ((matchLinha = regexLinhas.exec(conteudoTabela)) !== null) {
      const conteudoLinha = matchLinha[1];
      
      // Regex para extrair células da linha
      const regexCelulas = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const celulas = [];
      let matchCelula;
      
      while ((matchCelula = regexCelulas.exec(conteudoLinha)) !== null) {
        // Remover tags HTML da célula
        const conteudoCelula = matchCelula[1].replace(/<[^>]*>/g, ' ');
        celulas.push(limparTexto(conteudoCelula));
      }
      
      // Se temos pelo menos duas células (data e descrição)
      if (celulas.length >= 2) {
        const data = celulas[0];
        const descricao = celulas[1];
        
        // Verificar se a primeira célula parece uma data (DD/MM/AAAA)
        if (data.match(/\d{2}\/\d{2}\/\d{4}/)) {
          movimentacoes.push({ data, descricao });
        }
      }
    }
  }
  
  // Se não encontrou movimentações na tabela, tentar outra abordagem
  if (movimentacoes.length === 0) {
    // Regex mais genérica para encontrar padrões de data seguidos por descrição
    const regexMovimentacao = /<td[^>]*>(\d{2}\/\d{2}\/\d{4})<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
    let match;
    
    while ((match = regexMovimentacao.exec(html)) !== null) {
      const data = match[1].trim();
      // Limpar a descrição (remover tags HTML e espaços extras)
      let descricao = match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      if (data && descricao) {
        movimentacoes.push({ data, descricao });
      }
    }
  }
  
  return movimentacoes;
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
 * Função para limpar e processar as movimentações
 */
function processarMovimentacoes(movimentacoes) {
  // Mapear por data para incluir todas as entradas
  const mapaPorData = new Map();
  
  for (const mov of movimentacoes) {
    if (!mov.data) continue;
    
    // Se já temos uma entrada para esta data e a atual tem descrição, atualizar
    if (mapaPorData.has(mov.data)) {
      const movExistente = mapaPorData.get(mov.data);
      // Preferir entradas com descrição
      if ((!movExistente.descricao || movExistente.descricao === '') && mov.descricao && mov.descricao !== '') {
        mapaPorData.set(mov.data, mov);
      }
    } else {
      // Sempre adicionar a movimentação se não temos nenhuma para esta data
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
 * Função para salvar dados no Supabase
 */
async function salvarDadosNoSupabase(dadosProcesso, movimentacoes) {
  try {
    console.log('\n=== SALVANDO DADOS NO SUPABASE ===');
    
    // Adicionar o ID da empresa aos dados do processo
    console.log(`Usando ID da empresa: ${EMPRESA_UID}`);
    
    // Verificar se o processo já existe
    console.log(`Verificando se o processo ${dadosProcesso.numeroProcesso} já existe...`);
    const { data: processoExistente, error: erroConsulta } = await supabase
      .from('processos')
      .select('uid')
      .eq('processo', dadosProcesso.numeroProcesso)
      .single();
    
    let processoUid;
    
    if (erroConsulta && erroConsulta.code !== 'PGRST116') {
      console.error('Erro ao consultar processo:', erroConsulta);
      throw new Error(`Erro ao consultar processo: ${erroConsulta.message}`);
    }
    
    if (processoExistente) {
      console.log(`Processo ${dadosProcesso.numeroProcesso} já existe no banco de dados.`);
      processoUid = processoExistente.uid;
      
      // Atualizar o processo existente
      console.log('Atualizando dados do processo...');
      const { error: erroAtualizacao } = await supabase
        .from('processos')
        .update({
          classe: dadosProcesso.classeProcesso,
          assunto: dadosProcesso.assuntoProcesso,
          juiz: dadosProcesso.juiz
        })
        .eq('uid', processoUid);
      
      if (erroAtualizacao) {
        console.error('Erro ao atualizar processo:', erroAtualizacao);
        throw new Error(`Erro ao atualizar processo: ${erroAtualizacao.message}`);
      }
      
      console.log('Processo atualizado com sucesso!');
    } else {
      console.log(`Inserindo novo processo ${dadosProcesso.numeroProcesso}...`);
      
      // Extrair advogados do autor
      const advogadosAutor = dadosProcesso.partes
        .filter(p => p.tipo.includes('Autor'))
        .flatMap(p => p.advogados);
      
      // Extrair nomes dos autores
      const autores = dadosProcesso.partes
        .filter(p => p.tipo.includes('Autor'))
        .map(p => p.nome);
      
      // Inserir novo processo
      const { data: novoProcesso, error: erroInsercao } = await supabase
        .from('processos')
        .insert({
          tribunal: 'TJAL',
          processo: dadosProcesso.numeroProcesso,
          classe: dadosProcesso.classeProcesso,
          assunto: dadosProcesso.assuntoProcesso,
          juiz: dadosProcesso.juiz,
          autor: autores,
          adv_autor: advogadosAutor,
          empresa: EMPRESA_UID  // Usar o ID correto da empresa
        })
        .select();
      
      if (erroInsercao) {
        console.error('Erro ao inserir processo:', erroInsercao);
        throw new Error(`Erro ao inserir processo: ${erroInsercao.message}`);
      }
      
      if (!novoProcesso || novoProcesso.length === 0) {
        console.error('Erro: Não foi possível obter o UID do processo inserido');
        throw new Error('Não foi possível obter o UID do processo inserido');
      }
      
      processoUid = novoProcesso[0].uid;
      console.log(`Processo inserido com sucesso! UID: ${processoUid}`);
    }
    
    // Inserir as movimentações na tabela movimentacoes
    if (movimentacoes && movimentacoes.length > 0) {
      // Usar todas as movimentações, mesmo sem descrição
      const movimentacoesComDescricao = movimentacoes;
      
      if (movimentacoesComDescricao.length > 0) {
        console.log(`Inserindo ${movimentacoesComDescricao.length} movimentações...`);
        
        // Obter movimentações existentes para evitar duplicatas
        const { data: movimentacoesExistentes, error: erroConsultaMovs } = await supabase
          .from('movimentacoes')
          .select('data, movimentacao')
          .eq('processo_uid', processoUid);
        
        if (erroConsultaMovs) {
          console.error('Erro ao consultar movimentações existentes:', erroConsultaMovs);
          throw new Error(`Erro ao consultar movimentações existentes: ${erroConsultaMovs.message}`);
        }
        
        // Criar um conjunto para verificar duplicatas
        const movimentacoesExistentesSet = new Set();
        if (movimentacoesExistentes) {
          movimentacoesExistentes.forEach(mov => {
            const dataFormatada = mov.data ? new Date(mov.data).toISOString().split('T')[0] : '';
            const chave = `${dataFormatada}|${mov.movimentacao}`;
            movimentacoesExistentesSet.add(chave);
          });
        }
        
        // Preparar movimentações para inserção, evitando duplicatas
        const movimentacoesParaInserir = [];
        
        for (const mov of movimentacoesComDescricao) {
          if (!mov.data) continue;
          
          // Garantir que a descrição nunca seja null
          const descricao = mov.descricao || '';
          
          // Converter data de DD/MM/AAAA para AAAA-MM-DD
          const partesData = mov.data.split('/');
          const dataFormatada = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
          
          // Verificar se já existe
          const chave = `${dataFormatada}|${descricao}`;
          if (movimentacoesExistentesSet.has(chave)) {
            console.log(`Movimentação já existe: ${mov.data} - ${descricao}`);
            continue;
          }
          
          movimentacoesParaInserir.push({
            processo_uid: processoUid,
            data: dataFormatada,
            movimentacao: descricao,
            empresa: EMPRESA_UID,  // Usar o ID correto da empresa
            processo: dadosProcesso.numeroProcesso
          });
        }
        
        if (movimentacoesParaInserir.length > 0) {
          const { data: movs, error: erroInsercaoMovs } = await supabase
            .from('movimentacoes')
            .insert(movimentacoesParaInserir)
            .select();
          
          if (erroInsercaoMovs) {
            console.error('Erro ao inserir movimentações:', erroInsercaoMovs);
            throw new Error(`Erro ao inserir movimentações: ${erroInsercaoMovs.message}`);
          }
          
          console.log(`${movimentacoesParaInserir.length} movimentações inseridas com sucesso!`);
        } else {
          console.log('Nenhuma movimentação nova para inserir.');
        }
      } else {
        console.log('Nenhuma movimentação com descrição para salvar.');
      }
    } else {
      console.log('Nenhuma movimentação para salvar.');
    }
    
    console.log('\nDados salvos com sucesso no Supabase!');
    return processoUid;
  } catch (error) {
    console.error('Erro ao salvar dados no Supabase:', error);
    return null;
  }
}

/**
 * Função principal para extrair movimentações de um processo no TJAL
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
    
    // ETAPA 1: LOGIN NO SISTEMA
    console.log('\n=== ETAPA 1: REALIZANDO LOGIN ===');
    
    console.log('Navegando para a página de login...');
    await page.goto(credenciais.site, { 
      timeout: 60000, 
      waitUntil: 'networkidle' 
    });
    
    console.log('Verificando formulário de login...');
    await page.waitForSelector('#usernameForm', { timeout: 30000 });
    
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    
    console.log('Clicando no botão de login...');
    await Promise.all([
      page.waitForNavigation({ timeout: 60000 }),
      page.click('#pbEntrar')
    ]);
    
    // Verificar resultado do login
    const urlAposLogin = page.url();
    console.log(`URL após login: ${urlAposLogin}`);
    
    // Verificar se há mensagem de erro
    const erroLogin = await page.$('.alert-danger');
    if (erroLogin) {
      const mensagemErro = await erroLogin.textContent();
      throw new Error(`Erro de login: ${mensagemErro || 'Credenciais inválidas'}`);
    }
    
    // Verificar se estamos em uma página válida após o login
    if (!(urlAposLogin.includes('esaj') || urlAposLogin.includes('cpopg'))) {
      throw new Error('Redirecionamento após login não ocorreu como esperado');
    }
    
    console.log('Login realizado com sucesso!');
    
    // ETAPA 2: ACESSAR DIRETAMENTE A PÁGINA DO PROCESSO
    console.log('\n=== ETAPA 2: ACESSANDO PÁGINA DO PROCESSO ===');
    
    console.log(`Navegando para a URL direta do processo: ${URL_PROCESSO}`);
    await page.goto(URL_PROCESSO, { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Verificar se o processo foi encontrado
    const mensagemErro = await page.$('.mensagemErro');
    if (mensagemErro) {
      const textoErro = await mensagemErro.textContent();
      console.log(`Processo não encontrado: ${textoErro}`);
      throw new Error(`Processo não encontrado: ${textoErro}`);
    }
    
    // ETAPA 3: EXTRAIR DADOS DO PROCESSO
    console.log('\n=== ETAPA 3: EXTRAINDO DADOS DO PROCESSO ===');
    
    // Aguardar um pouco para garantir que todos os elementos estejam carregados
    console.log('Aguardando 5 segundos para garantir carregamento completo da página...');
    await page.waitForTimeout(5000);
    
    // Extrair dados básicos do processo
    console.log('Extraindo dados básicos do processo...');
    const dadosProcesso = await extrairDadosProcesso(page);
    
    console.log('\n===== DADOS DO PROCESSO =====');
    console.log(JSON.stringify(dadosProcesso, null, 2));
    
    // ETAPA 4: EXTRAIR MOVIMENTAÇÕES DO PROCESSO
    console.log('\n=== ETAPA 4: EXTRAINDO MOVIMENTAÇÕES DO PROCESSO ===');
    
    // Verificar se há botão para expandir todas as movimentações
    console.log('Verificando se há botão para expandir todas as movimentações...');
    
    // Tirar screenshot antes de expandir
    await page.screenshot({ path: './antes-expandir.png' });
    
    // Tentar clicar no botão para mostrar todas as movimentações
    const botaoTodasMovimentacoes = await page.$('#linkMovimentacoes, #todasMovimentacoes');
    if (botaoTodasMovimentacoes) {
      console.log('Encontrado botão para expandir todas as movimentações, clicando...');
      await botaoTodasMovimentacoes.click();
      console.log('Aguardando 3 segundos para carregar todas as movimentações...');
      await page.waitForTimeout(3000);
    }
    
    // Tirar screenshot da página completa para análise
    await page.screenshot({ path: './pagina-completa.png', fullPage: true });
    
    // Obter o HTML completo da página
    const htmlCompleto = await page.content();
      const resultado = [];
      
      // Função para limpar texto
      function limparTexto(texto) {
        if (!texto) return '';
        return texto.replace(/\s+/g, ' ').trim();
      }
      
      // Vamos tentar várias abordagens para encontrar as movimentações
      
      // 1. Abordagem com seletores específicos baseados nas imagens
      console.log('Tentando extrair movimentações com seletores específicos...');
      
      // Vamos procurar por todas as linhas de tabela que contenham datas
      const todasLinhas = Array.from(document.querySelectorAll('tr'));
      console.log(`Total de linhas encontradas: ${todasLinhas.length}`);
      
      // Filtrar apenas linhas que contenham uma data no formato DD/MM/AAAA
      const linhasComData = todasLinhas.filter(linha => {
        const texto = linha.textContent || '';
        return texto.match(/\d{2}\/\d{2}\/\d{4}/);
      });
      
      console.log(`Total de linhas com data: ${linhasComData.length}`);
      
      // Processar cada linha com data
      linhasComData.forEach(linha => {
        const colunas = linha.querySelectorAll('td');
        if (colunas.length >= 2) {
          const data = colunas[0].textContent.trim();
          const descricao = colunas[1].textContent.trim();
          
          // Verificar se a primeira coluna parece uma data
          if (data.match(/\d{2}\/\d{2}\/\d{4}/)) {
            resultado.push({
              data,
              descricao: limparTexto(descricao)
            });
          }
        }
      });
      
      // Se não encontramos nada, tentar outra abordagem
      if (resultado.length === 0) {
        console.log('Nenhuma movimentação encontrada com a primeira abordagem, tentando alternativa...');
        
        // 2. Abordagem alternativa: procurar por elementos específicos
        const elementosData = document.querySelectorAll('.dataMovimentacao');
        console.log(`Elementos de data encontrados: ${elementosData.length}`);
        
        elementosData.forEach(elementoData => {
          const data = elementoData.textContent.trim();
          // Tentar encontrar o elemento de descrição correspondente
          const elementoDescricao = elementoData.nextElementSibling;
          const descricao = elementoDescricao ? elementoDescricao.textContent.trim() : '';
          
          if (data.match(/\d{2}\/\d{2}\/\d{4}/)) {
            resultado.push({
              data,
              descricao: limparTexto(descricao)
            });
          }
        });
      }
      
      // 3. Última tentativa: procurar por todas as tabelas
      if (resultado.length === 0) {
        console.log('Nenhuma movimentação encontrada com as abordagens anteriores, tentando todas as tabelas...');
        
        const tabelas = document.querySelectorAll('table');
        console.log(`Total de tabelas encontradas: ${tabelas.length}`);
        
        tabelas.forEach((tabela, indiceTabela) => {
          console.log(`Analisando tabela ${indiceTabela + 1}...`);
          
          // Verificar se a tabela tem linhas
          const linhas = tabela.querySelectorAll('tr');
          
          linhas.forEach(linha => {
            const colunas = linha.querySelectorAll('td');
            
            if (colunas.length >= 2) {
              const data = colunas[0].textContent.trim();
              const descricao = colunas[1].textContent.trim();
              
              // Verificar se a primeira coluna parece uma data
              if (data.match(/\d{2}\/\d{2}\/\d{4}/)) {
                resultado.push({
                  data,
                  descricao: limparTexto(descricao)
                });
              }
            }
          });
        });
      }
      
      // Imprimir informações de debug no console
      console.log(`Total de movimentações encontradas: ${resultado.length}`);
      
      return resultado;
    });
    
    // Combinar os resultados
    const todasMovimentacoes = [...movimentacoesHTML, ...movimentacoesDOM];
    
    // Processar movimentações para remover duplicatas e entradas sem descrição
    const movimentacoesProcessadas = processarMovimentacoes(todasMovimentacoes);
    
    // Exibir as movimentações processadas
    console.log('\n===== MOVIMENTAÇÕES PROCESSADAS =====');
    console.log(JSON.stringify(movimentacoesProcessadas, null, 2));
    
    console.log(`\n----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoesProcessadas.length} -----`);
    movimentacoesProcessadas.forEach((mov, index) => {
      console.log(`${index + 1}. [${mov.data}] ${mov.descricao || '(sem descrição)'}`);
    });
    
    // ETAPA 5: SALVAR DADOS NO SUPABASE
    console.log('\n=== ETAPA 5: SALVANDO DADOS NO SUPABASE ===');
    
    // Salvar as movimentações em um arquivo JSON para referência
    fs.writeFileSync('movimentacoes-final.json', JSON.stringify(movimentacoesProcessadas, null, 2));
    console.log('Movimentações salvas em movimentacoes-final.json');
    
    // Salvar dados no Supabase
    const processoUid = await salvarDadosNoSupabase(dadosProcesso, movimentacoesProcessadas);
    
    if (processoUid) {
      console.log(`\nDados salvos com sucesso no Supabase!`);
      console.log(`UID do processo: ${processoUid}`);
    } else {
      console.log(`\nNão foi possível salvar os dados no Supabase.`);
    }
    
    // Aguardar para visualização manual
    console.log('\nAguardando 60 segundos (1 minuto) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    // Manter o navegador aberto por 1 minuto
    await page.waitForTimeout(60000);
    
    console.log('Extração de movimentações concluída com sucesso!');
    
    return {
      dadosProcesso,
      movimentacoes: movimentacoesProcessadas,
      processoUid
    };
    
  } catch (error) {
    console.error('Erro durante a extração de movimentações:', error);
    console.error('Stack trace:', error.stack);
    
    // Tirar screenshot em caso de erro
    try {
      if (page) {
        await page.screenshot({ path: './tjal-erro.png' });
        console.log('Screenshot do erro salvo como tjal-erro.png');
        
        // Aguardar um tempo para visualização manual mesmo em caso de erro
        console.log('Aguardando 30 segundos para visualização manual do erro...');
        await page.waitForTimeout(30000);
      }
    } catch (screenshotError) {
      console.error('Erro ao tirar screenshot:', screenshotError);
    }
  } finally {
    // Fechar o navegador
    console.log('Fechando o navegador...');
    if (browser) {
      await browser.close();
      console.log('Navegador fechado com sucesso!');
    }
  }
}

// Executar a extração de movimentações
extrairMovimentacoesTJAL()
  .then(resultado => {
    console.log('\nScript finalizado com sucesso.');
    
    if (resultado) {
      console.log(`Processo ${resultado.dadosProcesso.numeroProcesso} extraído com sucesso.`);
      console.log(`Total de movimentações: ${resultado.movimentacoes.length}`);
      
      if (resultado.processoUid) {
        console.log(`UID do processo no Supabase: ${resultado.processoUid}`);
      }
    }
  })
  .catch(error => {
    console.error('Erro na execução do script:', error);
  });
