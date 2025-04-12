/**
 * Script final para extrair todas as movimentações de um processo no TJAL
 * e salvar diretamente no Supabase usando a chave de serviço
 */

const { chromium } = require('playwright');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// URL da página de consulta de processos
const URL_CONSULTA = 'https://www2.tjal.jus.br/cpopg/open.do';

// ID da empresa
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
  
  // Converter o mapa de volta para array e ordenar por data (mais recente primeiro)
  return Array.from(mapaPorData.values()).sort((a, b) => {
    const dataA = a.data.split('/').reverse().join('-');
    const dataB = b.data.split('/').reverse().join('-');
    return dataB.localeCompare(dataA);
  });
}

/**
 * Função para salvar dados no Supabase
 */
async function salvarDadosNoSupabase(dadosProcesso, movimentacoes) {
  console.log('\n=== SALVANDO DADOS NO SUPABASE ===');
  console.log(`Usando ID da empresa: ${EMPRESA_UID}`);
  
  try {
    // Verificar se o processo já existe
    console.log(`Verificando se o processo ${dadosProcesso.numeroProcesso} já existe...`);
    const { data: processoExistente, error: erroConsulta } = await supabase
      .from('processos')
      .select('uid')
      .eq('processo', dadosProcesso.numeroProcesso);
    
    if (erroConsulta) {
      console.error('Erro ao consultar processo:', erroConsulta);
      throw new Error(`Erro ao consultar processo: ${erroConsulta.message}`);
    }
    
    let processoUid;
    
    if (processoExistente && processoExistente.length > 0) {
      console.log(`Processo ${dadosProcesso.numeroProcesso} já existe no banco de dados.`);
      processoUid = processoExistente[0].uid;
      
      // Atualizar dados do processo
      console.log('Atualizando dados do processo...');
      const { error: erroAtualizacao } = await supabase
        .from('processos')
        .update({
          tribunal: 'TJAL',
          classe: dadosProcesso.classeProcesso,
          assunto: dadosProcesso.assuntoProcesso,
          data_distribuicao: dadosProcesso.dataDistribuicao,
          juiz: dadosProcesso.juiz,
          valor: dadosProcesso.valorAcao,
          partes: JSON.stringify(dadosProcesso.partes),
          empresa: EMPRESA_UID
        })
        .eq('uid', processoUid);
      
      if (erroAtualizacao) {
        console.error('Erro ao atualizar processo:', erroAtualizacao);
        throw new Error(`Erro ao atualizar processo: ${erroAtualizacao.message}`);
      }
      
      console.log('Processo atualizado com sucesso!');
    } else {
      console.log(`Inserindo novo processo ${dadosProcesso.numeroProcesso}...`);
      const { data: novoProcesso, error: erroInsercao } = await supabase
        .from('processos')
        .insert({
          tribunal: 'TJAL',
          processo: dadosProcesso.numeroProcesso,
          classe: dadosProcesso.classeProcesso,
          assunto: dadosProcesso.assuntoProcesso,
          data_distribuicao: dadosProcesso.dataDistribuicao,
          juiz: dadosProcesso.juiz,
          valor: dadosProcesso.valorAcao,
          partes: JSON.stringify(dadosProcesso.partes),
          empresa: EMPRESA_UID  // Usar o ID correto da empresa
        })
        .select();
      
      if (erroInsercao) {
        console.error('Erro ao inserir processo:', erroInsercao);
        throw new Error(`Erro ao inserir processo: ${erroInsercao.message}`);
      }
      
      processoUid = novoProcesso[0].uid;
      console.log(`Processo inserido com sucesso! UID: ${processoUid}`);
    }
    
    // Consultar movimentações existentes para evitar duplicatas
    const { data: movimentacoesExistentes, error: erroConsultaMovimentacoes } = await supabase
      .from('movimentacoes')
      .select('data, movimentacao')
      .eq('processo_uid', processoUid);
    
    if (erroConsultaMovimentacoes) {
      console.error('Erro ao consultar movimentações existentes:', erroConsultaMovimentacoes);
      throw new Error(`Erro ao consultar movimentações existentes: ${erroConsultaMovimentacoes.message}`);
    }
    
    // Criar um Set com as movimentações existentes para fácil verificação
    const movimentacoesExistentesSet = new Set();
    
    if (movimentacoesExistentes && movimentacoesExistentes.length > 0) {
      movimentacoesExistentes.forEach(mov => {
        const chave = `${mov.data}|${mov.movimentacao || ''}`;
        movimentacoesExistentesSet.add(chave);
      });
    }
    
    // Inserir as movimentações na tabela movimentacoes
    if (movimentacoes && movimentacoes.length > 0) {
      // Usar todas as movimentações, mesmo sem descrição
      const todasMovimentacoes = movimentacoes;
      
      if (todasMovimentacoes.length > 0) {
        console.log(`Inserindo ${todasMovimentacoes.length} movimentações...`);
        
        const movimentacoesParaInserir = [];
        
        for (const mov of todasMovimentacoes) {
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
          const { data: movimentacoesInseridas, error: erroInsercaoMovimentacoes } = await supabase
            .from('movimentacoes')
            .insert(movimentacoesParaInserir);
          
          if (erroInsercaoMovimentacoes) {
            console.error('Erro ao inserir movimentações:', erroInsercaoMovimentacoes);
            throw new Error(`Erro ao inserir movimentações: ${erroInsercaoMovimentacoes.message}`);
          }
          
          console.log(`${movimentacoesParaInserir.length} movimentações inseridas com sucesso!`);
        } else {
          console.log('Nenhuma movimentação nova para inserir.');
        }
      }
    }
    
    console.log('\nDados salvos com sucesso no Supabase!');
    return processoUid;
  } catch (error) {
    console.error('Erro ao salvar dados no Supabase:', error);
    throw error;
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
    // Navegar para a página de login
    console.log('Navegando para a página de login...');
    await page.goto(credenciais.site, { timeout: 60000 });
    
    // Aguardar que o formulário de login apareça
    await page.waitForSelector('#usernameForm', { timeout: 60000 });
    
    // Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    
    // Tirar screenshot antes de clicar no botão de login
    await page.screenshot({ path: 'antes-login.png' });
    console.log('Screenshot salvo em antes-login.png');
    
    // Clicar no botão de login
    console.log('Clicando no botão de login...');
    await page.click('#pbEntrar');
    
    // Aguardar login com tratamento de erro
    try {
      await page.waitForNavigation({ timeout: 60000 });
      console.log('Login realizado com sucesso!');
    } catch (error) {
      console.log('Timeout ao aguardar navegação após login, verificando URL atual...');
      const url = page.url();
      console.log(`URL atual: ${url}`);
      
      // Tirar screenshot para debug
      await page.screenshot({ path: 'apos-login.png' });
      console.log('Screenshot salvo em apos-login.png');
      
      // Se ainda estamos na página de login, algo deu errado
      if (url.includes('login')) {
        throw new Error('Falha no login. Verifique as credenciais.');
      }
      
      console.log('Continuando mesmo com timeout, parece que o login foi bem-sucedido.');
    }
    
    // Navegar para a página de consulta de processos
    console.log('Navegando para a página de consulta de processos...');
    await page.goto(URL_CONSULTA);
    console.log('Página de consulta carregada.');
    
    // Selecionar o radio button "Unificado"
    console.log('Selecionando opção de número unificado...');
    await page.click('#radioNumeroUnificado');
    
    // Dividir o número do processo
    const partes = NUMERO_PROCESSO.split('.');
    const numeroPrimeiraParte = partes[0]; // 0727108-89.2024
    const numeroTerceiraParte = partes[2]; // 0001
    
    console.log(`Preenchendo número do processo: ${numeroPrimeiraParte} e ${numeroTerceiraParte}...`);
    
    // Preencher os campos do número do processo
    await page.fill('#numeroDigitoAnoUnificado', numeroPrimeiraParte);
    await page.fill('#foroNumeroUnificado', numeroTerceiraParte);
    
    // Clicar no botão de consulta
    console.log('Clicando no botão de consulta...');
    await page.click('#botaoConsultarProcessos');
    
    // Aguardar carregamento da página
    await page.waitForSelector('#containerDadosPrincipaisProcesso');
    console.log('Página do processo carregada com sucesso!');
    
    // Aguardar um pouco para garantir que todos os elementos estejam carregados
    console.log('Aguardando 3 segundos para garantir carregamento completo...');
    await page.waitForTimeout(3000);
    
    // Verificar se há botão para expandir todas as movimentações
    const botaoExpandirTodas = await page.$('#todasMovimentacoes');
    
    if (botaoExpandirTodas) {
      console.log('Encontrado botão para expandir todas as movimentações, clicando...');
      await botaoExpandirTodas.click();
      console.log('Aguardando 3 segundos para carregar todas as movimentações...');
      await page.waitForTimeout(3000);
    }
    
    // Extrair dados do processo
    console.log('\n=== EXTRAINDO DADOS DO PROCESSO ===');
    const dadosProcesso = await extrairDadosProcesso(page);
    console.log('Dados do processo extraídos com sucesso:');
    console.log(JSON.stringify(dadosProcesso, null, 2));
    
    // Extrair movimentações usando o seletor específico tr.containerMovimentacao
    console.log('\n=== EXTRAINDO MOVIMENTAÇÕES DO PROCESSO ===');
    
    const movimentacoesDOM = await page.evaluate(() => {
      const resultado = [];
      
      // Função para limpar texto
      function limparTexto(texto) {
        if (!texto) return '';
        return texto.replace(/\s+/g, ' ').trim();
      }
      
      // Usar o seletor específico tr.containerMovimentacao conforme sugerido
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
        
        // Abordagem alternativa: procurar por todas as linhas que contêm datas
        const todasLinhas = Array.from(document.querySelectorAll('tr'));
        
        // Filtrar linhas que contêm uma data no formato DD/MM/AAAA
        todasLinhas.forEach(linha => {
          const texto = linha.textContent || '';
          const matchData = texto.match(/(\d{2}\/\d{2}\/\d{4})/);
          
          if (matchData) {
            const colunas = linha.querySelectorAll('td');
            
            if (colunas.length >= 2) {
              const data = colunas[0].textContent.trim();
              const descricao = colunas[1] ? colunas[1].textContent.trim() : '';
              
              // Verificar se a primeira coluna parece uma data
              if (data.match(/\d{2}\/\d{2}\/\d{4}/)) {
                resultado.push({
                  data,
                  descricao: limparTexto(descricao)
                });
              }
            }
          }
        });
      }
      
      console.log(`Total de movimentações encontradas: ${resultado.length}`);
      return resultado;
    });
    
    // Processar e ordenar movimentações
    const movimentacoesProcessadas = processarMovimentacoes(movimentacoesDOM);
    
    console.log('\n=== MOVIMENTAÇÕES PROCESSADAS ===');
    console.log(JSON.stringify(movimentacoesProcessadas, null, 2));
    
    console.log(`\n----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoesProcessadas.length} -----`);
    movimentacoesProcessadas.forEach((mov, index) => {
      console.log(`${index + 1}. [${mov.data}] ${mov.descricao || '(sem descrição)'}`);
    });
    
    // Salvar movimentações em arquivo para referência
    fs.writeFileSync('movimentacoes.json', JSON.stringify(movimentacoesProcessadas, null, 2));
    console.log('\nMovimentações salvas em movimentacoes.json');
    
    // Salvar dados no Supabase
    const processoUid = await salvarDadosNoSupabase(dadosProcesso, movimentacoesProcessadas);
    
    console.log('\nDados salvos com sucesso no Supabase!');
    console.log(`UID do processo: ${processoUid}`);
    
    // Aguardar para visualização manual
    console.log('\nAguardando 60 segundos (1 minuto) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    await page.waitForTimeout(60000); // 60 segundos = 1 minuto
    
    return { dadosProcesso, movimentacoes: movimentacoesProcessadas, processoUid };
  } catch (error) {
    console.error('Erro durante a extração:', error);
    throw error;
  } finally {
    // Fechar o navegador
    await browser.close();
  }
}

// Executar a extração de movimentações
extrairMovimentacoesTJAL()
  .then(resultado => {
    console.log('\nScript finalizado com sucesso.');
  })
  .catch(error => {
    console.error('\nErro na execução do script:', error);
  });
