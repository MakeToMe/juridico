/**
 * Módulo para consulta de processos no TJPE (Tribunal de Justiça de Pernambuco)
 */

import { Page } from 'playwright';

interface Credenciais {
  usuario: string;
  senha: string;
}

interface ResultadoConsulta {
  sucesso: boolean;
  mensagem: string;
  detalhesAcessados: boolean;
  erro?: string;
}

/**
 * Função para separar o número do processo em suas partes componentes
 * @param numeroCompleto Número do processo no formato CNJ
 * @returns Objeto com as partes separadas do número
 */
function separarNumeroProcesso(numeroCompleto: string) {
  // Remover caracteres não numéricos
  const numeroLimpo = numeroCompleto.replace(/[^0-9]/g, '');
  
  // Separar as partes do número (formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO)
  return {
    sequencial: numeroLimpo.substring(0, 7),
    digito: numeroLimpo.substring(7, 9),
    ano: numeroLimpo.substring(9, 13),
    justica: numeroLimpo.substring(13, 14),
    tribunal: numeroLimpo.substring(14, 16),
    origem: numeroLimpo.substring(16, 20)
  };
}

/**
 * Realiza o login no sistema PJe do TJPE
 * @param page Instância da página do Playwright
 * @param credenciais Credenciais para acesso ao site
 * @returns Objeto indicando sucesso ou falha no login
 */
export async function realizarLoginTJPE(page: Page, credenciais: Credenciais): Promise<boolean> {
  try {
    console.log('Navegando para a página de login do TJPE...');
    
    // URL direta para o PJe do TJPE
    const urlPje = 'https://pje.tjpe.jus.br/1g/login.seam';
    
    // Navegar para o site do PJe com timeout aumentado
    await page.goto(urlPje, { 
      timeout: 60000, 
      waitUntil: 'networkidle' 
    });
    
    console.log('Verificando se o formulário de login está presente...');
    await page.waitForSelector('#username', { timeout: 30000 });
    
    console.log('Preenchendo credenciais...');
    await page.fill('#username', credenciais.usuario);
    await page.fill('#password', credenciais.senha);
    
    console.log('Clicando no botão de login...');
    await Promise.all([
      page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
      page.click('#kc-login')
    ]);
    
    // Verificar se o login foi bem-sucedido
    const urlAposLogin = page.url();
    console.log(`URL após login: ${urlAposLogin}`);
    
    // Verificar se há algum elemento que indique erro de login
    const erroLogin = await page.$('.alert-error, .alert-danger, .error-message');
    if (erroLogin) {
      console.error('Erro de login detectado');
      return false;
    }
    
    // Verificar se estamos em uma página válida após o login
    if (urlAposLogin.includes('pje') && urlAposLogin.includes('tjpe.jus.br')) {
      console.log('Login realizado com sucesso!');
      return true;
    } else {
      console.error('Redirecionamento após login não ocorreu como esperado');
      return false;
    }
  } catch (error) {
    console.error('Erro durante o login:', error);
    return false;
  }
}

/**
 * Consulta um processo no TJPE e acessa seus detalhes
 * @param page Instância da página do Playwright
 * @param numeroProcesso Número do processo no formato CNJ
 * @returns Objeto com o resultado da consulta
 */
export async function consultarProcessoTJPE(page: Page, numeroProcesso: string): Promise<ResultadoConsulta> {
  try {
    console.log(`Consultando processo ${numeroProcesso} no TJPE...`);
    
    // Navegar para a página de consulta
    console.log('Navegando para a página de consulta de processos...');
    await page.goto('https://pje.cloud.tjpe.jus.br/1g/Processo/ConsultaProcesso/listView.seam', {
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Separar o número do processo em suas partes
    const partesNumero = separarNumeroProcesso(numeroProcesso);
    console.log('Partes do número do processo:', partesNumero);
    
    // Preencher os campos do formulário usando JavaScript
    console.log('Preenchendo os campos do formulário...');
    
    // Usar JavaScript para preencher os campos
    await page.evaluate((partes) => {
      // Função para encontrar e preencher os campos do número do processo
      function preencherCamposProcesso() {
        // Tentar encontrar os inputs pelo atributo placeholder ou pelo tamanho máximo
        const inputs = Array.from(document.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
        
        // Filtrar apenas inputs visíveis
        const inputsVisiveis = inputs.filter(input => {
          const style = window.getComputedStyle(input);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        
        // Encontrar os inputs que parecem ser para o número do processo
        // Geralmente estão agrupados e têm tamanhos específicos
        let camposProcesso: HTMLInputElement[] = [];
        
        // Procurar por inputs que estão próximos uns dos outros
        for (let i = 0; i < inputsVisiveis.length; i++) {
          const input = inputsVisiveis[i];
          const rect = input.getBoundingClientRect();
          
          // Se já temos alguns campos e este está próximo do último
          if (camposProcesso.length > 0) {
            const ultimoRect = camposProcesso[camposProcesso.length - 1].getBoundingClientRect();
            const mesmaLinha = Math.abs(rect.top - ultimoRect.top) < 20;
            const proximo = Math.abs(rect.left - (ultimoRect.left + ultimoRect.width)) < 50;
            
            if (mesmaLinha && proximo) {
              camposProcesso.push(input);
            }
          } else {
            // Se é o primeiro campo que estamos considerando
            // Verificar se parece ser um campo de processo (geralmente tem largura pequena)
            if (rect.width < 100) {
              camposProcesso.push(input);
            }
          }
        }
        
        // Se encontramos pelo menos 6 campos, vamos preencher
        if (camposProcesso.length >= 6) {
          camposProcesso[0].value = partes.sequencial;
          camposProcesso[1].value = partes.digito;
          camposProcesso[2].value = partes.ano;
          camposProcesso[3].value = partes.justica;
          camposProcesso[4].value = partes.tribunal;
          camposProcesso[5].value = partes.origem;
          return true;
        }
        
        // Se não encontramos pelo método acima, vamos tentar outra abordagem
        // Procurar por inputs com tamanhos específicos
        const sequencialInput = inputsVisiveis.find(input => input.maxLength === 7);
        const digitoInput = inputsVisiveis.find(input => input.maxLength === 2);
        const anoInput = inputsVisiveis.find(input => input.maxLength === 4 && !input.value);
        const justicaInput = inputsVisiveis.find(input => input.maxLength === 1);
        const tribunalInput = inputsVisiveis.find(input => input.maxLength === 2 && input !== digitoInput);
        const origemInput = inputsVisiveis.find(input => input.maxLength === 4 && input !== anoInput);
        
        if (sequencialInput && digitoInput && anoInput && justicaInput && tribunalInput && origemInput) {
          sequencialInput.value = partes.sequencial;
          digitoInput.value = partes.digito;
          anoInput.value = partes.ano;
          justicaInput.value = partes.justica;
          tribunalInput.value = partes.tribunal;
          origemInput.value = partes.origem;
          return true;
        }
        
        return false;
      }
      
      return preencherCamposProcesso();
    }, partesNumero);
    
    // Clicar no botão de consulta
    console.log('Clicando no botão de consulta...');
    
    const botaoConsulta = await page.$('input[value="Consultar"], button:has-text("Consultar"), input[value="Pesquisar"], button:has-text("Pesquisar")');
    
    if (botaoConsulta) {
      await botaoConsulta.click();
    } else {
      // Tentar clicar via JavaScript
      await page.evaluate(() => {
        // Procurar botões por texto
        const botoes = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]')) as (HTMLButtonElement | HTMLInputElement)[];
        
        // Filtrar botões visíveis
        const botoesVisiveis = botoes.filter(botao => {
          const style = window.getComputedStyle(botao);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        
        // Procurar botão por texto ou valor
        const botaoConsulta = botoesVisiveis.find(botao => {
          const texto = (botao.textContent || '').toLowerCase();
          const valor = ((botao as HTMLInputElement).value || '').toLowerCase();
          return texto.includes('consultar') || 
                 texto.includes('pesquisar') || 
                 valor.includes('consultar') || 
                 valor.includes('pesquisar');
        });
        
        if (botaoConsulta) {
          botaoConsulta.click();
          return true;
        }
        
        // Se não encontrar por texto, tentar o primeiro botão de submit
        const botaoSubmit = botoesVisiveis.find(botao => 
          (botao as HTMLInputElement).type === 'submit' || 
          botao.getAttribute('role') === 'button'
        );
        
        if (botaoSubmit) {
          botaoSubmit.click();
          return true;
        }
        
        return false;
      });
    }
    
    // Aguardar carregamento dos resultados
    console.log('Aguardando carregamento dos resultados...');
    await page.waitForTimeout(5000);
    
    // Verificar se há resultados na página
    const temResultados = await page.evaluate(() => {
      // Verificar se há tabela de resultados
      const tabela = document.querySelector('table');
      if (tabela) return true;
      
      // Verificar se há mensagem de "nenhum processo encontrado"
      const mensagemNaoEncontrado = Array.from(document.querySelectorAll('div, span, p')).some(
        elem => (elem.textContent || '').includes('Nenhum processo encontrado')
      );
      
      if (mensagemNaoEncontrado) return false;
      
      // Verificar se há algum elemento que pareça ser um resultado
      const elementosResultado = document.querySelectorAll('[id*="resultado"], [class*="resultado"]');
      return elementosResultado.length > 0;
    });
    
    if (!temResultados) {
      return {
        sucesso: false,
        mensagem: 'Nenhum resultado encontrado para o processo informado',
        detalhesAcessados: false
      };
    }
    
    console.log('Resultados encontrados na página!');
    
    // Tentar clicar no link do processo nos resultados
    let detalhesAcessados = false;
    
    try {
      // Primeiro, vamos tentar encontrar o link pelo texto do número do processo
      const numeroProcessoFormatado = numeroProcesso.replace(/[^0-9]/g, '');
      const linkProcesso = await page.$(`a:has-text("${numeroProcesso}"), a:has-text("${numeroProcessoFormatado}")`);
      
      if (linkProcesso) {
        console.log('Link do processo encontrado pelo texto');
        await Promise.all([
          page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
          linkProcesso.click()
        ]);
        detalhesAcessados = true;
      } else {
        // Tentar encontrar o link na primeira linha da tabela de resultados
        const linkNaTabela = await page.$('table tr td a');
        
        if (linkNaTabela) {
          console.log('Link encontrado na tabela de resultados');
          await Promise.all([
            page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }),
            linkNaTabela.click()
          ]);
          detalhesAcessados = true;
        } else {
          // Tentar clicar via JavaScript
          const clicado = await page.evaluate((numeroProcesso) => {
            // Função para encontrar e clicar no link do processo
            function clicarNoProcesso() {
              // Procurar por links que contenham o número do processo
              const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];
              
              // Filtrar links visíveis
              const linksVisiveis = links.filter(link => {
                const style = window.getComputedStyle(link);
                return style.display !== 'none' && style.visibility !== 'hidden';
              });
              
              // Procurar link por texto
              const linkProcesso = linksVisiveis.find(link => {
                const texto = (link.textContent || '').replace(/[^0-9]/g, '');
                return texto.includes(numeroProcesso.replace(/[^0-9]/g, ''));
              });
              
              if (linkProcesso) {
                linkProcesso.click();
                return true;
              }
              
              // Se não encontrar pelo texto, procurar na tabela de resultados
              const tabela = document.querySelector('table');
              if (tabela) {
                const linksNaTabela = Array.from(tabela.querySelectorAll('a')) as HTMLAnchorElement[];
                if (linksNaTabela.length > 0) {
                  // Clicar no primeiro link da tabela
                  linksNaTabela[0].click();
                  return true;
                }
              }
              
              // Procurar por qualquer elemento clicável que pareça ser um resultado
              const elementosClicaveis = linksVisiveis.filter(link => {
                const href = link.getAttribute('href');
                return href && (
                  href.includes('processo') || 
                  href.includes('Processo') || 
                  href.includes('consulta') || 
                  href.includes('Consulta')
                );
              });
              
              if (elementosClicaveis.length > 0) {
                elementosClicaveis[0].click();
                return true;
              }
              
              return false;
            }
            
            return clicarNoProcesso();
          }, numeroProcessoFormatado);
          
          if (clicado) {
            // Aguardar a navegação após o clique via JavaScript
            await page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle' }).catch(() => {
              // Ignorar erros de timeout na navegação
              console.log('Timeout na navegação após clicar no processo');
            });
            detalhesAcessados = true;
          }
        }
      }
    } catch (error) {
      console.error('Erro ao tentar acessar os detalhes do processo:', error);
    }
    
    // Aguardar carregamento da página de detalhes
    if (detalhesAcessados) {
      await page.waitForTimeout(3000);
    }
    
    return {
      sucesso: true,
      mensagem: 'Consulta realizada com sucesso',
      detalhesAcessados
    };
  } catch (error) {
    console.error('Erro durante a consulta:', error);
    return {
      sucesso: false,
      mensagem: 'Erro durante a consulta',
      detalhesAcessados: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Realiza o processo completo de login e consulta de processo no TJPE
 * @param page Instância da página do Playwright
 * @param credenciais Credenciais para acesso ao site
 * @param numeroProcesso Número do processo no formato CNJ
 * @returns Objeto com o resultado da consulta
 */
export async function consultaCompletaTJPE(
  page: Page, 
  credenciais: Credenciais, 
  numeroProcesso: string
): Promise<ResultadoConsulta> {
  try {
    // Realizar login
    const loginSucesso = await realizarLoginTJPE(page, credenciais);
    
    if (!loginSucesso) {
      return {
        sucesso: false,
        mensagem: 'Falha no login',
        detalhesAcessados: false
      };
    }
    
    // Navegar para a página de consulta após o login bem-sucedido
    console.log('Login bem-sucedido, navegando para a página de consulta...');
    await page.goto('https://pje.cloud.tjpe.jus.br/1g/Processo/ConsultaProcesso/listView.seam', {
      timeout: 60000,
      waitUntil: 'networkidle'
    });
    
    // Realizar consulta
    return await consultarProcessoTJPE(page, numeroProcesso);
  } catch (error) {
    console.error('Erro durante o processo completo:', error);
    return {
      sucesso: false,
      mensagem: 'Erro durante o processo completo',
      detalhesAcessados: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
