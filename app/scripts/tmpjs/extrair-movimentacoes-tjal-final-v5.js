require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMPRESA_UID = '807d031b-d08e-492e-94ba-428b28fb604e'; // ID correto da empresa

// Credenciais TJAL
const USERNAME = 'flavio.guardia';
const PASSWORD = 'Flavio2023@';

// Número do processo para consulta
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// Configurações do navegador
const TIMEOUT = 60000; // 60 segundos
const WAIT_AFTER_EXECUTION = 60000; // 60 segundos (1 minuto)

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
 * Função para extrair dados do processo
 */
async function extrairDadosProcesso(page) {
  console.log('Extraindo dados básicos do processo...');
  
  const dadosProcesso = await page.evaluate(() => {
    // Função auxiliar para extrair texto
    function extrairTexto(seletor) {
      const elemento = document.querySelector(seletor);
      return elemento ? elemento.textContent.trim() : '';
    }
    
    // Extrair dados básicos
    const numeroProcesso = extrairTexto('#numeroProcesso') || extrairTexto('.nuProcesso');
    const classeProcesso = extrairTexto('#classeProcesso');
    const assuntoProcesso = extrairTexto('#assuntoProcesso');
    const dataDistribuicao = extrairTexto('#dataDistribuicao');
    const juiz = extrairTexto('#juiz');
    const valorAcao = extrairTexto('#valorAcao');
    
    // Extrair partes do processo
    const partes = [];
    
    // Função para extrair advogados
    function extrairAdvogados(elemento) {
      const advogados = [];
      const advogadosElements = elemento.querySelectorAll('.advogado');
      
      advogadosElements.forEach(adv => {
        const nome = adv.textContent.trim();
        if (nome) advogados.push(nome);
      });
      
      return advogados;
    }
    
    // Extrair autores
    const autoresElements = document.querySelectorAll('#poloAtivo .polo_ativo');
    
    autoresElements.forEach(autor => {
      const nome = autor.querySelector('.nomeParteEAdvogado')?.textContent.trim() || '';
      
      if (nome) {
        partes.push({
          tipo: 'Autor',
          nome,
          advogados: extrairAdvogados(autor)
        });
      }
    });
    
    // Extrair réus
    const reusElements = document.querySelectorAll('#poloPassivo .polo_passivo');
    
    reusElements.forEach(reu => {
      const nome = reu.querySelector('.nomeParteEAdvogado')?.textContent.trim() || '';
      
      if (nome) {
        partes.push({
          tipo: 'Réu',
          nome,
          advogados: extrairAdvogados(reu)
        });
      }
    });
    
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
  
  console.log('===== DADOS DO PROCESSO =====');
  console.log(JSON.stringify(dadosProcesso, null, 2));
  
  return dadosProcesso;
}

/**
 * Função para salvar dados no Supabase
 */
async function salvarDadosNoSupabase(dadosProcesso, movimentacoes) {
  console.log('\n=== SALVANDO DADOS NO SUPABASE ===');
  console.log(`Usando ID da empresa: ${EMPRESA_UID}`);
  
  // Criar cliente Supabase usando fetch
  const supabase = {
    from: (table) => {
      return {
        select: (columns = '*') => {
          return {
            eq: async (column, value) => {
              try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=${columns}`, {
                  headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (!response.ok) {
                  throw new Error(`Erro na consulta: ${response.statusText}`);
                }
                
                const data = await response.json();
                return { data, error: null };
              } catch (error) {
                return { data: null, error };
              }
            },
            single: async () => {
              try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}&limit=1`, {
                  headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (!response.ok) {
                  throw new Error(`Erro na consulta: ${response.statusText}`);
                }
                
                const data = await response.json();
                return { data: data[0] || null, error: null };
              } catch (error) {
                return { data: null, error };
              }
            }
          };
        },
        insert: async (data) => {
          try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(data)
            });
            
            if (!response.ok) {
              throw new Error(`Erro na inserção: ${response.statusText}`);
            }
            
            const responseData = await response.json();
            return { data: responseData, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
        update: async (data) => {
          return {
            eq: async (column, value) => {
              try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
                  method: 'PATCH',
                  headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                  },
                  body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                  throw new Error(`Erro na atualização: ${response.statusText}`);
                }
                
                const responseData = await response.json();
                return { data: responseData, error: null };
              } catch (error) {
                return { data: null, error };
              }
            }
          };
        }
      };
    }
  };
  
  try {
    // Verificar se o processo já existe
    console.log(`Verificando se o processo ${dadosProcesso.numeroProcesso} já existe...`);
    const { data: processoExistente, error: erroConsulta } = await supabase
      .from('alnpp.processos')
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
        .from('alnpp.processos')
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
        .from('alnpp.processos')
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
        });
      
      if (erroInsercao) {
        console.error('Erro ao inserir processo:', erroInsercao);
        throw new Error(`Erro ao inserir processo: ${erroInsercao.message}`);
      }
      
      processoUid = novoProcesso[0].uid;
      console.log(`Processo inserido com sucesso! UID: ${processoUid}`);
    }
    
    // Consultar movimentações existentes para evitar duplicatas
    const { data: movimentacoesExistentes, error: erroConsultaMovimentacoes } = await supabase
      .from('alnpp.movimentacoes')
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
            .from('alnpp.movimentacoes')
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
 * Função principal
 */
async function main() {
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
  page.setDefaultTimeout(TIMEOUT);
  
  try {
    // Navegar para a página de login
    console.log('Navegando para a página de login...');
    await page.goto('https://www2.tjal.jus.br/esaj/portal.do?servico=190100');
    
    // Aguardar a página de login carregar completamente
    await page.waitForSelector('#usernameForm', { state: 'visible', timeout: TIMEOUT });
    await page.waitForSelector('#passwordForm', { state: 'visible', timeout: TIMEOUT });
    
    // Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', USERNAME);
    await page.fill('#passwordForm', PASSWORD);
    
    // Clicar no botão de login e aguardar
    console.log('Clicando no botão de login...');
    await page.click('#pbEntrar');
    
    // Aguardar login com timeout maior
    try {
      await page.waitForNavigation({ timeout: TIMEOUT * 2 });
      console.log('Login realizado com sucesso!');
    } catch (error) {
      console.log('Timeout ao aguardar navegação após login, mas continuando...');
      // Verificar se estamos na página correta mesmo assim
      const url = page.url();
      console.log(`URL atual: ${url}`);
      if (url.includes('tjal.jus.br') && !url.includes('servico=190100')) {
        console.log('Parece que o login foi bem-sucedido mesmo com o timeout.');
      } else {
        throw new Error('Falha no login. Verifique as credenciais ou a disponibilidade do site.');
      }
    }
    
    // Navegar para a página de consulta de processos
    console.log('Navegando para a página de consulta de processos...');
    await page.goto('https://www2.tjal.jus.br/cpopg/open.do');
    
    // Selecionar o radio button "Unificado"
    await page.click('#radioNumeroUnificado');
    
    // Dividir o número do processo
    const partes = NUMERO_PROCESSO.split('.');
    const numeroPrimeiraParte = partes[0]; // 0727108-89.2024
    const numeroTerceiraParte = partes[2]; // 0001
    
    // Preencher os campos do número do processo
    await page.fill('#numeroDigitoAnoUnificado', numeroPrimeiraParte);
    await page.fill('#foroNumeroUnificado', numeroTerceiraParte);
    
    // Clicar no botão de consulta
    await page.click('#botaoConsultarProcessos');
    
    // Aguardar carregamento da página de detalhes do processo
    await page.waitForSelector('#containerDadosPrincipaisProcesso', { timeout: TIMEOUT });
    console.log('Página de detalhes do processo carregada com sucesso!');
    
    // Aguardar um pouco para garantir que todos os elementos estejam carregados
    console.log('=== ETAPA 3: EXTRAINDO DADOS DO PROCESSO ===');
    console.log('Aguardando 5 segundos para garantir carregamento completo da página...');
    await page.waitForTimeout(5000);
    
    // Extrair dados do processo
    const dadosProcesso = await extrairDadosProcesso(page);
    
    // Extrair movimentações
    console.log('\n=== ETAPA 4: EXTRAINDO MOVIMENTAÇÕES DO PROCESSO ===');
    
    // Verificar se há botão para expandir todas as movimentações
    const botaoExpandirTodas = await page.$('#todasMovimentacoes');
    
    if (botaoExpandirTodas) {
      console.log('Encontrado botão para expandir todas as movimentações, clicando...');
      await botaoExpandirTodas.click();
      console.log('Aguardando 3 segundos para carregar todas as movimentações...');
      await page.waitForTimeout(3000);
    }
    
    // Extrair o HTML da página para análise
    const htmlCompleto = await page.content();
    fs.writeFileSync('pagina-processo.html', htmlCompleto);
    console.log('HTML da página salvo em pagina-processo.html');
    
    // Extrair movimentações usando o seletor específico tr.containerMovimentacao
    console.log('Extraindo movimentações...');
    
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
    
    console.log('\n===== MOVIMENTAÇÕES PROCESSADAS =====');
    console.log(JSON.stringify(movimentacoesProcessadas, null, 2));
    
    console.log(`\n----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoesProcessadas.length} -----`);
    movimentacoesProcessadas.forEach((mov, index) => {
      console.log(`${index + 1}. [${mov.data}] ${mov.descricao || '(sem descrição)'}`);
    });
    
    console.log('\n=== ETAPA 5: SALVANDO DADOS NO SUPABASE ===');
    
    // Salvar movimentações em arquivo para referência
    fs.writeFileSync('movimentacoes-final.json', JSON.stringify(movimentacoesProcessadas, null, 2));
    console.log('Movimentações salvas em movimentacoes-final.json');
    
    // Salvar dados no Supabase
    const processoUid = await salvarDadosNoSupabase(dadosProcesso, movimentacoesProcessadas);
    
    console.log('\nDados salvos com sucesso no Supabase!');
    console.log(`UID do processo: ${processoUid}`);
    
    // Aguardar para visualização manual
    console.log(`\nAguardando ${WAIT_AFTER_EXECUTION / 1000} segundos (${WAIT_AFTER_EXECUTION / 60000} minuto) para visualização manual...`);
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    await page.waitForTimeout(WAIT_AFTER_EXECUTION);
  } catch (error) {
    console.error('Erro durante a execução:', error);
  } finally {
    // Fechar o navegador
    await browser.close();
  }
}

// Executar o script
main()
  .then(() => {
    console.log('Script concluído com sucesso!');
  })
  .catch(error => {
    console.error('Erro na execução do script:', error);
  });
