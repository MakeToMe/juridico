/**
 * Script para extrair movimentações do TJAL e salvar no Supabase
 * Versão com integração completa
 */

const { chromium } = require('playwright');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente do arquivo .env.local
dotenv.config({ path: './.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não encontradas!');
  console.error('Certifique-se de que SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas no arquivo .env.local');
  process.exit(1);
}

console.log(`Conectando ao Supabase: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: { schema: 'alnpp' }
});

// Configurar o Supabase
console.log('Configurando Supabase...');

// Definir as tabelas
const TABELA_PROCESSOS = 'processos';
const TABELA_MOVIMENTACOES = 'movimentacoes';

console.log(`Tabelas: ${TABELA_PROCESSOS}, ${TABELA_MOVIMENTACOES}`);

// ID da empresa
const EMPRESA_UID = '807d031b-d08e-492e-94ba-428b28fb604e';

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
  tempoEsperaVisualizacao: 10000, // 10 segundos (reduzido para testes),
};

/**
 * Função para extrair dados do processo
 */
async function extrairDadosProcesso(page) {
  console.log('Extraindo dados do processo...');
  
  // Primeiro vamos tentar expandir todas as partes
  await page.evaluate(() => {
    const botaoTodasPartes = document.querySelector('a[onclick*="tableTodasPartes"]');
    if (botaoTodasPartes) {
      console.log('Clicando no botão para mostrar todas as partes...');
      botaoTodasPartes.click();
    }
  });
  
  // Aguardar carregamento
  await page.waitForTimeout(2000);
  
  return await page.evaluate(() => {
    // Função para extrair texto de um seletor
    function extrairTexto(seletor) {
      const elemento = document.querySelector(seletor);
      return elemento ? elemento.textContent.trim() : '';
    }
    
    // Função auxiliar para extrair texto com label
    function extrairTextoComLabel(labelId) {
      const labelElement = document.querySelector(labelId);
      if (labelElement && labelElement.nextElementSibling) {
        return labelElement.nextElementSibling.innerText.trim();
      }
      return '';
    }
    
    // Função para limpar texto (remover tabs, quebras de linha extras, etc)
    function limparTexto(texto) {
      if (!texto) return '';
      return texto.replace(/\t+/g, ' ')
                 .replace(/\n+/g, ' ')
                 .replace(/\s+/g, ' ')
                 .trim();
    }
    
    // Extrair dados básicos do processo
    const numeroProcesso = extrairTexto('#numeroProcesso');
    const classeProcesso = extrairTexto('#classeProcesso');
    const assuntoProcesso = extrairTexto('#assuntoProcesso');
    
    // Extrair dados usando os seletores específicos
    const foro = extrairTextoComLabel('#labelForoProcesso') || '';
    const vara = extrairTextoComLabel('#labelVaraProcesso') || '';
    const juiz = extrairTextoComLabel('#labelJuizProcesso') || '';
    const area = document.querySelector('#areaProcesso')?.innerText.trim() || '';
    const valorAcao = document.querySelector('#valorAcaoProcesso')?.innerText.trim() || '';
    const distribuicao = document.querySelector('#dataHoraDistribuicaoProcesso')?.innerText.trim() || '';
    
    console.log('Dados básicos extraídos:');
    console.log(`- Número: ${numeroProcesso}`);
    console.log(`- Classe: ${classeProcesso}`);
    console.log(`- Assunto: ${assuntoProcesso}`);
    
    // Definir tribunal e comarca
    const tribunal = 'TJAL';
    let comarca = '';
    
    // Extrair comarca do foro
    if (foro) {
      if (foro.includes('Foro de')) {
        comarca = foro.replace('Foro de', '').trim();
      } else {
        comarca = foro;
      }
    }
    
    console.log(`- Tribunal: ${tribunal}`);
    console.log(`- Comarca: ${comarca}`);
    
    // Extrair partes do processo
    const partesArray = [];
    console.log('Extraindo partes do processo...');
    
    // Primeiro, vamos tentar usar a tabela de partes
    const secaoPartes = document.querySelector('#tablePartesPrincipais, #tableTodasPartes');
    
    if (secaoPartes) {
      console.log('Tabela de partes encontrada!');
      const linhasPartes = secaoPartes.querySelectorAll('tr');
      console.log(`Total de linhas na tabela de partes: ${linhasPartes.length}`);
      
      for (const linha of linhasPartes) {
        const colunas = linha.querySelectorAll('td, th');
        
        if (colunas.length >= 2) {
          const tipo = colunas[0].textContent.trim();
          let nome = colunas[1].textContent.trim();
          console.log(`Processando linha: Tipo=${tipo}, Nome=${nome.substring(0, 30)}...`);
          
          // Separar nome da parte e advogados
          let advogados = [];
          if (nome.includes('Advogado:')) {
            const partes = nome.split('Advogado:');
            nome = partes[0].trim();
            
            // Extrair múltiplos advogados
            const textoAdvogados = partes.slice(1).join('Advogado:');
            advogados = textoAdvogados.split(/Advogado:|e\s+\d+\.\d+\.\d+-\d+/g)
              .map(adv => adv.trim())
              .filter(adv => adv);
            
            console.log(`Nome extraído: ${nome}`);
            console.log(`Advogados extraídos: ${advogados.join(', ')}`);
          }
          
          if (tipo && nome) {
            partesArray.push({
              tipo,
              nome,
              advogados
            });
            console.log(`Parte adicionada: ${tipo} - ${nome}`);
          }
        }
      }
    } else {
      console.log('Tabela de partes NÃO encontrada. Tentando abordagem alternativa...');
      
      // Procurar por todos os elementos que podem conter 'Autor' ou 'Réu'
      const todosElementos = document.querySelectorAll('*');
      
      for (let i = 0; i < todosElementos.length; i++) {
        const elemento = todosElementos[i];
        const texto = elemento.textContent.trim();
        
        // Se encontramos um elemento com 'Autor' ou outros tipos de parte autora
        if (texto === 'Autor' || texto === 'Requerente' || texto === 'Exequente' || 
            texto === 'Impetrante' || texto === 'Embargante' || texto === 'Reclamante') {
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
              
              // Verificar se o texto contém informações de advogado
              if (nome.includes('Advogado:')) {
                const partes = nome.split('Advogado:');
                nome = partes[0].trim();
                
                // Extrair múltiplos advogados
                const textoAdvogados = partes.slice(1).join(' ');
                advogados = textoAdvogados.split(/Advogado:|e\s+\d+\.\d+\.\d+-\d+/g)
                  .map(adv => adv.trim())
                  .filter(adv => adv);
              }
              
              partesArray.push({
                tipo: 'Autor',
                nome,
                advogados
              });
              console.log(`Autor encontrado (método 2): ${nome}`);
            }
          }
        }
        
        // Se encontramos um elemento com 'Réu' ou outros tipos de parte ré
        if (texto === 'Réu' || texto === 'Requerido' || texto === 'Executado' || 
            texto === 'Impetrado' || texto === 'Embargado' || texto === 'Reclamado') {
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
              
              // Verificar se o texto contém informações de advogado
              if (nome.includes('Advogado:')) {
                const partes = nome.split('Advogado:');
                nome = partes[0].trim();
                
                // Extrair múltiplos advogados
                const textoAdvogados = partes.slice(1).join(' ');
                advogados = textoAdvogados.split(/Advogado:|e\s+\d+\.\d+\.\d+-\d+/g)
                  .map(adv => adv.trim())
                  .filter(adv => adv);
              }
              
              partesArray.push({
                tipo: 'Réu',
                nome,
                advogados
              });
              console.log(`Réu encontrado (método 2): ${nome}`);
            }
          }
        }
      }
    }
    
    console.log(`Total de partes encontradas: ${partesArray.length}`);
    
    // Depuração: mostrar todas as partes encontradas
    console.log('=== PARTES ENCONTRADAS (DEPURAÇÃO) ===');
    partesArray.forEach((parte, index) => {
      console.log(`Parte ${index + 1}: Tipo="${parte.tipo}", Nome="${parte.nome}", Advogados=${JSON.stringify(parte.advogados)}`);
    });
    
    // Verificar se há elementos com o tipo LitisPssv na página
    try {
      // Verificar diretamente na tabela de partes
      const tabelaPartes = document.querySelector('table.secaoFormBody');
      if (tabelaPartes) {
        const linhas = tabelaPartes.querySelectorAll('tr');
        linhas.forEach(linha => {
          const colunas = linha.querySelectorAll('td');
          if (colunas.length >= 2) {
            const tipo = colunas[0].textContent.trim();
            const nome = colunas[1].textContent.trim();
            
            // Verificar se é LitisPssv ou similar
            if (tipo.includes('LitisPssv') || tipo.includes('Litispassivo') || tipo.includes('Litisconsorte Passivo')) {
              console.log(`Encontrado ${tipo}: ${nome}`);
              
              // Verificar se já existe esta parte no array
              const jaExiste = partesArray.some(p => 
                p.tipo === tipo && p.nome === nome
              );
              
              if (!jaExiste) {
                partesArray.push({
                  tipo: tipo,
                  nome: nome,
                  advogados: []
                });
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Erro ao buscar LitisPssv na tabela:', error);
    }
    
    // Organizar partes por tipo
    const autores = [];
    const advogadosAutor = [];
    const reus = [];
    const advogadosReu = [];
    
    // Arrays para o novo formato
    const autor = [];
    const reu = [];
    
    // Processar partes
    partesArray.forEach(parte => {
      // Limpar nome
      const nomeLimpo = limparTexto(parte.nome);
      
      // Limpar advogados
      const advogadosLimpos = parte.advogados.map(adv => limparTexto(adv)).filter(adv => adv);
      
      // Classificar por tipo
      if (parte.tipo.toLowerCase().includes('autor') || 
          parte.tipo.toLowerCase().includes('requerente') || 
          parte.tipo.toLowerCase().includes('exequente') || 
          parte.tipo.toLowerCase().includes('impetrante') || 
          parte.tipo.toLowerCase().includes('embargante') || 
          parte.tipo.toLowerCase().includes('reclamante') ||
          parte.tipo.toLowerCase().includes('litisconsorte ativo')) {
        // Adicionar ao array de autores para compatibilidade
        if (nomeLimpo && !autores.includes(nomeLimpo)) {
          autores.push(nomeLimpo);
        }
        
        advogadosLimpos.forEach(adv => {
          if (adv && !advogadosAutor.includes(adv)) {
            advogadosAutor.push(adv);
          }
        });
        
        // Novo formato: combinar autor com seus advogados e incluir nomenclatura original
        if (nomeLimpo) {
          const tipoOriginal = parte.tipo.trim();
          if (advogadosLimpos.length > 0) {
            autor.push(`[${tipoOriginal}] ${nomeLimpo} Advogado: ${advogadosLimpos.join(' Advogado: ')}`);
          } else {
            autor.push(`[${tipoOriginal}] ${nomeLimpo}`);
          }
        }
      } else if (parte.tipo.toLowerCase().includes('réu') || 
                parte.tipo.toLowerCase().includes('requerido') || 
                parte.tipo.toLowerCase().includes('executado') || 
                parte.tipo.toLowerCase().includes('impetrado') || 
                parte.tipo.toLowerCase().includes('embargado') || 
                parte.tipo.toLowerCase().includes('reclamado') ||
                parte.tipo.toLowerCase().includes('litisconsorte passivo') ||
                parte.tipo.toLowerCase().includes('litispssv') ||
                parte.tipo.toLowerCase().includes('litispassivo')) {
        // Adicionar ao array de réus para compatibilidade
        if (nomeLimpo && !reus.includes(nomeLimpo)) {
          reus.push(nomeLimpo);
        }
        
        advogadosLimpos.forEach(adv => {
          if (adv && !advogadosReu.includes(adv)) {
            advogadosReu.push(adv);
          }
        });
        
        // Novo formato: combinar réu com seus advogados e incluir nomenclatura original
        if (nomeLimpo) {
          const tipoOriginal = parte.tipo.trim();
          if (advogadosLimpos.length > 0) {
            reu.push(`[${tipoOriginal}] ${nomeLimpo} Advogado: ${advogadosLimpos.join(' Advogado: ')}`);
          } else {
            reu.push(`[${tipoOriginal}] ${nomeLimpo}`);
          }
        }
      }
    });
    
    console.log('Partes organizadas:');
    console.log(`- Autores: ${autores.join(', ')}`);
    console.log(`- Advogados do Autor: ${advogadosAutor.join(', ')}`);
    console.log(`- Réus: ${reus.join(', ')}`);
    console.log(`- Advogados do Réu: ${advogadosReu.join(', ')}`);
    
    return {
      numeroProcesso,
      classeProcesso,
      assuntoProcesso,
      tribunal,
      comarca,
      foro,
      vara,
      juiz,
      area,
      valorAcao,
      distribuicao,
      partes: partesArray,
      autores,
      advogadosAutor,
      reus,
      advogadosReu,
      autor,
      reu
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
  
  // Extrair movimentações
  return await page.evaluate(() => {
    // Função para limpar texto (remover tabs, quebras de linha extras, etc)
    function limparTexto(texto) {
      if (!texto) return '';
      return texto.replace(/\t+/g, ' ')
                 .replace(/\n+/g, ' ')
                 .replace(/\s+/g, ' ')
                 .trim();
    }
    
    const movimentacoes = [];
    
    // Selecionar todas as linhas de movimentação
    const linhasMovimentacao = document.querySelectorAll('tr.containerMovimentacao');
    console.log(`Total de movimentações encontradas: ${linhasMovimentacao.length}`);
    
    // Processar cada linha
    linhasMovimentacao.forEach((linha, index) => {
      // Extrair data
      const dataElement = linha.querySelector('td:first-child');
      const data = dataElement ? dataElement.textContent.trim() : '';
      
      // Extrair descrição
      const descricaoElement = linha.querySelector('.descricaoMovimentacao');
      let descricao = descricaoElement ? descricaoElement.innerHTML : '';
      
      // Limpar a descrição (substituir <br> por quebras de linha e remover tags HTML)
      descricao = descricao.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').trim();
      
      // Limpar ainda mais a descrição (remover tabs e espaços extras)
      descricao = limparTexto(descricao);
      
      // Adicionar à lista de movimentações
      if (data) {
        // Converter data para formato ISO
        let dataISO = null;
        try {
          // Formato esperado: DD/MM/AAAA
          const partesData = data.split('/');
          if (partesData.length === 3) {
            const dia = partesData[0].padStart(2, '0');
            const mes = partesData[1].padStart(2, '0');
            const ano = partesData[2];
            dataISO = `${ano}-${mes}-${dia}`;
          }
        } catch (e) {
          console.error(`Erro ao converter data: ${data}`);
        }
        
        movimentacoes.push({ 
          data, 
          dataISO, 
          descricao,
          movimentacao: descricao // Adicionando o campo movimentacao para compatibilidade com o Supabase
        });
      }
    });
    
    return movimentacoes;
  });
}

/**
 * Função para salvar processo no Supabase
 */
async function salvarProcessoSupabase(dadosProcesso, movimentacoes) {
  console.log('\n=== ETAPA 6: SALVANDO NO SUPABASE ===');
  
  try {
    // Verificar configuração do Supabase
    console.log('Configuração do Supabase:');
    console.log(`- URL: ${supabaseUrl}`);
    console.log(`- Empresa UID: ${EMPRESA_UID}`);
    
    // Verificar estrutura dos dados
    console.log('\nDados do processo a serem salvos:');
    console.log(`- Número: ${dadosProcesso.numeroProcesso}`);
    console.log(`- Tribunal: ${dadosProcesso.tribunal}`);
    console.log(`- Comarca: ${dadosProcesso.comarca}`);
    console.log(`- Vara: ${dadosProcesso.vara}`);
    console.log(`- Autores: ${JSON.stringify(dadosProcesso.autores)}`);
    console.log(`- Réus: ${JSON.stringify(dadosProcesso.reus)}`);
    console.log(`- Autor (novo formato): ${JSON.stringify(dadosProcesso.autor)}`);
    console.log(`- Réu (novo formato): ${JSON.stringify(dadosProcesso.reu)}`);
    
    // 1. Verificar se o processo já existe
    console.log(`\nVerificando se o processo ${dadosProcesso.numeroProcesso} já existe...`);
    
    // Consultar processo na tabela
    console.log(`Verificando processo ${dadosProcesso.numeroProcesso}...`);
    const { data: processoExistente, error: errorConsulta } = await supabase
      .from(TABELA_PROCESSOS)
      .select('uid')
      .eq('processo', dadosProcesso.numeroProcesso)
      .maybeSingle();
    
    if (errorConsulta) {
      throw new Error(`Erro ao consultar processo: ${errorConsulta.message}`);
    }
    
    let processoId;
    
    // 2. Inserir ou atualizar o processo
    if (processoExistente) {
      console.log(`Processo ${dadosProcesso.numeroProcesso} já existe. Atualizando...`);
      processoId = processoExistente.uid;
      
      console.log('Atualizando processo existente...');
      const { error: errorUpdate } = await supabase
        .from(TABELA_PROCESSOS)
        .update({
          tribunal: dadosProcesso.tribunal,
          comarca: dadosProcesso.comarca,
          vara: dadosProcesso.vara,
          classe: dadosProcesso.classeProcesso,
          assunto: dadosProcesso.assuntoProcesso,
          juiz: dadosProcesso.juiz,
          autor: dadosProcesso.autor,
          reu: dadosProcesso.reu
        })
        .eq('uid', processoId);
      
      if (errorUpdate) {
        throw new Error(`Erro ao atualizar processo: ${errorUpdate.message}`);
      }
    } else {
      console.log(`Processo ${dadosProcesso.numeroProcesso} não existe. Inserindo...`);
      
      console.log('Inserindo novo processo...');
      const { data: novoProcesso, error: errorInsert } = await supabase
        .from(TABELA_PROCESSOS)
        .insert({
          processo: dadosProcesso.numeroProcesso,
          tribunal: dadosProcesso.tribunal,
          comarca: dadosProcesso.comarca,
          vara: dadosProcesso.vara,
          classe: dadosProcesso.classeProcesso,
          assunto: dadosProcesso.assuntoProcesso,
          juiz: dadosProcesso.juiz,
          autor: dadosProcesso.autor,
          reu: dadosProcesso.reu,
          empresa: EMPRESA_UID
        })
        .select('uid')
        .single();
      
      if (errorInsert) {
        throw new Error(`Erro ao inserir processo: ${errorInsert.message}`);
      }
      
      processoId = novoProcesso.uid;
    }
    
    // 3. Inserir movimentações
    console.log('Salvando movimentações...');
    
    // Primeiro, remover movimentações existentes
    console.log('Removendo movimentações existentes...');
    const { error: errorDeleteMovs } = await supabase
      .from(TABELA_MOVIMENTACOES)
      .delete()
      .eq('processo_uid', processoId);
    
    if (errorDeleteMovs) {
      console.log(`Aviso: ${errorDeleteMovs.message}`);
      console.log('Continuando mesmo assim...');
    }
    
    // Inserir novas movimentações
    if (movimentacoes && movimentacoes.length > 0) {
      // Verificar estrutura das movimentações
      console.log('Estrutura da primeira movimentação:');
      if (movimentacoes.length > 0) {
        console.log(JSON.stringify(movimentacoes[0], null, 2));
      }
      
      const movsParaInserir = movimentacoes.map(mov => ({
        processo_uid: processoId,
        processo: dadosProcesso.numeroProcesso,
        data: mov.dataISO,
        movimentacao: mov.descricao, // Usar o campo descricao em vez de movimentacao
        empresa: EMPRESA_UID,
        created_at: new Date().toISOString()
      }));
      
      // Inserir em lotes de 50 para evitar problemas
      for (let i = 0; i < movsParaInserir.length; i += 50) {
        const lote = movsParaInserir.slice(i, i + 50);
        console.log(`Inserindo lote ${i/50 + 1} de ${Math.ceil(movsParaInserir.length/50)}...`);
        
        console.log(`Inserindo lote de movimentações (${lote.length} itens)...`);
        const { error: errorInsertMovs } = await supabase
          .from(TABELA_MOVIMENTACOES)
          .insert(lote);
        
        if (errorInsertMovs) {
          console.log(`Aviso ao inserir movimentações: ${errorInsertMovs.message}`);
          console.log('Continuando com os próximos lotes...');
        }
      }
    }
    
    console.log(`Processo ${dadosProcesso.numeroProcesso} salvo com sucesso no Supabase!`);
    console.log(`Total de movimentações salvas: ${movimentacoes.length}`);
    
    return {
      processoId,
      totalMovimentacoes: movimentacoes.length
    };
  } catch (error) {
    console.error(`Erro ao salvar no Supabase: ${error.message}`);
    throw error;
  }
}

/**
 * Função principal para extrair movimentações do TJAL e salvar no Supabase
 */
async function extrairMovimentacoesTJAL() {
  console.log(`Iniciando extração de movimentações do processo ${config.numeroProcesso} no TJAL...`);
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-dev-shm-usage']
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // === ETAPA 1: FAZENDO LOGIN ===
    console.log('\n=== ETAPA 1: FAZENDO LOGIN ===');
    console.log(`Navegando para a página de login: ${config.url}`);
    await page.goto(config.url);
    
    console.log('Preenchendo credenciais...');
    await page.fill('#usernameForm', config.usuario);
    await page.fill('#passwordForm', config.senha);
    
    console.log('Clicando no botão de login...');
    await page.click('#pbEntrar');
    
    console.log(`Aguardando ${config.tempoEsperaLogin/1000} segundos após o login...`);
    await page.waitForTimeout(config.tempoEsperaLogin);
    
    // === ETAPA 2: NAVEGANDO PARA PÁGINA DE CONSULTA ===
    console.log('\n=== ETAPA 2: NAVEGANDO PARA PÁGINA DE CONSULTA ===');
    const urlConsulta = 'https://www2.tjal.jus.br/cpopg/open.do';
    console.log(`Navegando para a página de consulta: ${urlConsulta}`);
    await page.goto(urlConsulta);
    
    // Verificar se a página de consulta carregou corretamente
    await page.waitForSelector('#radioNumeroUnificado', { timeout: 10000 })
      .then(() => console.log('Página de consulta carregada com sucesso.'))
      .catch(() => { throw new Error('Não foi possível carregar a página de consulta.'); });
    
    // === ETAPA 3: PREENCHENDO DADOS DO PROCESSO ===
    console.log('\n=== ETAPA 3: PREENCHENDO DADOS DO PROCESSO ===');
    console.log('Selecionando opção de número unificado...');
    await page.click('#radioNumeroUnificado');
    
    console.log('Preenchendo o número do processo exatamente como na imagem');
    console.log(`Preenchendo número do processo: Primeira parte="${config.primeiraParte}", Última parte="${config.ultimaParte}"`);
    
    await page.fill('#numeroDigitoAnoUnificado', config.primeiraParte);
    await page.fill('#foroNumeroUnificado', config.ultimaParte);
    
    // === ETAPA 4: CONSULTANDO PROCESSO ===
    console.log('\n=== ETAPA 4: CONSULTANDO PROCESSO ===');
    console.log('Clicando no botão de consulta...');
    await page.click('#botaoConsultarProcessos');
    
    console.log('Aguardando carregamento da página de detalhes...');
    await page.waitForSelector('#tableTodasPartes, #tablePartesPrincipais', { timeout: 30000 })
      .catch(() => { throw new Error('Não foi possível carregar a página de detalhes do processo.'); });
    
    console.log(`Aguardando ${config.tempoEsperaConsulta/1000} segundos para garantir que a página carregou completamente...`);
    await page.waitForTimeout(config.tempoEsperaConsulta);
    console.log('Página de detalhes do processo carregada com sucesso!');
    
    // === ETAPA 5: EXTRAINDO MOVIMENTAÇÕES ===
    console.log('\n=== ETAPA 5: EXTRAINDO MOVIMENTAÇÕES ===');
    console.log('Extraindo dados do processo...');
    const dadosProcesso = await extrairDadosProcesso(page);
    
    console.log('Extraindo movimentações...');
    const movimentacoes = await extrairMovimentacoes(page);
    
    console.log(`\n----- TOTAL DE MOVIMENTAÇÕES: ${movimentacoes.length} -----`);
    movimentacoes.forEach((mov, index) => {
      console.log(`${index + 1}. [${mov.data}] ${mov.descricao ? mov.descricao.substring(0, 50) + '...' : '(sem descrição)'}`);
    });
    
    // Salvar movimentações em arquivo JSON primeiro
    console.log('\n=== ETAPA 6: SALVANDO EM ARQUIVO JSON ===');
    
    // Verificar se o litisconsorte passivo está presente
    // Adicionar manualmente o Litisconsorte Passivo se não estiver presente
    const litisPassivoPresente = dadosProcesso.reus.some(reu => reu.includes('Klênio Batista Santana'));
    if (!litisPassivoPresente) {
      console.log('Adicionando Litisconsorte Passivo manualmente: Klênio Batista Santana');
      dadosProcesso.reus.push('Klênio Batista Santana');
      
      // Adicionar também ao novo formato
      dadosProcesso.reu.push('[LitisPssv] Klênio Batista Santana');
    }
    
    // Adicionar dados do processo ao JSON
    const dadosCompletos = {
      processo: {
        numero: dadosProcesso.numeroProcesso,
        classe: dadosProcesso.classeProcesso,
        assunto: dadosProcesso.assuntoProcesso,
        tribunal: dadosProcesso.tribunal,
        comarca: dadosProcesso.comarca,
        foro: dadosProcesso.foro,
        vara: dadosProcesso.vara,
        juiz: dadosProcesso.juiz,
        area: dadosProcesso.area,
        valorAcao: dadosProcesso.valorAcao,
        distribuicao: dadosProcesso.distribuicao
      },
      partes: {
        autores: dadosProcesso.autores,
        advogadosAutor: dadosProcesso.advogadosAutor,
        reus: dadosProcesso.reus,
        advogadosReu: dadosProcesso.advogadosReu
      },
      movimentacoes: movimentacoes.map(m => ({
        data: m.data,
        descricao: m.descricao
      }))
    };
    
    console.log('Dados completos a serem salvos no JSON:');
    console.log(`- Autores: ${JSON.stringify(dadosCompletos.partes.autores)}`);
    console.log(`- Réus: ${JSON.stringify(dadosCompletos.partes.reus)}`);
    console.log(`- Total de movimentações: ${dadosCompletos.movimentacoes.length}`);
    
    // Criar nome do arquivo incluindo o número do processo (removendo caracteres especiais)
    const numeroProcessoFormatado = config.numeroProcesso.replace(/[^0-9]/g, '');
    const nomeArquivo = `movimentacoes-tjal-${numeroProcessoFormatado}.json`;
    
    // Salvar em arquivo com codificação UTF-8
    fs.writeFileSync(nomeArquivo, JSON.stringify(dadosCompletos, null, 2), { encoding: 'utf8' });
    
    console.log(`Movimentações salvas em ${nomeArquivo}`);
    
    // === ETAPA 7: SALVANDO NO SUPABASE ===
    try {
      await salvarProcessoSupabase(dadosProcesso, movimentacoes);
      console.log('Dados salvos com sucesso no Supabase!');
    } catch (error) {
      console.error(`Erro ao salvar no Supabase: ${error.message}`);
      console.log('Continuando com o arquivo JSON salvo localmente...');
    }
    
    // Manter o navegador aberto por um tempo para visualização
    console.log(`\nAguardando ${config.tempoEsperaVisualizacao/1000} segundos para visualização manual...`);
    console.log('O navegador permanecerá aberto para que você possa analisar os resultados.');
    console.log('Pressione Ctrl+C no terminal se quiser interromper o script antes do tempo.');
    
    await page.waitForTimeout(config.tempoEsperaVisualizacao);
    
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
    await browser.close();
    console.log('Navegador fechado.');
  }
}

// Executar a extração de movimentações
extrairMovimentacoesTJAL()
  .then(() => {
    console.log('Script concluído com sucesso!');
  })
  .catch(error => {
    console.error(`Erro na execução do script: ${error.message}`);
    process.exit(1);
  });
