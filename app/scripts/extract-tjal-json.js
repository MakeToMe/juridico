/**
 * Script para extrair movimentações do TJAL e salvar em JSON
 * Versão com correção para geração do JSON
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Configurações
const config = {
  url: 'https://www2.tjal.jus.br/sajcas/login?service=https%3A%2F%2Fwww2.tjal.jus.br%2Fesaj%2Fj_spring_cas_security_check',
  usuario: '847.698.584-34',
  senha: '8476guardia',
  numeroProcesso: '0727108-89.2024.8.02.0001',
  primeiraParte: '0727108-89.2024',
  ultimaParte: '0001',
  tempoEsperaLogin: 3000, // 3 segundos
  tempoEsperaConsulta: 2000, // 2 segundos
  tempoEsperaVisualizacao: 180000, // 3 minutos
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
    
    // Função para extrair texto com label
    function extrairTextoComLabel(label) {
      // Baseado nos prints, vamos usar seletores mais específicos
      
      // Primeiro, tentamos encontrar na seção de dados do processo
      const secaoDadosProcesso = document.querySelector('#dadosDoProcesso');
      if (secaoDadosProcesso) {
        const linhas = secaoDadosProcesso.querySelectorAll('tr');
        for (const linha of linhas) {
          const colunas = linha.querySelectorAll('td');
          if (colunas.length >= 2) {
            const textoColuna = colunas[0].textContent.trim();
            if (textoColuna.includes(label)) {
              return colunas[1].textContent.trim();
            }
          }
        }
      }
      
      // Segundo, tentamos encontrar em qualquer tabela da página
      const tabelas = document.querySelectorAll('table');
      for (const tabela of tabelas) {
        const linhas = tabela.querySelectorAll('tr');
        for (const linha of linhas) {
          const colunas = linha.querySelectorAll('td');
          if (colunas.length >= 2) {
            const textoColuna = colunas[0].textContent.trim();
            if (textoColuna.includes(label)) {
              return colunas[1].textContent.trim();
            }
          }
        }
      }
      
      // Terceiro, tentamos encontrar em divs com classes específicas
      // Baseado nos prints, procuramos por divs que contêm o label seguido do valor
      const divs = document.querySelectorAll('div');
      for (const div of divs) {
        if (div.textContent.includes(label + ':')) {
          const texto = div.textContent.trim();
          const partes = texto.split(':');
          if (partes.length > 1) {
            return partes[1].trim();
          }
        }
      }
      
      // Quarto, procuramos especificamente por elementos com a classe labelClass
      const elementos = document.querySelectorAll('.labelClass, .dadosLabel');
      for (const elemento of elementos) {
        if (elemento.textContent.trim().includes(label)) {
          // Verificar o próximo elemento irmão
          const valorElemento = elemento.nextElementSibling;
          if (valorElemento) {
            return valorElemento.textContent.trim();
          }
          
          // Verificar o pai e depois o próximo elemento
          const pai = elemento.parentElement;
          if (pai && pai.nextElementSibling) {
            return pai.nextElementSibling.textContent.trim();
          }
        }
      }
      
      // Quinto, procuramos por qualquer elemento que contenha o texto do label
      const todosElementos = document.querySelectorAll('*');
      for (const elemento of todosElementos) {
        if (elemento.childNodes.length === 1 && elemento.childNodes[0].nodeType === 3) {
          const texto = elemento.textContent.trim();
          if (texto === label + ':') {
            const proximo = elemento.nextElementSibling;
            if (proximo) {
              return proximo.textContent.trim();
            }
          }
        }
      }
      
      return '';
    }
    
    // Extrair dados básicos do processo
    const numeroProcesso = extrairTexto('#numeroProcesso');
    const classeProcesso = extrairTexto('#classeProcesso');
    const assuntoProcesso = extrairTexto('#assuntoProcesso');
    
    // Usar os seletores específicos fornecidos pelo usuário
    // Estes seletores são baseados na estrutura real da página do TJAL
    
    // Função auxiliar para extrair texto de um elemento e seu próximo irmão
    function extrairTextoComLabel(labelId) {
      const labelElement = document.querySelector(labelId);
      if (labelElement && labelElement.nextElementSibling) {
        return labelElement.nextElementSibling.innerText.trim();
      }
      return '';
    }
    
    // Extrair dados usando os seletores específicos
    const foro = extrairTextoComLabel('#labelForoProcesso') || '';
    const vara = extrairTextoComLabel('#labelVaraProcesso') || '';
    const juiz = extrairTextoComLabel('#labelJuizProcesso') || '';
    const area = document.querySelector('#areaProcesso')?.innerText.trim() || '';
    const valorAcao = document.querySelector('#valorAcaoProcesso')?.innerText.trim() || '';
    const distribuicao = document.querySelector('#dataHoraDistribuicaoProcesso')?.innerText.trim() || '';
    
    // Abordagem alternativa caso os seletores específicos não funcionem
    let foroAlt = foro;
    let varaAlt = vara;
    let juizAlt = juiz;
    let areaAlt = area;
    let valorAcaoAlt = valorAcao;
    let distribuicaoAlt = distribuicao;
    
    // Busca em todos os elementos da página
    if (!foro || !vara || !juiz || !area || !valorAcao || !distribuicao) {
      // Buscar em todos os elementos com texto
      const todosElementos = document.querySelectorAll('*');
      
      for (const elemento of todosElementos) {
        const texto = elemento.textContent.trim();
        
        // Verificar cada campo
        if (texto === 'Foro:' && elemento.nextElementSibling && !foroAlt) {
          foroAlt = elemento.nextElementSibling.textContent.trim();
        }
        else if (texto.includes('Foro:') && !foroAlt) {
          const partes = texto.split('Foro:');
          if (partes.length > 1) foroAlt = partes[1].trim();
        }
        
        if (texto === 'Vara:' && elemento.nextElementSibling && !varaAlt) {
          varaAlt = elemento.nextElementSibling.textContent.trim();
        }
        else if (texto.includes('Vara:') && !varaAlt) {
          const partes = texto.split('Vara:');
          if (partes.length > 1) varaAlt = partes[1].trim();
        }
        
        if (texto === 'Juiz:' && elemento.nextElementSibling && !juizAlt) {
          juizAlt = elemento.nextElementSibling.textContent.trim();
        }
        else if (texto.includes('Juiz:') && !juizAlt) {
          const partes = texto.split('Juiz:');
          if (partes.length > 1) juizAlt = partes[1].trim();
        }
        
        if ((texto === 'Área:' || texto === 'Area:') && elemento.nextElementSibling && !areaAlt) {
          areaAlt = elemento.nextElementSibling.textContent.trim();
        }
        else if ((texto.includes('Área:') || texto.includes('Area:')) && !areaAlt) {
          const partes = texto.includes('Área:') ? texto.split('Área:') : texto.split('Area:');
          if (partes.length > 1) areaAlt = partes[1].trim();
        }
        
        if (texto === 'Valor da ação:' && elemento.nextElementSibling && !valorAcaoAlt) {
          valorAcaoAlt = elemento.nextElementSibling.textContent.trim();
        }
        else if (texto.includes('Valor da ação:') && !valorAcaoAlt) {
          const partes = texto.split('Valor da ação:');
          if (partes.length > 1) valorAcaoAlt = partes[1].trim();
        }
        
        if (texto === 'Distribuição:' && elemento.nextElementSibling && !distribuicaoAlt) {
          distribuicaoAlt = elemento.nextElementSibling.textContent.trim();
        }
        else if (texto.includes('Distribuição:') && !distribuicaoAlt) {
          const partes = texto.split('Distribuição:');
          if (partes.length > 1) distribuicaoAlt = partes[1].trim();
        }
      }
    }
    
    // Usar os valores alternativos se os originais estiverem vazios
    const foroFinal = foro || foroAlt;
    const varaFinal = vara || varaAlt;
    const juizFinal = juiz || juizAlt;
    const areaFinal = area || areaAlt;
    
    // Limpar o valor da ação para remover espaços extras
    let valorAcaoLimpo = (valorAcao || valorAcaoAlt || '');
    // Remover espaços extras entre R$ e o valor
    valorAcaoLimpo = valorAcaoLimpo.replace(/R\$\s+/g, 'R$ ');
    // Remover espaços extras entre dígitos
    valorAcaoLimpo = valorAcaoLimpo.replace(/(\d)\s+(\d)/g, '$1$2');
    const valorAcaoFinal = valorAcaoLimpo;
    
    const distribuicaoFinal = distribuicao || distribuicaoAlt;
    
    // Imprimir no console para debug
    console.log('Dados extraídos:', {
      foro: foroFinal,
      vara: varaFinal,
      juiz: juizFinal,
      area: areaFinal,
      valorAcao: valorAcaoFinal,
      distribuicao: distribuicaoFinal
    });
    
    // Extrair partes do processo
    const partesArray = [];
    
    // Primeiro, vamos tentar usar a tabela de partes
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
            partesArray.push({
              tipo,
              nome,
              advogados
            });
          }
        }
      }
    }
    
    // Abordagem específica baseada no layout da página do TJAL
    // Vamos procurar por todas as linhas que contêm 'Autor' ou 'Réu'
    
    // Primeiro, vamos tentar encontrar todos os autores
    const todosAutores = [];
    const todosReus = [];
    
    // Procurar por todos os elementos que podem conter 'Autor' ou 'Réu'
    const todosElementos = document.querySelectorAll('*');
    
    for (let i = 0; i < todosElementos.length; i++) {
      const elemento = todosElementos[i];
      const texto = elemento.textContent.trim();
      
      // Se encontramos um elemento com 'Autor' ou outros tipos de parte autora
      if (texto === 'Autor' || texto === 'Requerente' || texto === 'Exequente' || texto === 'Impetrante' || texto === 'Embargante' || texto === 'Reclamante') {
        // Verificar o próximo elemento irmão ou o próximo elemento na DOM
        let proximoElemento = elemento.nextElementSibling;
        if (!proximoElemento && i + 1 < todosElementos.length) {
          proximoElemento = todosElementos[i + 1];
        }
        
        if (proximoElemento) {
          const textoProximo = proximoElemento.textContent.trim();
          if (textoProximo && !textoProximo.includes('Autor') && !textoProximo.includes('Réu')) {
            // Extrair nome e advogados
            let nome = textoProximo;
            let advogados = [];
            
            // Verificar se o texto contém informações de advogado (Advogado ou Advogada)
            if (textoProximo.includes('Advogado:') || textoProximo.includes('Advogada:')) {
              let partes = [];
              if (textoProximo.includes('Advogado:')) {
                partes = textoProximo.split('Advogado:');
              } else if (textoProximo.includes('Advogada:')) {
                partes = textoProximo.split('Advogada:');
              }
              
              nome = partes[0].trim();
              
              // Extrair advogados
              const textoAdvogados = partes.slice(1).join(' ');
              advogados = textoAdvogados.split(/Advogado:|Advogada:|e\s+\d+\.\d+\.\d+-\d+/g)
                .map(adv => adv.trim())
                .filter(adv => adv);
            }
            
            // Limpar o nome de caracteres de tabulação e quebras de linha
            nome = nome.replace(/\t+/g, '');
            nome = nome.replace(/\n+/g, ' ');
            nome = nome.replace(/\s+/g, ' '); // Substituir múltiplos espaços por um único
            nome = nome.trim();
            
            // Adicionar ao array de autores
            if (nome) {
              const autorExistente = todosAutores.find(a => a.nome === nome);
              if (!autorExistente) {
                todosAutores.push({
                  tipo: 'Autor',
                  nome,
                  advogados
                });
              }
            }
          }
        }
      }
      
      // Se encontramos um elemento com 'Réu' ou outros tipos de parte ré
      if (texto === 'Réu' || texto === 'Requerido' || texto === 'Executado' || texto === 'Impetrado' || texto === 'Embargado' || texto === 'Reclamado') {
        // Verificar o próximo elemento irmão ou o próximo elemento na DOM
        let proximoElemento = elemento.nextElementSibling;
        if (!proximoElemento && i + 1 < todosElementos.length) {
          proximoElemento = todosElementos[i + 1];
        }
        
        if (proximoElemento) {
          const textoProximo = proximoElemento.textContent.trim();
          if (textoProximo && !textoProximo.includes('Autor') && !textoProximo.includes('Réu')) {
            // Extrair nome e advogados
            let nome = textoProximo;
            let advogados = [];
            
            // Verificar se o texto contém informações de advogado (Advogado ou Advogada)
            if (textoProximo.includes('Advogado:') || textoProximo.includes('Advogada:')) {
              let partes = [];
              if (textoProximo.includes('Advogado:')) {
                partes = textoProximo.split('Advogado:');
              } else if (textoProximo.includes('Advogada:')) {
                partes = textoProximo.split('Advogada:');
              }
              
              nome = partes[0].trim();
              
              // Extrair advogados
              const textoAdvogados = partes.slice(1).join(' ');
              advogados = textoAdvogados.split(/Advogado:|Advogada:|e\s+\d+\.\d+\.\d+-\d+/g)
                .map(adv => adv.trim())
                .filter(adv => adv);
            }
            
            // Limpar o nome de caracteres de tabulação e quebras de linha
            nome = nome.replace(/\t+/g, '');
            nome = nome.replace(/\n+/g, ' ');
            nome = nome.replace(/\s+/g, ' '); // Substituir múltiplos espaços por um único
            nome = nome.trim();
            
            // Adicionar ao array de réus
            if (nome) {
              const reuExistente = todosReus.find(r => r.nome === nome);
              if (!reuExistente) {
                todosReus.push({
                  tipo: 'Réu',
                  nome,
                  advogados
                });
              }
            }
          }
        }
      }
    }
    
    // Adicionar todos os autores e réus encontrados ao array de partes
    todosAutores.forEach(autor => {
      const autorExistente = partesArray.find(p => p.nome === autor.nome && p.tipo === 'Autor');
      if (!autorExistente) {
        partesArray.push(autor);
      }
    });
    
    todosReus.forEach(reu => {
      const reuExistente = partesArray.find(p => p.nome === reu.nome && p.tipo === 'Réu');
      if (!reuExistente) {
        partesArray.push(reu);
      }
    });
    
    // Abordagem baseada na estrutura HTML específica do TJAL
    // Procurar por elementos com a classe 'secaoFormBody' que contém as partes
    const secaoPartesTJAL = document.querySelector('.secaoFormBody');
    if (secaoPartesTJAL) {
      // Encontrar todos os elementos que contêm informações de partes
      const linhasPartes = secaoPartesTJAL.querySelectorAll('tr');
      
      let tipoAtual = '';
      
      for (const linha of linhasPartes) {
        const texto = linha.textContent.trim();
        
        // Identificar o tipo da parte
        if (texto === 'Autor' || texto.includes('Autor:') || 
            texto === 'Requerente' || texto.includes('Requerente:') ||
            texto === 'Exequente' || texto.includes('Exequente:') ||
            texto === 'Impetrante' || texto.includes('Impetrante:') ||
            texto === 'Embargante' || texto.includes('Embargante:') ||
            texto === 'Reclamante' || texto.includes('Reclamante:')) {
          tipoAtual = 'Autor';
          continue;
        } else if (texto === 'Réu' || texto.includes('Réu:') ||
                   texto === 'Requerido' || texto.includes('Requerido:') ||
                   texto === 'Executado' || texto.includes('Executado:') ||
                   texto === 'Impetrado' || texto.includes('Impetrado:') ||
                   texto === 'Embargado' || texto.includes('Embargado:') ||
                   texto === 'Reclamado' || texto.includes('Reclamado:')) {
          tipoAtual = 'Réu';
          continue;
        }
        
        // Se temos um tipo e o texto não é um cabeçalho
        if (tipoAtual && !texto.includes('PARTES DO PROCESSO') && !texto.includes('Recolher')) {
          // Extrair nome e advogados
          let nome = texto;
          // Verificar se o texto contém informações de advogado
          let advogados = [];
          if (texto.includes('Advogado:') || texto.includes('Advogada:')) {
            // Lidar com ambos os casos: Advogado e Advogada
            let partes = [];
            if (texto.includes('Advogado:')) {
              partes = texto.split('Advogado:');
            } else if (texto.includes('Advogada:')) {
              partes = texto.split('Advogada:');
            }
            
            nome = partes[0].trim();
            
            // Extrair múltiplos advogados
            const textoAdvogados = partes.slice(1).join(' ');
            advogados = textoAdvogados.split(/Advogado:|Advogada:|e\s+\d+\.\d+\.\d+-\d+/g)
              .map(adv => adv.trim())
              .filter(adv => adv);
          }
          
          // Adicionar ao array de partes
          if (nome) {
            const parteExistente = partesArray.find(p => p.nome === nome && p.tipo === tipoAtual);
            if (!parteExistente) {
              partesArray.push({
                tipo: tipoAtual,
                nome,
                advogados
              });
            }
          }
        }
      }
    }
    
    // Organizar partes por tipo e remover duplicações
    const partes = {};
    const partesProcessadas = {};
    
    // Primeiro, limpar todos os nomes e extrair advogados
    partesArray.forEach(parte => {
      let nome = parte.nome;
      
      // Limpar o nome para remover caracteres de tabulação e quebras de linha
      if (nome) {
        nome = nome.replace(/\t+/g, '');
        nome = nome.replace(/\n+/g, ' ');
        nome = nome.replace(/\s+/g, ' '); // Substituir múltiplos espaços por um único
        nome = nome.trim();
        
        // Se o nome ainda contém 'Advogado:' ou 'Advogada:', limpar novamente
        if (nome.includes('Advogado:') || nome.includes('Advogada:')) {
          const partes = nome.split(/Advogado:|Advogada:/);
          nome = partes[0].trim();
          
          // Extrair advogados se ainda não foram extraídos
          if (!parte.advogados || parte.advogados.length === 0) {
            const textoAdvogados = partes.slice(1).join(' ');
            parte.advogados = textoAdvogados.split(/Advogado:|Advogada:|e\s+\d+\.\d+\.\d+-\d+/g)
              .map(adv => adv.trim())
              .filter(adv => adv);
          }
        }
        
        // Atualizar o nome limpo
        parte.nome = nome;
      }
    });
    
    // Agora organizar as partes por categoria
    partesArray.forEach(parte => {
      const tipoNormalizado = parte.tipo.toLowerCase();
      const nome = parte.nome;
      
      // Determinar a categoria da parte
      let categoria = 'outros';
      if (tipoNormalizado.includes('autor') || 
          tipoNormalizado.includes('requerente') || 
          tipoNormalizado.includes('exequente') ||
          tipoNormalizado.includes('impetrante') ||
          tipoNormalizado.includes('embargante') ||
          tipoNormalizado.includes('reclamante')) {
        categoria = 'autores';
      } else if (tipoNormalizado.includes('réu') || 
                 tipoNormalizado.includes('requerido') || 
                 tipoNormalizado.includes('executado') ||
                 tipoNormalizado.includes('impetrado') ||
                 tipoNormalizado.includes('embargado') ||
                 tipoNormalizado.includes('reclamado')) {
        categoria = 'reus';
      }
      
      // Inicializar a categoria se não existir
      if (!partes[categoria]) {
        partes[categoria] = [];
      }
      
      // Limpar e normalizar advogados
      if (parte.advogados && parte.advogados.length > 0) {
        parte.advogados = parte.advogados.map(adv => {
          // Limpar advogado
          return adv.replace(/\t+/g, '')
                   .replace(/\n+/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim();
        });
        
        // Remover duplicatas
        const advogadosUnicos = [];
        parte.advogados.forEach(adv => {
          if (!advogadosUnicos.some(a => a.toLowerCase() === adv.toLowerCase())) {
            advogadosUnicos.push(adv);
          }
        });
        parte.advogados = advogadosUnicos;
      }
      
      // Verificar se já temos esta parte na categoria (evitar duplicação)
      const chave = `${categoria}:${nome}`;
      if (!partesProcessadas[chave]) {
        partesProcessadas[chave] = true;
        
        partes[categoria].push({
          tipo: parte.tipo,
          nome: nome,
          advogados: parte.advogados || []
        });
      } else {
        // Se a parte já existe, verificar se há novos advogados para adicionar
        const parteExistente = partes[categoria].find(p => p.nome === nome);
        if (parteExistente && parte.advogados && parte.advogados.length > 0) {
          // Adicionar advogados que ainda não estão na lista
          parte.advogados.forEach(adv => {
            if (!parteExistente.advogados.some(a => a.toLowerCase() === adv.toLowerCase())) {
              parteExistente.advogados.push(adv);
            }
          });
        }
      }
    });
    
    return {
      numeroProcesso,
      classeProcesso,
      assuntoProcesso,
      foro: foroFinal,
      vara: varaFinal,
      juiz: juizFinal,
      area: areaFinal,
      valorAcao: valorAcaoFinal,
      distribuicao: distribuicaoFinal,
      partes
    };
  });
}

/**
 * Função para extrair movimentações
 */
async function extrairMovimentacoes(page) {
  // Tentar expandir todas as movimentações
  await page.evaluate(() => {
    const botaoTodasMovimentacoes = document.querySelector('a[onclick*="tabelaTodasMovimentacoes"]');
    if (botaoTodasMovimentacoes) {
      console.log('Clicando no botão para mostrar todas as movimentações...');
      botaoTodasMovimentacoes.click();
    }
  });
  
  // Aguardar carregamento
  await page.waitForTimeout(2000);
  
  // Antes de extrair as movimentações, vamos salvar o HTML da página para debug
  await page.evaluate(() => {
    // Criar um elemento para armazenar o HTML
    const htmlContent = document.documentElement.outerHTML;
    // Armazenar no localStorage para debug
    localStorage.setItem('paginaHTML', htmlContent);
  });
  
  // Extrair movimentações usando o código que funcionou no console
  return await page.evaluate(() => {
    const rows = document.querySelectorAll("tr.containerMovimentacao");
    const movimentacoes = [];

    rows.forEach((row) => {
      const data = row.querySelector(".dataMovimentacao")?.innerText.trim();
      
      // Obter a descrição e limpar caracteres de tabulação e quebras de linha extras
      let descricao = row.querySelector(".descricaoMovimentacao")?.innerText.trim();
      
      // Limpar a descrição: remover tabulações e normalizar quebras de linha
      if (descricao) {
        // Remover tabulações e espaços extras
        descricao = descricao.replace(/\t+/g, '');
        // Substituir múltiplas quebras de linha por uma única
        descricao = descricao.replace(/\n+/g, '\n');
        // Remover espaços em branco no início e fim de cada linha
        descricao = descricao.split('\n').map(linha => linha.trim()).filter(linha => linha).join('\n');
      }
      
      movimentacoes.push({ data, descricao });
    });

    return movimentacoes;
  });
}

/**
 * Função principal para extrair movimentações do TJAL
 */
async function extrairMovimentacoesTJAL() {
  console.log(`Iniciando extração de movimentações do processo ${config.numeroProcesso} no TJAL...`);
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // ETAPA 1: FAZER LOGIN
    console.log('\n=== ETAPA 1: FAZENDO LOGIN ===');
    console.log(`Navegando para a página de login: ${config.url}`);
    await page.goto(config.url);
    
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', config.usuario);
    await page.fill('#passwordForm', config.senha);
    
    console.log('Clicando no botão de login...');
    await page.click('#pbEntrar');
    
    // Aguardar após o login
    console.log(`Aguardando ${config.tempoEsperaLogin/1000} segundos após o login...`);
    await page.waitForTimeout(config.tempoEsperaLogin);
    
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
    
    console.log('Preenchendo o número do processo exatamente como na imagem');
    console.log(`Preenchendo número do processo: Primeira parte="${config.primeiraParte}", Última parte="${config.ultimaParte}"`);
    
    // Preencher os campos do número do processo exatamente como na imagem
    await page.fill('#numeroDigitoAnoUnificado', config.primeiraParte);
    await page.fill('#foroNumeroUnificado', config.ultimaParte);
    
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
    
    // Aguardar para garantir que a página carregou completamente
    console.log(`Aguardando ${config.tempoEsperaConsulta/1000} segundos para garantir que a página carregou completamente...`);
    await page.waitForTimeout(config.tempoEsperaConsulta);
    
    console.log('Página de detalhes do processo carregada com sucesso!');
    
    // ETAPA 5: EXTRAIR DADOS E MOVIMENTAÇÕES
    console.log('\n=== ETAPA 5: EXTRAINDO MOVIMENTAÇÕES ===');
    
    // Extrair dados do processo
    const dadosProcesso = await extrairDadosProcesso(page);
    
    // Extrair movimentações
    console.log('Extraindo movimentações...');
    const movimentacoes = await extrairMovimentacoes(page);
    
    console.log(`\n----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoes.length} -----`);
    movimentacoes.forEach((mov, index) => {
      console.log(`${index + 1}. [${mov.data}] ${mov.descricao ? mov.descricao.substring(0, 50) + '...' : '(sem descrição)'}`);
    });
    
    // Salvar movimentações em arquivo JSON
    console.log('\nSalvando movimentações em arquivo JSON...');
    
    // Criar objeto de dados completo
    const dadosCompletos = {
      processo: {
        numero: dadosProcesso.numeroProcesso,
        classe: dadosProcesso.classeProcesso,
        assunto: dadosProcesso.assuntoProcesso,
        foro: dadosProcesso.foro,
        vara: dadosProcesso.vara,
        juiz: dadosProcesso.juiz,
        area: dadosProcesso.area,
        valorAcao: dadosProcesso.valorAcao,
        distribuicao: dadosProcesso.distribuicao
      },
      partes: dadosProcesso.partes,
      movimentacoes: movimentacoes.map(m => ({
        data: m.data,
        descricao: m.descricao
      }))
    };
    
    // Criar nome do arquivo incluindo o número do processo (removendo caracteres especiais)
    const numeroProcessoFormatado = config.numeroProcesso.replace(/[^0-9]/g, '');
    const nomeArquivo = `movimentacoes-tjal-${numeroProcessoFormatado}.json`;
    
    // Salvar em arquivo com codificação UTF-8
    fs.writeFileSync(nomeArquivo, JSON.stringify(dadosCompletos, null, 2), { encoding: 'utf8' });
    
    console.log(`Movimentações salvas em ${nomeArquivo}`);
    
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
    console.error(error.stack);
    
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
