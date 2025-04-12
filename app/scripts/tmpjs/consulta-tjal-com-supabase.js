/**
 * Script para consultar processo no TJAL e salvar dados no Supabase
 * Extrai dados do processo e movimentações
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const dotenv = require('dotenv');
// Carregar variáveis de ambiente do arquivo .env.local
dotenv.config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não encontradas!');
  console.error('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão definidas no arquivo .env.local');
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
 * Salva os dados do processo no Supabase
 */
async function salvarProcessoSupabase(dadosProcesso) {
  try {
    console.log('\n=== SALVANDO DADOS NO SUPABASE ===');
    
    // Inserir o processo na tabela processos
    const { data: processo, error: processoError } = await supabase
      .from('alnpp.processos')
      .insert([
        {
          tribunal: 'TJAL',
          comarca: dadosProcesso.comarca,
          processo: dadosProcesso.numeroProcesso,
          vara: dadosProcesso.vara,
          classe: dadosProcesso.classe,
          assunto: dadosProcesso.assunto,
          juiz: dadosProcesso.juiz,
          autor: dadosProcesso.partes.filter(p => p.tipo.includes('Autor')).map(p => p.nome),
          adv_autor: dadosProcesso.advogadosAutor,
          empresa: EMPRESA_UID
        }
      ])
      .select();
    
    if (processoError) {
      throw new Error(`Erro ao salvar processo: ${processoError.message}`);
    }
    
    console.log(`Processo salvo com sucesso! UID: ${processo[0].uid}`);
    
    // Inserir as movimentações na tabela movimentacoes
    if (dadosProcesso.movimentacoes && dadosProcesso.movimentacoes.length > 0) {
      const movimentacoesParaInserir = dadosProcesso.movimentacoes.map(mov => ({
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
      console.log('Nenhuma movimentação para salvar.');
    }
    
    return processo[0].uid;
  } catch (error) {
    console.error('Erro ao salvar dados no Supabase:', error);
    throw error;
  }
}

/**
 * Função principal para consultar processo no TJAL e salvar no Supabase
 */
async function consultaProcessoTJAL() {
  console.log(`Iniciando consulta do processo ${NUMERO_PROCESSO} no TJAL...`);
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-dev-shm-usage'],
    timeout: 60000,
  });
  
  let page;
  let processoUid;
  
  try {
    console.log('Configurando contexto do navegador...');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      ignoreHTTPSErrors: true,
      // Aumentar os timeouts para garantir que tudo carregue
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
    
    // ETAPA 2: CONSULTA DO PROCESSO
    console.log('\n=== ETAPA 2: CONSULTANDO PROCESSO ===');
    
    // Navegar para a página de consulta
    console.log('Navegando para a página de consulta...');
    await page.goto('https://www2.tjal.jus.br/cpopg/search.do', { 
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Extrair as partes do número do processo
    console.log('Preenchendo o número do processo...');
    const partePrimeiroCampo = NUMERO_PROCESSO.substring(0, 15); // NNNNNNN-DD.AAAA (0727108-89.2024)
    const parteTerceiroCampo = NUMERO_PROCESSO.substring(21);    // OOOO (0001)
    
    console.log(`Partes do processo: Primeiro="${partePrimeiroCampo}", Terceiro="${parteTerceiroCampo}"`);
    
    // Preencher os campos
    await page.fill('#numeroDigitoAnoUnificado', partePrimeiroCampo);
    await page.fill('#foroNumeroUnificado', parteTerceiroCampo);
    
    // Garantir que o radio button "Unificado" esteja selecionado
    await page.check('#radioNumeroUnificado');
    
    // Verificar o que foi preenchido
    const valorCampo1 = await page.inputValue('#numeroDigitoAnoUnificado');
    const valorCampo2 = await page.inputValue('#foroNumeroUnificado');
    console.log(`Valores preenchidos: Campo 1="${valorCampo1}", Campo 2="${valorCampo2}"`);
    
    // Tirar screenshot antes de consultar
    await page.screenshot({ path: './consulta-antes.png' });
    
    // Clicar no botão de consultar
    console.log('Clicando no botão Consultar...');
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }),
      page.click('#botaoConsultarProcessos')
    ]);
    
    // Verificar resultado da consulta
    const urlAposConsulta = page.url();
    console.log(`URL após consulta: ${urlAposConsulta}`);
    
    // Tirar screenshot após consulta
    await page.screenshot({ path: './consulta-resultado.png' });
    
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
    
    // Extrair informações básicas
    const dadosProcesso = await page.evaluate(() => {
      // Função para extrair texto de um seletor, retornando string vazia se não encontrar
      function extrairTexto(seletor) {
        const elemento = document.querySelector(seletor);
        return elemento ? elemento.textContent.trim() : '';
      }
      
      // Extrair dados básicos do processo
      const numeroProcesso = extrairTexto('#numeroProcesso');
      const classe = extrairTexto('#classeProcesso');
      const assunto = extrairTexto('#assuntoProcesso');
      const distribuicao = extrairTexto('#dataDistribuicaoProcesso');
      const juiz = extrairTexto('#juizProcesso');
      const valorAcao = extrairTexto('#valorAcaoProcesso');
      const vara = extrairTexto('.secaoVara');
      const comarca = extrairTexto('.secaoComarca');
      
      // Extrair partes do processo
      const partes = [];
      const advogadosAutor = [];
      
      // Extrair partes e advogados
      const tabelaPartes = document.querySelector('#tablePartesPrincipais');
      if (tabelaPartes) {
        const linhas = tabelaPartes.querySelectorAll('tr');
        
        linhas.forEach(linha => {
          const colunas = linha.querySelectorAll('td');
          
          if (colunas.length >= 2) {
            const tipo = colunas[0].textContent.trim();
            const nome = colunas[1].textContent.trim();
            
            if (tipo && nome) {
              // Adicionar à lista de partes
              partes.push({ tipo, nome });
              
              // Se for advogado do autor, adicionar à lista específica
              if (tipo.includes('Advogado') && partes.some(p => p.tipo.includes('Autor'))) {
                advogadosAutor.push(nome);
              }
            }
          }
        });
      }
      
      // Extrair movimentações do processo
      const movimentacoes = [];
      const tabelaMovimentacoes = document.querySelector('#tabelaTodasMovimentacoes');
      
      if (tabelaMovimentacoes) {
        const linhas = tabelaMovimentacoes.querySelectorAll('tr');
        
        linhas.forEach(linha => {
          const colunas = linha.querySelectorAll('td');
          
          if (colunas.length >= 2) {
            const data = colunas[0].textContent.trim();
            const descricao = colunas[1].textContent.trim();
            
            if (data && descricao) {
              movimentacoes.push({ data, descricao });
            }
          }
        });
      }
      
      return {
        numeroProcesso,
        classe,
        assunto,
        distribuicao,
        juiz,
        valorAcao,
        vara,
        comarca,
        partes,
        advogadosAutor,
        movimentacoes
      };
    });
    
    // Exibir os dados extraídos
    console.log('\n===== DADOS EXTRAÍDOS DO PROCESSO =====');
    console.log(`Número: ${dadosProcesso.numeroProcesso}`);
    console.log(`Classe: ${dadosProcesso.classe}`);
    console.log(`Assunto: ${dadosProcesso.assunto}`);
    console.log(`Vara: ${dadosProcesso.vara}`);
    console.log(`Comarca: ${dadosProcesso.comarca}`);
    console.log(`Distribuição: ${dadosProcesso.distribuicao}`);
    console.log(`Juiz: ${dadosProcesso.juiz}`);
    console.log(`Valor da Ação: ${dadosProcesso.valorAcao}`);
    
    console.log('\n----- PARTES DO PROCESSO -----');
    if (dadosProcesso.partes && dadosProcesso.partes.length > 0) {
      dadosProcesso.partes.forEach((parte, index) => {
        console.log(`${index + 1}. ${parte.tipo}: ${parte.nome}`);
      });
    } else {
      console.log('Nenhuma parte encontrada.');
    }
    
    console.log('\n----- ADVOGADOS DO AUTOR -----');
    if (dadosProcesso.advogadosAutor && dadosProcesso.advogadosAutor.length > 0) {
      dadosProcesso.advogadosAutor.forEach((adv, index) => {
        console.log(`${index + 1}. ${adv}`);
      });
    } else {
      console.log('Nenhum advogado do autor encontrado.');
    }
    
    console.log('\n----- MOVIMENTAÇÕES -----');
    if (dadosProcesso.movimentacoes && dadosProcesso.movimentacoes.length > 0) {
      dadosProcesso.movimentacoes.forEach((mov, index) => {
        console.log(`${index + 1}. [${mov.data}] ${mov.descricao}`);
      });
    } else {
      console.log('Nenhuma movimentação encontrada.');
    }
    
    // Salvar dados no Supabase
    processoUid = await salvarProcessoSupabase(dadosProcesso);
    
    console.log(`\nDados salvos com sucesso no Supabase! Processo UID: ${processoUid}`);
    
    // Aguardar para visualização manual
    console.log('\nAguardando 120 segundos (2 minutos) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    // Manter o navegador aberto por 2 minutos
    await page.waitForTimeout(120000);
    
    console.log('Consulta e salvamento concluídos com sucesso!');
    
  } catch (error) {
    console.error('Erro durante a consulta:', error);
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
    
    return processoUid;
  }
}

// Executar a consulta
consultaProcessoTJAL()
  .then(uid => {
    if (uid) {
      console.log(`\nProcesso consultado e salvo com sucesso! UID: ${uid}`);
    } else {
      console.log('\nProcesso não foi salvo devido a erros.');
    }
  })
  .catch(error => {
    console.error('Erro na execução do script:', error);
  });
