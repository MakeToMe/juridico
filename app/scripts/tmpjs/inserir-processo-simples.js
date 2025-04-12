/**
 * Script simples para inserir um processo no Supabase
 * e retornar o UID gerado
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== CONFIGURAÇÃO DO SUPABASE ===');
console.log(`URL: ${supabaseUrl}`);
console.log(`Chave de serviço disponível: ${supabaseServiceKey ? 'Sim' : 'Não'}`);

// ID da empresa correto
const EMPRESA_UID = '807d031b-d08e-492e-94ba-428b28fb604e';

// Criar cliente Supabase com a chave de serviço
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'alnpp' }
});

// Dados do processo para teste
const dadosProcesso = {
  tribunal: 'TJAL',
  processo: 'TESTE-' + Date.now(),
  classe: 'Procedimento Comum Cível',
  assunto: 'Teste de Inserção',
  juiz: 'Dr. Teste',
  autor: ['Autor Teste'],
  adv_autor: ['Advogado Teste'],
  empresa: EMPRESA_UID
};

/**
 * Função para inserir processo no Supabase
 */
async function inserirProcesso() {
  try {
    console.log('\n=== INSERINDO PROCESSO NO SUPABASE ===');
    console.log('Dados do processo:');
    console.log(JSON.stringify(dadosProcesso, null, 2));
    
    // Inserir processo
    console.log('\nInserindo processo...');
    
    const { data, error } = await supabase
      .from('processos')
      .insert(dadosProcesso)
      .select();
    
    if (error) {
      console.error('Erro ao inserir processo:', error);
      return null;
    }
    
    console.log('Processo inserido com sucesso!');
    console.log('Dados retornados:');
    console.log(JSON.stringify(data, null, 2));
    
    return data[0].uid;
  } catch (error) {
    console.error('Erro ao inserir processo:', error);
    return null;
  }
}

// Executar a função
inserirProcesso()
  .then(uid => {
    if (uid) {
      console.log(`\nProcesso inserido com sucesso! UID: ${uid}`);
      
      // Agora podemos usar este UID para inserir movimentações
      console.log('\nPara inserir movimentações, use este UID como processo_uid');
    } else {
      console.log('\nFalha ao inserir processo.');
    }
  })
  .catch(error => {
    console.error('Erro na execução do script:', error);
  });
