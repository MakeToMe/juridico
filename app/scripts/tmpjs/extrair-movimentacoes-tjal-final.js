/**
 * Script final para extrair todas as movimentações de um processo no TJAL
 * Acessa diretamente a URL do processo e extrai as movimentações
 */

const { chromium } = require('playwright');

// Número do processo a ser consultado
const NUMERO_PROCESSO = '0727108-89.2024.8.02.0001';

// URL direta do processo
const URL_PROCESSO = `https://www2.tjal.jus.br/cpopg/show.do?processo.codigo=01001NT870000&processo.foro=1&processo.numero=${NUMERO_PROCESSO}`;

// Credenciais para acesso ao TJAL
const credenciais = {
  site: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '847.698.584-34',
  senha: '8476guardia'
};

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
    
    // ETAPA 3: EXTRAIR MOVIMENTAÇÕES DO PROCESSO
    console.log('\n=== ETAPA 3: EXTRAINDO MOVIMENTAÇÕES DO PROCESSO ===');
    
    // Aguardar um pouco para garantir que todos os elementos estejam carregados
    console.log('Aguardando 5 segundos para garantir carregamento completo da página...');
    await page.waitForTimeout(5000);
    
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
    
    // Extrair movimentações
    console.log('Extraindo movimentações...');
    
    // Primeiro, vamos tentar identificar a tabela de movimentações
    const tabelaMovimentacoes = await page.evaluate(() => {
      // Função para verificar se um elemento é uma tabela de movimentações
      function isTabelaMovimentacoes(tabela) {
        // Verificar se tem pelo menos uma linha com data no formato DD/MM/AAAA
        const linhas = tabela.querySelectorAll('tr');
        if (linhas.length <= 1) return false;
        
        let temData = false;
        for (const linha of linhas) {
          const colunas = linha.querySelectorAll('td');
          if (colunas.length >= 2) {
            const textoColuna1 = colunas[0].textContent.trim();
            if (textoColuna1.match(/\d{2}\/\d{2}\/\d{4}/)) {
              temData = true;
              break;
            }
          }
        }
        
        return temData;
      }
      
      // Procurar tabelas que possam ser de movimentações
      const tabelas = document.querySelectorAll('table');
      for (const tabela of tabelas) {
        if (isTabelaMovimentacoes(tabela)) {
          return tabela.outerHTML;
        }
      }
      
      // Se não encontrou, procurar por ID específico
      const tabelaEspecifica = document.querySelector('#tabelaTodasMovimentacoes, #tabelaUltimasMovimentacoes');
      if (tabelaEspecifica) {
        return tabelaEspecifica.outerHTML;
      }
      
      return null;
    });
    
    if (tabelaMovimentacoes) {
      console.log('Tabela de movimentações encontrada!');
    } else {
      console.log('Tabela de movimentações não encontrada. Tentando outras abordagens...');
    }
    
    // Extrair as movimentações
    const movimentacoes = await page.evaluate(() => {
      // Função para limpar texto
      function limparTexto(texto) {
        if (!texto) return '';
        return texto.replace(/\s+/g, ' ').trim();
      }
      
      const resultado = [];
      
      // Tentar encontrar a tabela de movimentações
      const tabela = document.querySelector('#tabelaTodasMovimentacoes') || 
                     document.querySelector('#tabelaUltimasMovimentacoes');
      
      if (tabela) {
        console.log('Encontrada tabela de movimentações pelo ID');
        
        // Extrair todas as linhas da tabela
        const linhas = tabela.querySelectorAll('tr');
        
        for (const linha of linhas) {
          const colunas = linha.querySelectorAll('td');
          
          if (colunas.length >= 2) {
            const data = limparTexto(colunas[0].textContent);
            const descricao = limparTexto(colunas[1].textContent);
            
            if (data && descricao && data.match(/\d{2}\/\d{2}\/\d{4}/)) {
              resultado.push({
                data,
                descricao
              });
            }
          }
        }
      } else {
        console.log('Tabela de movimentações não encontrada pelo ID, buscando por estrutura');
        
        // Buscar todas as tabelas e verificar se alguma tem formato de movimentações
        const tabelas = document.querySelectorAll('table');
        
        for (const tabela of tabelas) {
          // Verificar se é uma tabela de movimentações
          const linhas = tabela.querySelectorAll('tr');
          let temData = false;
          
          for (const linha of linhas) {
            const colunas = linha.querySelectorAll('td');
            if (colunas.length >= 2) {
              const textoColuna1 = colunas[0].textContent.trim();
              if (textoColuna1.match(/\d{2}\/\d{2}\/\d{4}/)) {
                temData = true;
                break;
              }
            }
          }
          
          if (temData) {
            console.log('Encontrada tabela com formato de movimentações');
            
            for (const linha of linhas) {
              const colunas = linha.querySelectorAll('td');
              
              if (colunas.length >= 2) {
                const data = limparTexto(colunas[0].textContent);
                const descricao = limparTexto(colunas[1].textContent);
                
                if (data && descricao && data.match(/\d{2}\/\d{2}\/\d{4}/)) {
                  resultado.push({
                    data,
                    descricao
                  });
                }
              }
            }
            
            break; // Encontrou uma tabela de movimentações, não precisa continuar
          }
        }
      }
      
      // Se ainda não encontrou movimentações, tentar outra abordagem
      if (resultado.length === 0) {
        console.log('Nenhuma movimentação encontrada nas tabelas, buscando por estrutura alternativa');
        
        // Buscar pela seção de movimentações
        let secaoMovimentacoes = document.querySelector('#MOVIMENTACOES') || 
                               document.querySelector('.secaoMovimentacoes');
        
        // Se não encontrou pelos seletores diretos, buscar por cabeçalhos
        if (!secaoMovimentacoes) {
          const h2Elements = document.querySelectorAll('h2');
          for (const h2 of h2Elements) {
            if (h2.textContent.includes('MOVIMENTAÇÕES')) {
              secaoMovimentacoes = h2.parentElement;
              break;
            }
          }
        }
        
        if (secaoMovimentacoes) {
          console.log('Encontrada seção de movimentações');
          
          // Buscar todas as linhas ou divs que possam conter movimentações
          const elementosMovimentacao = secaoMovimentacoes.querySelectorAll('tr, div.movimentacao, div.linha');
          
          for (const elem of elementosMovimentacao) {
            const textoCompleto = elem.textContent.trim();
            const matchData = textoCompleto.match(/(\d{2}\/\d{2}\/\d{4})/);
            
            if (matchData) {
              const data = matchData[1];
              let descricao = '';
              
              // Tentar extrair a descrição
              const elementosDescricao = elem.querySelectorAll('td, div.descricao');
              
              if (elementosDescricao.length > 1) {
                // Se tem mais de um elemento, o segundo provavelmente é a descrição
                descricao = limparTexto(elementosDescricao[1].textContent);
              } else {
                // Caso contrário, extrair do texto completo
                descricao = textoCompleto.substring(textoCompleto.indexOf(data) + data.length).trim();
                descricao = descricao.replace(/^[\s:-]*/, '').trim();
              }
              
              if (descricao) {
                resultado.push({
                  data,
                  descricao
                });
              }
            }
          }
        }
      }
      
      return resultado;
    });
    
    // Exibir as movimentações encontradas
    console.log('\n===== MOVIMENTAÇÕES ENCONTRADAS =====');
    if (movimentacoes && movimentacoes.length > 0) {
      console.log(JSON.stringify(movimentacoes, null, 2));
      
      console.log(`\n----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoes.length} -----`);
      movimentacoes.forEach((mov, index) => {
        console.log(`${index + 1}. [${mov.data}] ${mov.descricao}`);
      });
    } else {
      console.log('Nenhuma movimentação encontrada.');
    }
    
    // Tentar uma abordagem mais direta: analisar o HTML da página
    console.log('\nTentando abordagem direta: analisando o HTML da página...');
    
    // Obter o HTML completo da página
    const htmlCompleto = await page.content();
    
    // Salvar o HTML para análise
    const fs = require('fs');
    fs.writeFileSync('pagina-processo.html', htmlCompleto);
    console.log('HTML da página salvo em pagina-processo.html');
    
    // Extrair movimentações do HTML usando regex
    const movimentacoesRegex = await page.evaluate(() => {
      const resultado = [];
      
      // Obter o HTML completo da página
      const html = document.documentElement.outerHTML;
      
      // Usar regex para encontrar padrões de data seguidos por descrição
      const regex = /<td[^>]*>(\d{2}\/\d{2}\/\d{4})<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
      let match;
      
      while ((match = regex.exec(html)) !== null) {
        const data = match[1].trim();
        // Limpar a descrição (remover tags HTML e espaços extras)
        let descricao = match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (data && descricao) {
          resultado.push({
            data,
            descricao
          });
        }
      }
      
      return resultado;
    });
    
    // Exibir as movimentações encontradas com regex
    if (movimentacoesRegex && movimentacoesRegex.length > 0) {
      console.log('\n===== MOVIMENTAÇÕES ENCONTRADAS COM REGEX =====');
      console.log(JSON.stringify(movimentacoesRegex, null, 2));
      
      console.log(`\n----- TOTAL DE MOVIMENTAÇÕES (REGEX): ${movimentacoesRegex.length} -----`);
      movimentacoesRegex.forEach((mov, index) => {
        console.log(`${index + 1}. [${mov.data}] ${mov.descricao}`);
      });
    }
    
    // Combinar os resultados (remover duplicatas)
    const todasMovimentacoes = [...movimentacoes];
    
    // Adicionar movimentações encontradas com regex que não estão no primeiro conjunto
    for (const movRegex of movimentacoesRegex) {
      const jaExiste = todasMovimentacoes.some(
        mov => mov.data === movRegex.data && mov.descricao === movRegex.descricao
      );
      
      if (!jaExiste) {
        todasMovimentacoes.push(movRegex);
      }
    }
    
    // Ordenar por data (mais recente primeiro)
    todasMovimentacoes.sort((a, b) => {
      const dataA = a.data.split('/').reverse().join('');
      const dataB = b.data.split('/').reverse().join('');
      return dataB.localeCompare(dataA);
    });
    
    // Exibir todas as movimentações encontradas
    console.log('\n===== TODAS AS MOVIMENTAÇÕES ENCONTRADAS =====');
    console.log(JSON.stringify(todasMovimentacoes, null, 2));
    
    console.log(`\n----- TOTAL DE MOVIMENTAÇÕES COMBINADAS: ${todasMovimentacoes.length} -----`);
    todasMovimentacoes.forEach((mov, index) => {
      console.log(`${index + 1}. [${mov.data}] ${mov.descricao}`);
    });
    
    // Aguardar para visualização manual
    console.log('\nAguardando 180 segundos (3 minutos) para visualização manual...');
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    // Manter o navegador aberto por 3 minutos
    await page.waitForTimeout(180000);
    
    console.log('Extração de movimentações concluída com sucesso!');
    
    return todasMovimentacoes;
    
  } catch (error) {
    console.error('Erro durante a extração de movimentações:', error);
    console.error('Stack trace:', error.stack);
    
    // Tirar screenshot em caso de erro
    try {
      if (page) {
        await page.screenshot({ path: './tjal-erro.png' });
        console.log('Screenshot do erro salvo como tjal-erro.png');
        
        // Aguardar um tempo para visualização manual mesmo em caso de erro
        console.log('Aguardando 60 segundos para visualização manual do erro...');
        await page.waitForTimeout(60000);
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
  .then(movimentacoes => {
    console.log('\nScript finalizado com sucesso.');
    
    // Salvar as movimentações em um arquivo JSON para referência
    const fs = require('fs');
    fs.writeFileSync('movimentacoes.json', JSON.stringify(movimentacoes, null, 2));
    console.log('Movimentações salvas em movimentacoes.json');
  })
  .catch(error => {
    console.error('Erro na execução do script:', error);
  });
