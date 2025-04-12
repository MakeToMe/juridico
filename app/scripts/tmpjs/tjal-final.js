/**
 * Script para extrair movimentações do TJAL
 * Usando a sequência correta de URLs e o seletor tr.containerMovimentacao
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// URLs corretas
const URL_LOGIN = 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check';
const URL_CONSULTA = 'https://www2.tjal.jus.br/cpopg/open.do';

// Credenciais para acesso ao TJAL
const credenciais = {
  usuario: '84769858434',
  senha: '8476guardia'
};

/**
 * Função principal para extrair movimentações
 */
async function extrairMovimentacoesTJAL() {
  console.log(`Iniciando extração de movimentações do processo ${NUMERO_PROCESSO} no TJAL...`);
  
  const browser = await chromium.launch({
    headless: false,  // Modo não-headless para visualização
    slowMo: 100  // Adicionar um pequeno atraso para visualização
  });
  
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });
  
  const page = await context.newPage();
  
  try {
    // ETAPA 1: FAZER LOGIN
    console.log('\n=== ETAPA 1: FAZENDO LOGIN ===');
    console.log(`Navegando para a página de login: ${URL_LOGIN}`);
    await page.goto(URL_LOGIN);
    
    // Preencher credenciais
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', credenciais.usuario);
    await page.fill('#passwordForm', credenciais.senha);
    
    // Clicar no botão de login
    console.log('Clicando no botão de login...');
    await page.click('#pbEntrar');
    
    // Aguardar apenas 3 segundos após o login
    console.log('Aguardando 3 segundos após o login...');
    await page.waitForTimeout(3000);
    
    // Verificar URL após login
    const urlAposLogin = page.url();
    console.log(`URL após login: ${urlAposLogin}`);
    
    // ETAPA 2: NAVEGAR PARA PÁGINA DE CONSULTA
    console.log('\n=== ETAPA 2: NAVEGANDO PARA PÁGINA DE CONSULTA ===');
    console.log(`Navegando para a página de consulta: ${URL_CONSULTA}`);
    await page.goto(URL_CONSULTA);
    
    // Aguardar carregamento da página de consulta
    await page.waitForSelector('#radioNumeroUnificado');
    console.log('Página de consulta carregada com sucesso.');
    
    // ETAPA 3: PREENCHER DADOS DO PROCESSO
    console.log('\n=== ETAPA 3: PREENCHENDO DADOS DO PROCESSO ===');
    
    // Selecionar o radio button "Unificado"
    console.log('Selecionando opção de número unificado...');
    await page.click('#radioNumeroUnificado');
    
    // Olhando a imagem, preciso preencher exatamente:
    // Primeiro campo: "0727108-89.2024"
    // Último campo: "0001"
    
    console.log('Preenchendo o número do processo exatamente como na imagem');
    const primeiroCampo = '0727108-89.2024';
    const ultimoCampo = '0001';
    
    // Preencher os campos do número do processo exatamente como na imagem
    await page.fill('#numeroDigitoAnoUnificado', primeiroCampo);
    await page.fill('#foroNumeroUnificado', ultimoCampo);
    
    // ETAPA 4: CONSULTAR PROCESSO
    console.log('\n=== ETAPA 4: CONSULTANDO PROCESSO ===');
    
    // Clicar no botão de consulta
    console.log('Clicando no botão de consulta...');
    await page.click('#botaoConsultarProcessos');
    
    // Aguardar carregamento da página de detalhes do processo
    console.log('Aguardando carregamento da página de detalhes...');
    await page.waitForSelector('#containerDadosPrincipaisProcesso', { timeout: 30000 });
    console.log('Página de detalhes do processo carregada com sucesso!');
    
    // ETAPA 5: EXTRAIR MOVIMENTAÇÕES
    console.log('\n=== ETAPA 5: EXTRAINDO MOVIMENTAÇÕES ===');
    
    // Verificar se há botão para expandir todas as movimentações
    const botaoExpandirTodas = await page.$('#todasMovimentacoes');
    
    if (botaoExpandirTodas) {
      console.log('Encontrado botão para expandir todas as movimentações, clicando...');
      await botaoExpandirTodas.click();
      console.log('Aguardando 3 segundos para carregar todas as movimentações...');
      await page.waitForTimeout(3000);
    }
    
    // Extrair movimentações usando o seletor tr.containerMovimentacao
    console.log('Extraindo movimentações usando o seletor tr.containerMovimentacao...');
    
    const movimentacoes = await page.evaluate(() => {
      // Função para limpar texto
      function limparTexto(texto) {
        if (!texto) return '';
        return texto.replace(/\s+/g, ' ').trim();
      }
      
      // Usar o seletor específico tr.containerMovimentacao
      const movs = Array.from(document.querySelectorAll('tr.containerMovimentacao')).map(row => {
        const colunas = row.querySelectorAll('td');
        const data = colunas[0]?.innerText.trim() || '';
        const descricao = colunas[1]?.innerText.trim() || '';
        
        return {
          data,
          descricao: limparTexto(descricao)
        };
      });
      
      console.log(`Encontradas ${movs.length} movimentações com o seletor específico.`);
      
      // Se não encontramos nada com o seletor específico, tentar abordagem alternativa
      if (movs.length === 0) {
        console.log('Tentando abordagem alternativa para extrair movimentações...');
        
        // Buscar todas as tabelas que podem conter movimentações
        const tabelas = document.querySelectorAll('table');
        
        tabelas.forEach(tabela => {
          const linhas = tabela.querySelectorAll('tr');
          
          linhas.forEach(linha => {
            const colunas = linha.querySelectorAll('td');
            
            if (colunas.length >= 2) {
              const data = colunas[0].textContent.trim();
              const descricao = colunas[1].textContent.trim();
              
              // Verificar se a primeira coluna parece uma data
              if (data.match(/\d{2}\/\d{2}\/\d{4}/)) {
                movs.push({
                  data,
                  descricao: limparTexto(descricao)
                });
              }
            }
          });
        });
      }
      
      return movs;
    });
    
    // Exibir movimentações encontradas
    console.log(`\n----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoes.length} -----`);
    
    if (movimentacoes.length > 0) {
      movimentacoes.forEach((mov, index) => {
        console.log(`${index + 1}. [${mov.data}] ${mov.descricao || '(sem descrição)'}`);
      });
      
      // Salvar movimentações em arquivo para referência
      fs.writeFileSync('movimentacoes-extraidas.json', JSON.stringify(movimentacoes, null, 2));
      console.log('\nMovimentações salvas em movimentacoes-extraidas.json');
    } else {
      console.log('Nenhuma movimentação encontrada.');
    }
    
    // Aguardar para visualização manual
    console.log('\nAguardando 180 segundos (3 minutos) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    await page.waitForTimeout(180000); // 3 minutos
    
  } catch (error) {
    console.error('Erro durante a extração:', error);
    
    // Tirar screenshot em caso de erro
    try {
      await page.screenshot({ path: 'erro.png', fullPage: true });
      console.log('Screenshot do erro salvo como erro.png');
    } catch (screenshotError) {
      console.error('Erro ao tirar screenshot:', screenshotError);
    }
  } finally {
    // Fechar o navegador
    await browser.close();
    console.log('Navegador fechado.');
  }
}

// Executar a extração
extrairMovimentacoesTJAL()
  .then(() => console.log('Script concluído com sucesso!'))
  .catch(error => console.error('Erro na execução do script:', error));
