/**
 * Script para inserir dados fictícios no Supabase
 * Insere um processo e 3 movimentações relacionadas
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase com a chave de serviço
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ID da empresa (deve existir na tabela empresas)
const EMPRESA_UID = 'c0a80121-7ac0-1d2e-8175-0a80121f0002';

// Criar cliente Supabase com a chave de serviço (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'alnpp' }
});

// Dados fictícios do processo
const dadosProcesso = {
  tribunal: 'TJAL',
  comarca: 'Maceió',
  processo: '1234567-89.2025.8.02.0001',
  vara: '10ª Vara Cível',
  classe: 'Procedimento Comum Cível',
  assunto: 'Indenização por Dano Material',
  juiz: 'Dr. João Silva',
  autor: ['Empresa ABC Ltda'],
  adv_autor: ['Dr. Carlos Advogado', 'Dra. Maria Advogada'],
  empresa: EMPRESA_UID
};

// Dados fictícios das movimentações
const movimentacoes = [
  {
    data: '2025-04-01', // Formato AAAA-MM-DD
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
 * Função para inserir dados fictícios no Supabase
 */
async function inserirDadosFicticios() {
  try {
    console.log('=== INSERINDO DADOS FICTÍCIOS NO SUPABASE ===');
    
    // Verificar se o processo já existe
    console.log(`Verificando se o processo ${dadosProcesso.processo} já existe...`);
    
    const { data: processoExistente, error: erroConsulta } = await supabase
      .from('processos')
      .select('uid')
      .eq('processo', dadosProcesso.processo)
      .single();
    
    if (erroConsulta && erroConsulta.code !== 'PGRST116') {
      console.error('Erro ao consultar processo:', erroConsulta);
      throw new Error(`Erro ao consultar processo: ${erroConsulta.message}`);
    }
    
    let processoUid;
    
    if (processoExistente) {
      console.log(`Processo ${dadosProcesso.processo} já existe no banco de dados.`);
      processoUid = processoExistente.uid;
      
      // Atualizar o processo existente
      console.log('Atualizando dados do processo...');
      
      const { error: erroAtualizacao } = await supabase
        .from('processos')
        .update(dadosProcesso)
        .eq('uid', processoUid);
      
      if (erroAtualizacao) {
        console.error('Erro ao atualizar processo:', erroAtualizacao);
        throw new Error(`Erro ao atualizar processo: ${erroAtualizacao.message}`);
      }
      
      console.log('Processo atualizado com sucesso!');
    } else {
      console.log(`Inserindo novo processo ${dadosProcesso.processo}...`);
      
      // Inserir novo processo
      const { data: novoProcesso, error: erroInsercao } = await supabase
        .from('processos')
        .insert(dadosProcesso)
        .select();
      
      if (erroInsercao) {
        console.error('Erro ao inserir processo:', erroInsercao);
        throw new Error(`Erro ao inserir processo: ${erroInsercao.message}`);
      }
      
      if (!novoProcesso || novoProcesso.length === 0) {
        console.error('Erro: Não foi possível obter o UID do processo inserido');
        throw new Error('Não foi possível obter o UID do processo inserido');
      }
      
      processoUid = novoProcesso[0].uid;
      console.log(`Processo inserido com sucesso! UID: ${processoUid}`);
    }
    
    // Inserir as movimentações
    console.log(`Inserindo ${movimentacoes.length} movimentações...`);
    
    // Preparar movimentações para inserção
    const movimentacoesParaInserir = movimentacoes.map(mov => ({
      processo_uid: processoUid,
      data: mov.data,
      movimentacao: mov.movimentacao,
      empresa: EMPRESA_UID,
      processo: dadosProcesso.processo
    }));
    
    // Inserir movimentações
    const { data: movsInseridas, error: erroInsercaoMovs } = await supabase
      .from('movimentacoes')
      .insert(movimentacoesParaInserir)
      .select();
    
    if (erroInsercaoMovs) {
      console.error('Erro ao inserir movimentações:', erroInsercaoMovs);
      throw new Error(`Erro ao inserir movimentações: ${erroInsercaoMovs.message}`);
    }
    
    console.log(`${movimentacoesParaInserir.length} movimentações inseridas com sucesso!`);
    
    // Exibir resumo dos dados inseridos
    console.log('\n=== RESUMO DOS DADOS INSERIDOS ===');
    console.log(`Processo: ${dadosProcesso.processo}`);
    console.log(`UID: ${processoUid}`);
    console.log(`Tribunal: ${dadosProcesso.tribunal}`);
    console.log(`Classe: ${dadosProcesso.classe}`);
    console.log(`Movimentações inseridas: ${movimentacoesParaInserir.length}`);
    
    return {
      processoUid,
      movimentacoesUids: movsInseridas ? movsInseridas.map(m => m.uid) : []
    };
  } catch (error) {
    console.error('Erro ao inserir dados fictícios:', error);
    return null;
  }
}

// Executar a função para inserir dados fictícios
inserirDadosFicticios()
  .then(resultado => {
    if (resultado) {
      console.log('\nDados fictícios inseridos com sucesso!');
    } else {
      console.log('\nFalha ao inserir dados fictícios.');
    }
  })
  .catch(error => {
    console.error('Erro na execução do script:', error);
  });
