/**
 * Script para extrair dados de eleitor do TRE
 * Usando Playwright para automação
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Configurações
const config = {
  url: 'https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral#/atendimento-eleitor/onde-votar',
  tempoEsperaCarregamento: 5000, // 5 segundos
  tempoEsperaCaptcha: 30000, // 30 segundos para resolver o captcha manualmente
};

/**
 * Função principal para extrair dados do eleitor no TRE
 */
async function extrairDadosEleitor(tituloEleitor, dataNascimento, nomeMae) {
  console.log(`Iniciando extração de dados do eleitor com título ${tituloEleitor}...`);
  
  // Configurar o navegador para parecer mais humano
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  // Configurar o contexto com User-Agent de navegador real e viewport comum
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    hasTouch: false,
    locale: 'pt-BR',
    geolocation: { longitude: -47.9292, latitude: -15.7801 }, // Coordenadas aproximadas de Brasília
    permissions: ['geolocation'],
    colorScheme: 'light',
    javaScriptEnabled: true,
    acceptDownloads: true,
  });
  
  // Adicionar cookies comuns
  await context.addCookies([
    {
      name: 'visited_before',
      value: 'true',
      domain: 'www.tse.jus.br',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 dias
      httpOnly: false,
      secure: true,
      sameSite: 'Lax'
    },
    {
      name: 'cookie_consent',
      value: 'accepted',
      domain: 'www.tse.jus.br',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 365, // 1 ano
      httpOnly: false,
      secure: true,
      sameSite: 'Lax'
    }
  ]);
  
  // Modificar o JavaScript do navegador para evitar detecção
  await context.addInitScript(() => {
    // Ocultar sinais de automação
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: 'Native Client' }
    ]});
    
    // Adicionar fingerprinting aleatório
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, attributes) {
      const context = originalGetContext.call(this, type, attributes);
      if (type === '2d') {
        const originalFillText = context.fillText;
        context.fillText = function() {
          return originalFillText.apply(this, arguments);
        }
      }
      return context;
    };
  });
  const page = await context.newPage();
  
  try {
    // ETAPA 1: ACESSAR A PÁGINA DE FORMA MAIS NATURAL
    console.log('\n=== ETAPA 1: ACESSANDO A PÁGINA ===');
    console.log(`Navegando para a página: ${config.url}`);
    
    // Primeiro acessar a página principal do TSE
    await page.goto('https://www.tse.jus.br/');
    
    // Simular comportamento humano - esperar um pouco e mover o mouse
    await page.waitForTimeout(2000 + Math.random() * 1000);
    await page.mouse.move(300 + Math.random() * 200, 200 + Math.random() * 100);
    
    // Navegar para a página de serviços eleitorais
    console.log('Navegando para a página de serviços eleitorais...');
    await page.goto('https://www.tse.jus.br/servicos-eleitorais');
    
    // Simular comportamento humano - esperar um pouco e mover o mouse
    await page.waitForTimeout(1500 + Math.random() * 1000);
    await page.mouse.move(400 + Math.random() * 200, 300 + Math.random() * 100);
    
    // Finalmente navegar para a página de autoatendimento
    console.log(`Navegando para a página de autoatendimento: ${config.url}`);
    await page.goto(config.url);
    
    // Aguardar carregamento da página com tempo variável
    const tempoEspera = config.tempoEsperaCarregamento + Math.random() * 2000;
    console.log(`Aguardando ${tempoEspera/1000} segundos para carregamento...`);
    await page.waitForTimeout(tempoEspera);
    
    // Simular rolagem da página como um humano faria
    await page.mouse.wheel(0, 100 + Math.random() * 50);
    await page.waitForTimeout(700 + Math.random() * 500);
    await page.mouse.wheel(0, 100 + Math.random() * 50);
    await page.waitForTimeout(500 + Math.random() * 300);
    
    // ETAPA 2: ACEITAR OS TERMOS (se necessário)
    console.log('\n=== ETAPA 2: ACEITANDO TERMOS ===');
    try {
      const botaoAceito = await page.waitForSelector('button:has-text("Aceito")', { timeout: 5000 });
      if (botaoAceito) {
        console.log('Clicando no botão "Aceito"...');
        await botaoAceito.click();
        await page.waitForTimeout(2000);
      }
    } catch (error) {
      console.log('Botão "Aceito" não encontrado ou já foi clicado anteriormente.');
    }
    
    // ETAPA 3: PREENCHER O FORMULÁRIO
    console.log('\n=== ETAPA 3: PREENCHENDO FORMULÁRIO ===');
    
    // Aguardar carregamento do formulário
    await page.waitForSelector('#inputDataNascimento, input[placeholder="Data de nascimento (dia/mês/ano)"]', { timeout: 10000 })
      .catch(() => console.log('Não foi possível encontrar o campo de data de nascimento. Continuando mesmo assim...'));
    
    // Simular comportamento humano ao preencher o formulário
    console.log('Preenchendo formulário de forma natural...');
    
    // Localizar o campo de CPF/título
    console.log('Localizando campo de CPF/título...');
    const cpfSelector = 'input[placeholder="Número do título eleitoral ou CPF ou nome"]';
    await page.waitForSelector(cpfSelector, { timeout: 5000 })
      .catch(() => console.log('Seletor exato não encontrado, tentando alternativas...'));
    
    // Clicar no campo e mover o mouse como um humano faria
    try {
      // Primeiro, mover o mouse para o campo
      const cpfField = await page.$(cpfSelector) || await page.$('form input[type="text"]');
      if (cpfField) {
        // Obter a posição do campo
        const box = await cpfField.boundingBox();
        if (box) {
          // Mover o mouse para o campo com uma pequena variação aleatória
          await page.mouse.move(
            box.x + box.width / 2 + (Math.random() * 10 - 5),
            box.y + box.height / 2 + (Math.random() * 6 - 3)
          );
          await page.waitForTimeout(300 + Math.random() * 200);
          
          // Clicar no campo
          await page.mouse.click(
            box.x + box.width / 2 + (Math.random() * 10 - 5),
            box.y + box.height / 2 + (Math.random() * 6 - 3)
          );
          await page.waitForTimeout(200 + Math.random() * 100);
          
          // Digitar o CPF/título caractere por caractere com velocidade variável
          console.log('Digitando CPF/título caractere por caractere...');
          for (const char of tituloEleitor) {
            await page.keyboard.type(char, { delay: 50 + Math.random() * 150 });
            await page.waitForTimeout(10 + Math.random() * 40);
          }
          console.log('CPF/título digitado com sucesso.');
        } else {
          throw new Error('Não foi possível obter a posição do campo');
        }
      } else {
        throw new Error('Campo de CPF/título não encontrado');
      }
    } catch (error) {
      console.log(`Erro ao digitar CPF/título: ${error.message}`);
      console.log('Tentando método alternativo...');
      await page.fill(cpfSelector, tituloEleitor)
        .catch(() => console.log('Erro ao preencher CPF/título usando fill.'));
    }
    
    // Pequena pausa entre campos como um humano faria
    await page.waitForTimeout(800 + Math.random() * 700);
    
    // Preencher data de nascimento
    console.log('Preenchendo data de nascimento...');
    try {
      const dataSelector = '#inputDataNascimento, input[placeholder="Data de nascimento (dia/mês/ano)"]';
      const dataField = await page.$(dataSelector);
      if (dataField) {
        // Obter a posição do campo
        const box = await dataField.boundingBox();
        if (box) {
          // Mover o mouse para o campo
          await page.mouse.move(
            box.x + box.width / 2 + (Math.random() * 10 - 5),
            box.y + box.height / 2 + (Math.random() * 6 - 3)
          );
          await page.waitForTimeout(300 + Math.random() * 200);
          
          // Clicar no campo
          await page.mouse.click(
            box.x + box.width / 2 + (Math.random() * 10 - 5),
            box.y + box.height / 2 + (Math.random() * 6 - 3)
          );
          await page.waitForTimeout(200 + Math.random() * 100);
          
          // Digitar a data caractere por caractere
          for (const char of dataNascimento) {
            await page.keyboard.type(char, { delay: 50 + Math.random() * 150 });
            await page.waitForTimeout(10 + Math.random() * 40);
          }
          console.log('Data de nascimento digitada com sucesso.');
        } else {
          throw new Error('Não foi possível obter a posição do campo de data');
        }
      } else {
        throw new Error('Campo de data não encontrado');
      }
    } catch (error) {
      console.log(`Erro ao digitar data de nascimento: ${error.message}`);
      console.log('Tentando método alternativo...');
      await page.fill('#inputDataNascimento, input[placeholder="Data de nascimento (dia/mês/ano)"]', dataNascimento)
        .catch(() => console.log('Erro ao preencher data de nascimento usando fill.'));
    }
    
    // Pequena pausa entre campos
    await page.waitForTimeout(800 + Math.random() * 700);
    
    // Preencher nome da mãe (se fornecido)
    if (nomeMae) {
      console.log('Preenchendo nome da mãe...');
      try {
        const maeSelector = 'input[placeholder="Nome da mãe"]';
        const maeField = await page.$(maeSelector);
        if (maeField) {
          // Obter a posição do campo
          const box = await maeField.boundingBox();
          if (box) {
            // Mover o mouse para o campo
            await page.mouse.move(
              box.x + box.width / 2 + (Math.random() * 10 - 5),
              box.y + box.height / 2 + (Math.random() * 6 - 3)
            );
            await page.waitForTimeout(300 + Math.random() * 200);
            
            // Clicar no campo
            await page.mouse.click(
              box.x + box.width / 2 + (Math.random() * 10 - 5),
              box.y + box.height / 2 + (Math.random() * 6 - 3)
            );
            await page.waitForTimeout(200 + Math.random() * 100);
            
            // Digitar o nome da mãe caractere por caractere
            for (const char of nomeMae) {
              await page.keyboard.type(char, { delay: 40 + Math.random() * 120 });
              await page.waitForTimeout(5 + Math.random() * 30);
            }
            console.log('Nome da mãe digitado com sucesso.');
          } else {
            throw new Error('Não foi possível obter a posição do campo de nome da mãe');
          }
        } else {
          throw new Error('Campo de nome da mãe não encontrado');
        }
      } catch (error) {
        console.log(`Erro ao digitar nome da mãe: ${error.message}`);
        console.log('Tentando método alternativo...');
        await page.fill('input[placeholder="Nome da mãe"]', nomeMae)
          .catch(() => console.log('Erro ao preencher nome da mãe usando fill.'));
      }
    } else {
      // Se não tiver nome da mãe, marcar a opção "Não consta"
      console.log('Marcando opção "Não consta" para nome da mãe...');
      try {
        const checkboxSelector = 'input[type="checkbox"][id*="nao-consta"]';
        const checkbox = await page.$(checkboxSelector);
        if (checkbox) {
          // Obter a posição do checkbox
          const box = await checkbox.boundingBox();
          if (box) {
            // Mover o mouse para o checkbox
            await page.mouse.move(
              box.x + box.width / 2 + (Math.random() * 4 - 2),
              box.y + box.height / 2 + (Math.random() * 4 - 2)
            );
            await page.waitForTimeout(300 + Math.random() * 200);
            
            // Clicar no checkbox
            await page.mouse.click(
              box.x + box.width / 2 + (Math.random() * 4 - 2),
              box.y + box.height / 2 + (Math.random() * 4 - 2)
            );
            console.log('Opção "Não consta" marcada com sucesso.');
          } else {
            throw new Error('Não foi possível obter a posição do checkbox');
          }
        } else {
          throw new Error('Checkbox "Não consta" não encontrado');
        }
      } catch (error) {
        console.log(`Erro ao marcar opção "Não consta": ${error.message}`);
        console.log('Tentando método alternativo...');
        await page.click('input[type="checkbox"][id*="nao-consta"]')
          .catch(() => console.log('Erro ao marcar opção "Não consta" usando click.'));
      }
    }
    
    // ETAPA 4: AGUARDAR RESOLUÇÃO DO CAPTCHA MANUALMENTE
    console.log('\n=== ETAPA 4: AGUARDANDO RESOLUÇÃO DO CAPTCHA ===');
    console.log(`Por favor, resolva o captcha manualmente. Aguardando ${config.tempoEsperaCaptcha/1000} segundos...`);
    console.log('Após resolver o captcha, o script clicará no botão "Entrar".');
    
    // Aguardar tempo para resolução manual do captcha
    await page.waitForTimeout(config.tempoEsperaCaptcha);
    
    // Clicar no botão Entrar - baseado no print 4
    console.log('Clicando no botão "Entrar"...');
    await page.click('button.btn-tse, button[type="submit"][class*="btn-tse"], button:has-text("Entrar")')
      .catch(() => console.log('Erro ao clicar no botão "Entrar". Tentando alternativas...'));
      
    // Tentar alternativas caso o botão não seja encontrado
    if (!(await page.$('button.btn-tse, button[type="submit"][class*="btn-tse"], button:has-text("Entrar")'))) {
      console.log('Tentando alternativas para o botão de envio...');
      await page.click('.btn-tse, .btn-primary, [type="submit"]')
        .catch(() => console.log('Erro ao clicar em alternativas para o botão de envio.'));
    }
    
    // ETAPA 5: EXTRAIR OS DADOS
    console.log('\n=== ETAPA 5: EXTRAINDO DADOS ===');
    console.log('Aguardando carregamento dos resultados...');
    
    // Aguardar carregamento dos resultados (ajustar seletor conforme necessário)
    await page.waitForSelector('.resultado, .dados-eleitor, [id*="resultado"]', { timeout: 10000 })
      .catch(() => console.log('Não foi possível encontrar os resultados. Continuando mesmo assim...'));
    
    // Extrair dados da página
    const dadosEleitor = await page.evaluate(() => {
      // Função para extrair texto de um seletor
      function extrairTexto(seletor) {
        const elemento = document.querySelector(seletor);
        return elemento ? elemento.textContent.trim() : '';
      }
      
      // Extrair todos os dados relevantes da página
      // Ajustar seletores conforme a estrutura real da página
      return {
        nome: extrairTexto('[id*="nome"], .nome-eleitor'),
        numeroInscricao: extrairTexto('[id*="inscricao"], .numero-inscricao'),
        situacao: extrairTexto('[id*="situacao"], .situacao-eleitor'),
        localVotacao: extrairTexto('[id*="local"], .local-votacao'),
        endereco: extrairTexto('[id*="endereco"], .endereco-votacao'),
        municipio: extrairTexto('[id*="municipio"], .municipio-votacao'),
        uf: extrairTexto('[id*="uf"], .uf-votacao'),
        zona: extrairTexto('[id*="zona"], .zona-eleitoral'),
        secao: extrairTexto('[id*="secao"], .secao-eleitoral'),
        // Adicionar outros campos conforme necessário
      };
    });
    
    console.log('\n----- DADOS DO ELEITOR -----');
    console.log(JSON.stringify(dadosEleitor, null, 2));
    
    // Salvar dados em arquivo JSON
    const nomeArquivo = `dados-eleitor-${tituloEleitor.replace(/[^0-9]/g, '')}.json`;
    fs.writeFileSync(nomeArquivo, JSON.stringify(dadosEleitor, null, 2), { encoding: 'utf8' });
    console.log(`\nDados salvos em ${nomeArquivo}`);
    
    // Tirar screenshot da página com os resultados
    const screenshotArquivo = `eleitor-${tituloEleitor.replace(/[^0-9]/g, '')}.png`;
    await page.screenshot({ path: screenshotArquivo, fullPage: true });
    console.log(`Screenshot salvo em ${screenshotArquivo}`);
    
    // Manter o navegador aberto por um tempo para visualização
    console.log('\nAguardando 10 segundos para visualização manual...');
    await page.waitForTimeout(10000);
    
    return dadosEleitor;
  } catch (error) {
    console.error(`Erro durante a extração: ${error.message}`);
    console.error(error.stack);
    
    // Tirar screenshot em caso de erro
    const errorScreenshot = `erro-eleitor-${tituloEleitor.replace(/[^0-9]/g, '')}.png`;
    await page.screenshot({ path: errorScreenshot, fullPage: true });
    console.log(`Screenshot do erro salvo em ${errorScreenshot}`);
    
    // Aguardar 10 segundos antes de fechar para poder ver o erro
    console.log('Aguardando 10 segundos antes de fechar...');
    await page.waitForTimeout(10000);
    
    throw error;
  } finally {
    // Fechar o navegador
    await browser.close();
    console.log('Navegador fechado.');
  }
}

// Função para executar a extração com dados reais
async function executarExtracao() {
  // Dados reais fornecidos pelo usuário
  const tituloEleitor = '08990802431'; // CPF/Título do eleitor
  const dataNascimento = '24/12/1989';  // Formato: DD/MM/AAAA
  const nomeMae = 'Marilene Francisca Mendes'; // Nome da mãe
  
  try {
    await extrairDadosEleitor(tituloEleitor, dataNascimento, nomeMae);
    console.log('Script concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao executar script:', error);
    process.exit(1);
  }
}

// Executar o script
executarExtracao();
