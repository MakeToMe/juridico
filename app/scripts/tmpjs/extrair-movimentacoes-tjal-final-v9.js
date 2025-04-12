/**
 * Script final para extrair todas as movimentações de um processo no TJAL
 * e salvar diretamente no Supabase usando a chave de serviço
 */

require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'alnpp'
  }
});

// UID da empresa (substituir pelo UID correto)
const EMPRESA_UID = 'c0f2b7c8-d0d6-4c3a-9ad9-55598d8ea773';

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// URL direta para o processo
const URL_PROCESSO = `https://www2.tjal.jus.br/cpopg/show.do?processo.numero=${NUMERO_PROCESSO}&processo.foro=1`;

// URL da página de consulta de processos
const URL_CONSULTA = 'https://www2.tjal.jus.br/cpopg/open.do';

// Credenciais para acesso ao TJAL
const credenciais = {
  site: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '84769858434',
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
  
  // Expressão regular para encontrar movimentações
  const regexMovimentacao = /<tr class="[^"]*containerMovimentacao[^"]*">[\s\S]*?<td[^>]*>([\d\/]+)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/g;
  
  let match;
  while ((match = regexMovimentacao.exec(html)) !== null) {
    const data = match[1].trim();
    const descricao = limparTexto(match[2]);
    
    movimentacoes.push({
      data,
      descricao
    });
  }
  
  // Se não encontramos movimentações com o regex específico, tentar um mais genérico
  if (movimentacoes.length === 0) {
    console.log('Nenhuma movimentação encontrada com o regex específico, tentando abordagem alternativa...');
    
    // Expressão regular mais genérica para encontrar datas e descrições
    const regexGenerico = /<tr[^>]*>[\s\S]*?<td[^>]*>([\d]{2}\/[\d]{2}\/[\d]{4})<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/g;
    
    while ((match = regexGenerico.exec(html)) !== null) {
      const data = match[1].trim();
      const descricao = limparTexto(match[2]);
      
      movimentacoes.push({
        data,
        descricao
      });
    }
  }
  
  console.log(`Extraídas ${movimentacoes.length} movimentações do HTML.`);
  return movimentacoes;
}

/**
 * Função para extrair dados do processo
 */
async function extrairDadosProcesso(page) {
  // Função auxiliar para extrair texto de um seletor
  const extrairTexto = async (seletor) => {
    const elemento = await page.$(seletor);
    if (elemento) {
      const texto = await elemento.textContent();
      return limparTexto(texto);
    }
    return '';
  };
  
  // Extrair dados básicos do processo
  const numeroProcesso = await extrairTexto('#numeroProcesso');
  const classeProcesso = await extrairTexto('#classeProcesso');
  const assuntoProcesso = await extrairTexto('#assuntoProcesso');
  const dataDistribuicao = await extrairTexto('#dataDistribuicao');
  const juiz = await extrairTexto('#juiz');
  const valorAcao = await extrairTexto('#valorAcao');
  
  // Extrair partes do processo
  const partes = [];
  
  // Buscar todas as tabelas de partes
  const tabelasPartes = await page.$$('table.secaoFormBody');
  
  for (const tabela of tabelasPartes) {
    // Verificar se é uma tabela de partes
    const titulo = await tabela.$('tr.fundoClaro th, tr.fundoEscuro th');
    if (!titulo) continue;
    
    const textoTitulo = await titulo.textContent();
    if (!textoTitulo.includes('Parte') && !textoTitulo.includes('Advogado')) continue;
    
    // Extrair informações das partes
    const linhas = await tabela.$$('tr:not(.fundoClaro):not(.fundoEscuro)');
    
    for (const linha of linhas) {
      const colunas = await linha.$$('td');
      
      if (colunas.length >= 2) {
        const tipo = await colunas[0].textContent();
        const nome = await colunas[1].textContent();
        
        partes.push({
          tipo: limparTexto(tipo),
          nome: limparTexto(nome)
        });
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
}

/**
 * Função para limpar e processar as movimentações
 */
function processarMovimentacoes(movimentacoes) {
  // Remover duplicatas (mesma data e descrição)
  const movimentacoesUnicas = [];
  const chaves = new Set();
  
  movimentacoes.forEach(mov => {
    const chave = `${mov.data}|${mov.descricao}`;
    
    if (!chaves.has(chave)) {
      chaves.add(chave);
      movimentacoesUnicas.push(mov);
    }
  });
  
  // Ordenar por data (mais recente primeiro)
  const movimentacoesOrdenadas = movimentacoesUnicas.sort((a, b) => {
    const dataA = a.data.split('/').reverse().join('-');
    const dataB = b.data.split('/').reverse().join('-');
    return dataB.localeCompare(dataA);
  });
  
  return movimentacoesOrdenadas;
}

/**
 * Função para salvar dados no Supabase
 */
async function salvarDadosNoSupabase(dadosProcesso, movimentacoes) {
  try {
    console.log('Conectando ao Supabase...');
    
    // Verificar se o processo já existe
    console.log(`Verificando se o processo ${dadosProcesso.numeroProcesso} já existe no Supabase...`);
    
    const { data: processoExistente, error: erroConsulta } = await supabase
      .from('processos')
      .select('id, processo')
      .eq('processo', dadosProcesso.numeroProcesso)
      .eq('tribunal', 'TJAL')
      .eq('empresa', EMPRESA_UID)
      .maybeSingle();
    
    if (erroConsulta) {
      console.error('Erro ao consultar processo existente:', erroConsulta);
      return null;
    }
    
    let processoId;
    
    if (processoExistente) {
      console.log(`Processo ${dadosProcesso.numeroProcesso} já existe no Supabase com ID: ${processoExistente.id}`);
      processoId = processoExistente.id;
      
      // Atualizar dados do processo
      const { error: erroAtualizacao } = await supabase
        .from('processos')
        .update({
          tribunal: 'TJAL',
          processo: dadosProcesso.numeroProcesso,
          classe: dadosProcesso.classeProcesso,
          assunto: dadosProcesso.assuntoProcesso,
          distribuicao: dadosProcesso.dataDistribuicao,
          juiz: dadosProcesso.juiz,
          valor: dadosProcesso.valorAcao,
          partes: dadosProcesso.partes,
          ultima_atualizacao: new Date().toISOString(),
          empresa: EMPRESA_UID
        })
        .eq('id', processoId);
      
      if (erroAtualizacao) {
        console.error('Erro ao atualizar processo:', erroAtualizacao);
        return null;
      }
      
      console.log('Dados do processo atualizados com sucesso!');
    } else {
      console.log(`Processo ${dadosProcesso.numeroProcesso} não existe, inserindo novo registro...`);
      
      // Inserir novo processo
      const { data: novoProcesso, error: erroInsercao } = await supabase
        .from('processos')
        .insert({
          tribunal: 'TJAL',
          processo: dadosProcesso.numeroProcesso,
          classe: dadosProcesso.classeProcesso,
          assunto: dadosProcesso.assuntoProcesso,
          distribuicao: dadosProcesso.dataDistribuicao,
          juiz: dadosProcesso.juiz,
          valor: dadosProcesso.valorAcao,
          partes: dadosProcesso.partes,
          ultima_atualizacao: new Date().toISOString(),
          empresa: EMPRESA_UID
        })
        .select();
      
      if (erroInsercao) {
        console.error('Erro ao inserir processo:', erroInsercao);
        return null;
      }
      
      processoId = novoProcesso[0].id;
      console.log(`Novo processo inserido com ID: ${processoId}`);
    }
    
    // Salvar movimentações
    console.log(`Salvando ${movimentacoes.length} movimentações...`);
    
    // Verificar movimentações existentes para evitar duplicatas
    const { data: movimentacoesExistentes, error: erroConsultaMovimentacoes } = await supabase
      .from('movimentacoes')
      .select('data_movimento, descricao')
      .eq('processo_id', processoId);
    
    if (erroConsultaMovimentacoes) {
      console.error('Erro ao consultar movimentações existentes:', erroConsultaMovimentacoes);
      return processoId;
    }
    
    // Criar um conjunto de chaves para movimentações existentes
    const movimentacoesExistentesChaves = new Set();
    
    if (movimentacoesExistentes) {
      movimentacoesExistentes.forEach(mov => {
        const chave = `${mov.data_movimento}|${mov.descricao}`;
        movimentacoesExistentesChaves.add(chave);
      });
    }
    
    // Filtrar apenas movimentações novas
    const novasMovimentacoes = movimentacoes.filter(mov => {
      const chave = `${mov.data}|${mov.descricao}`;
      return !movimentacoesExistentesChaves.has(chave);
    });
    
    console.log(`${novasMovimentacoes.length} novas movimentações para inserir.`);
    
    if (novasMovimentacoes.length > 0) {
      // Preparar dados para inserção
      const dadosInsercao = novasMovimentacoes.map(mov => ({
        processo_id: processoId,
        data_movimento: mov.data,
        descricao: mov.descricao,
        data_cadastro: new Date().toISOString()
      }));
      
      // Inserir movimentações em lotes para evitar limites de tamanho
      const tamanhoBatch = 100;
      
      for (let i = 0; i < dadosInsercao.length; i += tamanhoBatch) {
        const batch = dadosInsercao.slice(i, i + tamanhoBatch);
        console.log(`Inserindo lote ${i/tamanhoBatch + 1} de ${Math.ceil(dadosInsercao.length/tamanhoBatch)} (${batch.length} movimentações)...`);
        
        const { error: erroInsercaoMovimentacoes } = await supabase
          .from('movimentacoes')
          .insert(batch);
        
        if (erroInsercaoMovimentacoes) {
          console.error(`Erro ao inserir lote de movimentações:`, erroInsercaoMovimentacoes);
        }
      }
      
      console.log('Movimentações salvas com sucesso!');
    } else {
      console.log('Nenhuma nova movimentação para inserir.');
    }
    
    return processoId;
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
    headless: false,  // Modo não-headless para visualização
    slowMo: 100  // Adicionar um pequeno atraso para visualização
  });
  
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // ETAPA 1: FAZER LOGIN NO SISTEMA
    console.log('\n=== ETAPA 1: FAZENDO LOGIN NO SISTEMA ===');
    
    // Navegar para a página de login
    console.log('Navegando para a página de login...');
    await page.goto(credenciais.site, { timeout: 60000 });
    
    // Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    await page.click('#pbEntrar');
    
    // Aguardar redirecionamento após login
    console.log('Aguardando redirecionamento após login...');
    
    try {
      await page.waitForNavigation({ timeout: 30000 });
    } catch (error) {
      console.log('Timeout ao aguardar navegação após login, verificando URL atual...');
    }
    
    // Verificar URL após login
    const urlAposLogin = page.url();
    console.log(`URL após tentativa de login: ${urlAposLogin}`);
    
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
    
    // Salvar o HTML para análise
    fs.writeFileSync('pagina-processo.html', htmlCompleto);
    console.log('HTML da página salvo em pagina-processo.html');
    
    // Extrair movimentações do HTML
    console.log('Extraindo movimentações do HTML...');
    const movimentacoesHTML = extrairMovimentacoesDoHTML(htmlCompleto);
    
    // Extrair movimentações diretamente do DOM usando o seletor tr.containerMovimentacao
    console.log('Extraindo movimentações diretamente do DOM usando o seletor tr.containerMovimentacao...');
    
    const movimentacoesDOM = await page.evaluate(() => {
      const resultado = [];
      
      // Função para limpar texto
      function limparTexto(texto) {
        if (!texto) return '';
        return texto.replace(/\s+/g, ' ').trim();
      }
      
      // Usar o seletor específico tr.containerMovimentacao
      console.log('Buscando movimentações com o seletor tr.containerMovimentacao...');
      
      const movimentacoes = Array.from(document.querySelectorAll('tr.containerMovimentacao')).map(row => {
        const colunas = row.querySelectorAll('td');
        const data = colunas[0]?.innerText.trim() || '';
        const descricao = colunas[1]?.innerText.trim() || '';
        
        return {
          data,
          descricao: limparTexto(descricao)
        };
      });
      
      console.log(`Encontradas ${movimentacoes.length} movimentações com o seletor específico.`);
      resultado.push(...movimentacoes);
      
      // Se não encontramos nada com o seletor específico, tentar abordagem alternativa
      if (resultado.length === 0) {
        console.log('Nenhuma movimentação encontrada com o seletor específico, tentando abordagem alternativa...');
        
        // Buscar todas as tabelas
        const tabelas = document.querySelectorAll('table');
        
        tabelas.forEach(tabela => {
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
