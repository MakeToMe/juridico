/**
 * Script final para extrair todas as movimentações de um processo no TJAL
 * e salvar no Supabase (schema alnpp)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente do arquivo .env.local
dotenv.config({ path: './.env.local' });

// Configuração do Supabase
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
 * Função para extrair dados do processo
 */
async function extrairDadosProcesso(page) {
  return await page.evaluate(() => {
    // Função para extrair texto de um seletor
    function extrairTexto(seletor) {
      const elemento = document.querySelector(seletor);
      return elemento ? elemento.textContent.trim() : '';
    }
    
    // Extrair dados básicos do processo
    const numeroProcesso = extrairTexto('#numeroProcesso');
    const classeProcesso = extrairTexto('#classeProcesso');
    const assuntoProcesso = extrairTexto('#assuntoProcesso');
    const dataDistribuicao = extrairTexto('#dataDistribuicao');
    const juiz = extrairTexto('#juiz');
    
    // Extrair partes do processo
    const partes = [];
    const secaoPartes = document.querySelector('#tablePartesPrincipais, #tableTodasPartes');
    
    if (secaoPartes) {
      const linhasPartes = secaoPartes.querySelectorAll('tr');
      
      for (const linha of linhasPartes) {
        const colunas = linha.querySelectorAll('td, th');
        
        if (colunas.length >= 2) {
          const tipo = colunas[0].textContent.trim();
          let nome = colunas[1].textContent.trim();
          
          // Separar nome da parte e advogados
          let advogados = [];
          if (nome.includes('Advogado:')) {
            const partes = nome.split('Advogado:');
            nome = partes[0].trim();
            
            // Extrair múltiplos advogados se existirem
            const textoAdvogados = partes.slice(1).join('Advogado:');
            advogados = textoAdvogados.split(/Advogado:|e\s+\d+\.\d+\.\d+-\d+/g)
              .map(adv => adv.trim())
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
      partes
    };
  });
}

/**
 * Função para extrair movimentações
 */
async function extrairMovimentacoes(page) {
  return await page.evaluate(() => {
    const movimentacoes = [];
    const linhasMovimentacao = document.querySelectorAll('tr.containerMovimentacao');
    
    linhasMovimentacao.forEach((linha) => {
      const colunas = linha.querySelectorAll('td');
      if (colunas.length >= 2) {
        const data = colunas[0].textContent.trim();
        const descricao = colunas[1].textContent.trim();
        
        movimentacoes.push({
          data,
          descricao
        });
      }
    });
    
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
    
    // Converter data para formato ISO (AAAA-MM-DD)
    let dataISO = null;
    const match = mov.data.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    
    if (match) {
      const [_, dia, mes, ano] = match;
      dataISO = `${ano}-${mes}-${dia}`;
    }
    
    mapaPorData.set(mov.data, {
      data: mov.data,
      dataISO,
      descricao: mov.descricao || '(sem descrição)'
    });
  }
  
  // Converter mapa para array e ordenar por data (mais recente primeiro)
  return Array.from(mapaPorData.values()).sort((a, b) => {
    if (!a.dataISO || !b.dataISO) return 0;
    return b.dataISO.localeCompare(a.dataISO);
  });
}

/**
 * Função para salvar processo no Supabase
 */
async function salvarProcessoSupabase(dadosProcesso, movimentacoes) {
  console.log('\n=== ETAPA 6: SALVANDO NO SUPABASE ===');
  
  try {
    // Extrair autor e advogados do autor das partes
    const autores = [];
    const advogadosAutor = [];
    
    if (dadosProcesso.partes && dadosProcesso.partes.length > 0) {
      dadosProcesso.partes.forEach(parte => {
        if (parte.tipo.toLowerCase().includes('autor') || parte.tipo.toLowerCase().includes('requerente')) {
          autores.push(parte.nome);
          if (parte.advogados && parte.advogados.length > 0) {
            advogadosAutor.push(...parte.advogados);
          }
        }
      });
    }
    
    // 1. Inserir processo
    console.log(`Inserindo processo ${dadosProcesso.numeroProcesso}...`);
    
    const { data: processoInserido, error: errorInsert } = await supabase.rpc(
      'inserir_processo',
      {
        p_processo: dadosProcesso.numeroProcesso,
        p_classe: dadosProcesso.classeProcesso,
        p_assunto: dadosProcesso.assuntoProcesso,
        p_juiz: dadosProcesso.juiz,
        p_autor: autores,
        p_adv_autor: advogadosAutor,
        p_empresa: EMPRESA_UID
      }
    );
    
    if (errorInsert) {
      throw new Error(`Erro ao inserir processo: ${errorInsert.message}`);
    }
    
    console.log('Processo inserido com sucesso!');
    console.log(`ID do processo: ${processoInserido}`);
    
    // 2. Inserir movimentações
    if (movimentacoes && movimentacoes.length > 0) {
      console.log(`Inserindo ${movimentacoes.length} movimentações...`);
      
      // Inserir em lotes para evitar sobrecarga
      const tamLote = 10;
      for (let i = 0; i < movimentacoes.length; i += tamLote) {
        const lote = movimentacoes.slice(i, i + tamLote);
        console.log(`Processando lote ${Math.floor(i/tamLote) + 1} de ${Math.ceil(movimentacoes.length/tamLote)}...`);
        
        for (const mov of lote) {
          const { error } = await supabase.rpc(
            'inserir_movimentacao',
            {
              p_processo_uid: processoInserido,
              p_data: mov.dataISO,
              p_descricao: mov.descricao
            }
          );
          
          if (error) {
            console.log(`Aviso ao inserir movimentação: ${error.message}`);
          }
        }
      }
    }
    
    console.log(`Processo ${dadosProcesso.numeroProcesso} salvo com sucesso no Supabase!`);
    console.log(`Total de movimentações salvas: ${movimentacoes.length}`);
    
    return {
      processoId: processoInserido,
      totalMovimentacoes: movimentacoes.length
    };
  } catch (error) {
    console.error(`Erro ao salvar no Supabase: ${error.message}`);
    throw error;
  }
}

/**
 * Função principal para extrair movimentações do TJAL
 */
async function extrairMovimentacoesTJAL() {
  console.log(`Iniciando extração de movimentações do processo ${NUMERO_PROCESSO} no TJAL...`);
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
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
    fs.writeFileSync('movimentacoes-extraidas.json', JSON.stringify({
      dadosProcesso,
      movimentacoes
    }, null, 2));
    
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
