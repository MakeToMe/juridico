/**
 * Script simples para testar a conexão com o Supabase
 * e inserir um único registro de teste
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== CONFIGURAÇÃO DO SUPABASE ===');
console.log(`URL: ${supabaseUrl}`);
console.log(`Chave de serviço disponível: ${supabaseServiceKey ? 'Sim' : 'Não'}`);

// ID da empresa
const EMPRESA_UID = 'c0a80121-7ac0-1d2e-8175-0a80121f0002';

// Criar cliente Supabase com a chave de serviço
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'alnpp' }
});

// Dados simples para teste
const dadosProcessoTeste = {
  tribunal: 'TJAL',
  processo: 'TESTE-' + Date.now(),
  classe: 'Teste de Inserção',
  autor: ['Autor Teste'],
  empresa: EMPRESA_UID
};

/**
 * Função para testar a conexão com o Supabase
 */
async function testarConexaoSupabase() {
  try {
    console.log('\n=== TESTANDO CONEXÃO COM O SUPABASE ===');
    
    // Testar conexão com uma consulta simples
    console.log('Realizando consulta de teste...');
    
    const { data, error } = await supabase
      .from('processos')
      .select('uid')
      .limit(1);
    
    if (error) {
      console.error('Erro na consulta de teste:', error);
      return false;
    }
    
    console.log('Consulta realizada com sucesso!');
    console.log('Resultado:', data);
    
    return true;
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    return false;
  }
}

/**
 * Função para inserir dados de teste no Supabase
 */
async function inserirDadosTeste() {
  try {
    console.log('\n=== INSERINDO DADOS DE TESTE NO SUPABASE ===');
    
    console.log('Dados a serem inseridos:');
    console.log(JSON.stringify(dadosProcessoTeste, null, 2));
    
    // Inserir processo de teste
    console.log('\nInserindo processo de teste...');
    
    const { data, error } = await supabase
      .from('processos')
      .insert(dadosProcessoTeste)
      .select();
    
    if (error) {
      console.error('Erro ao inserir dados de teste:', error);
      
      // Verificar se é um erro de RLS
      if (error.code === '42501') {
        console.error('ERRO DE POLÍTICA RLS: O cliente não tem permissão para inserir dados.');
        console.error('Verifique se está usando a chave de serviço correta e se o schema está configurado.');
      }
      
      // Verificar se é um erro de schema/tabela
      if (error.code === '42P01') {
        console.error('ERRO DE TABELA: A tabela não existe ou o schema está incorreto.');
        console.error('Verifique se o schema "alnpp" está configurado corretamente.');
      }
      
      // Verificar se é um erro de conexão
      if (error.code === 'PGRST') {
        console.error('ERRO DE CONEXÃO: Não foi possível conectar ao Supabase.');
        console.error('Verifique a URL e a chave de serviço.');
      }
      
      return null;
    }
    
    console.log('Dados inseridos com sucesso!');
    console.log('Resultado:', data);
    
    return data[0].uid;
  } catch (error) {
    console.error('Erro ao inserir dados de teste:', error);
    return null;
  }
}

// Executar os testes
async function executarTestes() {
  // Testar conexão
  const conexaoOk = await testarConexaoSupabase();
  
  if (!conexaoOk) {
    console.error('\nFalha na conexão com o Supabase. Não é possível continuar.');
    return;
  }
  
  // Inserir dados de teste
  const processoUid = await inserirDadosTeste();
  
  if (processoUid) {
    console.log('\n=== TESTE CONCLUÍDO COM SUCESSO ===');
    console.log(`Processo inserido com UID: ${processoUid}`);
  } else {
    console.log('\n=== TESTE FALHOU ===');
    console.log('Não foi possível inserir dados de teste.');
  }
}

// Executar os testes
executarTestes()
  .catch(error => {
    console.error('Erro na execução dos testes:', error);
  });
