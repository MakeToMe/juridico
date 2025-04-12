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
            
            const result = await response.json();
            return { data: result, error: null };
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
                
                const result = await response.json();
                return { data: result, error: null };
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
    console.log(`Verificando se o processo ${dadosProcesso.numeroProcesso} já existe no Supabase...`);
    
    const { data: processoExistente, error: erroConsulta } = await supabase
      .from('processos')
      .select('id, processo')
      .eq('processo', dadosProcesso.numeroProcesso);
    
    if (erroConsulta) {
      console.error('Erro ao consultar processo existente:', erroConsulta);
      throw erroConsulta;
    }
    
    let processoId;
    
    if (processoExistente && processoExistente.length > 0) {
      console.log(`Processo ${dadosProcesso.numeroProcesso} já existe no Supabase com ID: ${processoExistente[0].id}`);
      processoId = processoExistente[0].id;
      
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
        throw erroAtualizacao;
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
        });
      
      if (erroInsercao) {
        console.error('Erro ao inserir processo:', erroInsercao);
        throw erroInsercao;
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
      throw erroConsultaMovimentacoes;
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
      const tamanhoBatch = 50;
      
      for (let i = 0; i < dadosInsercao.length; i += tamanhoBatch) {
        const batch = dadosInsercao.slice(i, i + tamanhoBatch);
        console.log(`Inserindo lote ${i/tamanhoBatch + 1} de ${Math.ceil(dadosInsercao.length/tamanhoBatch)} (${batch.length} movimentações)...`);
        
        const { error: erroInsercaoMovimentacoes } = await supabase
          .from('movimentacoes')
          .insert(batch);
        
        if (erroInsercaoMovimentacoes) {
          console.error(`Erro ao inserir lote de movimentações:`, erroInsercaoMovimentacoes);
          throw erroInsercaoMovimentacoes;
        }
      }
      
      console.log('Movimentações salvas com sucesso!');
    } else {
      console.log('Nenhuma nova movimentação para inserir.');
    }
    
    return processoId;
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
    
    // Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', USERNAME);
    await page.fill('#passwordForm', PASSWORD);
    await page.click('#pbEntrar');
    
    // Aguardar login
    await page.waitForNavigation();
    console.log('Login realizado com sucesso!');
    
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
    
    // Extrair movimentações
    console.log('Extraindo movimentações...');
    
    // Método específico para extrair todas as movimentações, incluindo as sem descrição
    const movimentacoesDOM = await page.evaluate(() => {
      const resultado = [];
      
      // Função para limpar texto
      function limparTexto(texto) {
        if (!texto) return '';
        return texto.replace(/\s+/g, ' ').trim();
      }
      
      // NOVO: Usar o seletor tr.containerMovimentacao para extrair movimentações
      console.log('Buscando movimentações com o seletor tr.containerMovimentacao...');
      
      const movimentacoesContainer = Array.from(document.querySelectorAll('tr.containerMovimentacao')).map(row => {
        const colunas = row.querySelectorAll('td');
        const data = colunas[0]?.innerText.trim() || '';
        const descricao = colunas[1]?.innerText.trim() || '';
        
        return {
          data,
          descricao: limparTexto(descricao)
        };
      });
      
      console.log(`Encontradas ${movimentacoesContainer.length} movimentações com o seletor tr.containerMovimentacao.`);
      resultado.push(...movimentacoesContainer);
      
      // Abordagem original como fallback
      if (resultado.length === 0) {
        console.log('Nenhuma movimentação encontrada com o seletor específico, usando abordagem original...');
        
        // Abordagem 1: Procurar por todas as linhas que contêm datas
        console.log('Buscando todas as linhas com datas...');
        
        // Selecionar todas as linhas da tabela
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
        
        // Abordagem 2: Procurar por elementos específicos com classe
        if (resultado.length === 0) {
          console.log('Tentando abordagem alternativa...');
          
          // Buscar por elementos com classe específica
          document.querySelectorAll('td').forEach(td => {
            const texto = td.textContent.trim();
            
            // Verificar se o texto é uma data
            if (texto.match(/\d{2}\/\d{2}\/\d{4}/)) {
              // Tentar obter o próximo td como descrição
              const proximoTd = td.nextElementSibling;
              const descricao = proximoTd ? proximoTd.textContent.trim() : '';
              
              resultado.push({
                data: texto,
                descricao: limparTexto(descricao)
              });
            }
          });
        }
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
