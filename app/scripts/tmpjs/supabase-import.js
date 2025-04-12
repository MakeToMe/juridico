require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'alnpp' } // Definir schema explicitamente
});

// ID da empresa
const EMPRESA_ID = '807d031b-d08e-492e-94ba-428b28fb604e';

/**
 * Converte uma data no formato DD/MM/YYYY para YYYY-MM-DD
 */
function converterData(dataStr) {
  if (!dataStr) return null;
  const partesData = dataStr.split('/');
  if (partesData.length !== 3) return null;
  return `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
}

/**
 * Importa os dados do processo para o Supabase
 */
async function importarProcesso() {
  try {
    console.log('Iniciando importação de processo para o Supabase...');
    
    // Ler o JSON gerado
    const jsonPath = path.resolve(__dirname, '..', 'movimentacoes-tjal.json');
    console.log(`Lendo arquivo JSON: ${jsonPath}`);
    
    const dadosProcesso = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`Processo: ${dadosProcesso.processo.numero}`);
    
    // Extrair autores e advogados
    const autores = dadosProcesso.partes.autores.map(a => a.nome);
    
    // Flatten e remover duplicatas dos advogados
    const advogadosSet = new Set();
    dadosProcesso.partes.autores.forEach(autor => {
      if (autor.advogados && Array.isArray(autor.advogados)) {
        autor.advogados.forEach(adv => {
          // Limpar o advogado (remover quebras de linha e espaços extras)
          const advLimpo = adv.replace(/\\n|\\t/g, ' ').replace(/\\s+/g, ' ').trim();
          if (advLimpo) advogadosSet.add(advLimpo);
        });
      }
    });
    const advogados = Array.from(advogadosSet);
    
    // Preparar dados do processo
    const processo = {
      tribunal: 'TJAL',
      comarca: dadosProcesso.processo.foro,
      processo: dadosProcesso.processo.numero,
      vara: dadosProcesso.processo.vara,
      classe: dadosProcesso.processo.classe,
      assunto: dadosProcesso.processo.assunto,
      juiz: dadosProcesso.processo.juiz,
      autor: autores,
      adv_autor: advogados,
      empresa: EMPRESA_ID
    };
    
    console.log('Dados do processo preparados:', JSON.stringify(processo, null, 2));
    
    // Verificar se o processo já existe
    console.log(`Verificando se o processo ${processo.processo} já existe...`);
    const { data: processoExistente, error: erroConsulta } = await supabase
      .from('processos')
      .select('uid')
      .eq('processo', processo.processo)
      .eq('empresa', EMPRESA_ID)
      .maybeSingle();
    
    if (erroConsulta) {
      console.error('Erro ao consultar processo:', erroConsulta);
      return;
    }
    
    let processoUid;
    
    if (processoExistente) {
      console.log(`Processo encontrado. UID: ${processoExistente.uid}`);
      
      // Atualizar processo existente
      const { data: processoAtualizado, error: erroAtualizacao } = await supabase
        .from('processos')
        .update(processo)
        .eq('uid', processoExistente.uid)
        .select('uid')
        .single();
      
      if (erroAtualizacao) {
        console.error('Erro ao atualizar processo:', erroAtualizacao);
        return;
      }
      
      processoUid = processoAtualizado.uid;
      console.log(`Processo atualizado com sucesso. UID: ${processoUid}`);
    } else {
      console.log('Processo não encontrado. Inserindo novo processo...');
      
      // Inserir novo processo
      const { data: novoProcesso, error: erroInsercao } = await supabase
        .from('processos')
        .insert(processo)
        .select('uid')
        .single();
      
      if (erroInsercao) {
        console.error('Erro ao inserir processo:', erroInsercao);
        return;
      }
      
      processoUid = novoProcesso.uid;
      console.log(`Processo inserido com sucesso. UID: ${processoUid}`);
    }
    
    // Importar movimentações
    console.log(`Importando ${dadosProcesso.movimentacoes.length} movimentações...`);
    let contadorNovas = 0;
    let contadorExistentes = 0;
    let contadorErros = 0;
    
    for (const mov of dadosProcesso.movimentacoes) {
      // Converter data para formato ISO
      const dataFormatada = converterData(mov.data);
      if (!dataFormatada) {
        console.warn(`Data inválida: ${mov.data}. Pulando movimentação.`);
        continue;
      }
      
      // Verificar se a movimentação já existe
      const { data: movExistente, error: erroConsultaMov } = await supabase
        .from('movimentacoes')
        .select('uid')
        .eq('processo_uid', processoUid)
        .eq('data', dataFormatada)
        .eq('movimentacao', mov.descricao)
        .maybeSingle();
      
      if (erroConsultaMov) {
        console.error('Erro ao consultar movimentação:', erroConsultaMov);
        contadorErros++;
        continue;
      }
      
      if (!movExistente) {
        // Inserir nova movimentação
        const { error: erroInsercaoMov } = await supabase
          .from('movimentacoes')
          .insert({
            processo_uid: processoUid,
            data: dataFormatada,
            movimentacao: mov.descricao,
            empresa: EMPRESA_ID,
            processo: processo.processo
          });
        
        if (erroInsercaoMov) {
          console.error('Erro ao inserir movimentação:', erroInsercaoMov);
          contadorErros++;
        } else {
          contadorNovas++;
          console.log(`Movimentação inserida: ${dataFormatada}`);
        }
      } else {
        contadorExistentes++;
        console.log(`Movimentação já existe: ${dataFormatada}`);
      }
    }
    
    console.log(`
    ========== RESUMO DA IMPORTAÇÃO ==========
    Processo: ${processo.processo}
    UID: ${processoUid}
    Novas movimentações: ${contadorNovas}
    Movimentações já existentes: ${contadorExistentes}
    Erros: ${contadorErros}
    ==========================================
    `);
    
  } catch (error) {
    console.error('Erro ao importar processo:', error);
  }
}

// Executar a importação
importarProcesso();
