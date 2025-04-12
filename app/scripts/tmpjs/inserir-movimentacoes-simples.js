/**
 * Script para inserir movimentações para um processo existente no Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Criar cliente Supabase com a chave de serviço
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'alnpp' }
});

// ID da empresa
const EMPRESA_UID = '807d031b-d08e-492e-94ba-428b28fb604e';

// ID do processo (obtido do script anterior)
const PROCESSO_UID = '6a967ec9-88c7-43b5-9641-ed809a2dc1f8';

// Número do processo (para referência)
const NUMERO_PROCESSO = 'TESTE-1743992388629';

// Movimentações para inserir
const movimentacoes = [
  {
    data: '2025-04-01',
    movimentacao: 'Distribuição do Processo'
  },
  {
    data: '2025-04-03',
    movimentacao: 'Despacho - Cite-se o réu'
  },
  {
    data: '2025-04-05',
    movimentacao: 'Expedição de Mandado de Citação'
  }
];

/**
 * Função para inserir movimentações no Supabase
 */
async function inserirMovimentacoes() {
  try {
    console.log('=== INSERINDO MOVIMENTAÇÕES NO SUPABASE ===');
    console.log(`Processo UID: ${PROCESSO_UID}`);
    console.log(`Número do Processo: ${NUMERO_PROCESSO}`);
    console.log(`Total de movimentações: ${movimentacoes.length}`);
    
    // Preparar movimentações para inserção
    const movimentacoesParaInserir = movimentacoes.map(mov => ({
      processo_uid: PROCESSO_UID,
      data: mov.data,
      movimentacao: mov.movimentacao,
      empresa: EMPRESA_UID,
      processo: NUMERO_PROCESSO
    }));
    
    console.log('\nDados a serem inseridos:');
    console.log(JSON.stringify(movimentacoesParaInserir, null, 2));
    
    // Inserir movimentações
    console.log('\nInserindo movimentações...');
    
    const { data, error } = await supabase
      .from('movimentacoes')
      .insert(movimentacoesParaInserir)
      .select();
    
    if (error) {
      console.error('Erro ao inserir movimentações:', error);
      return null;
    }
    
    console.log('Movimentações inseridas com sucesso!');
    console.log('Dados retornados:');
    console.log(JSON.stringify(data, null, 2));
    
    return data.map(m => m.uid);
  } catch (error) {
    console.error('Erro ao inserir movimentações:', error);
    return null;
  }
}

// Executar a função
inserirMovimentacoes()
  .then(uids => {
    if (uids && uids.length > 0) {
      console.log(`\nMovimentações inseridas com sucesso!`);
      console.log(`Total de movimentações inseridas: ${uids.length}`);
      console.log('UIDs das movimentações:');
      uids.forEach((uid, index) => {
        console.log(`${index + 1}. ${uid}`);
      });
    } else {
      console.log('\nFalha ao inserir movimentações.');
    }
  })
  .catch(error => {
    console.error('Erro na execução do script:', error);
  });
