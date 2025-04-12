/**
 * Script para testar a API de processos
 */

const fetch = require('node-fetch');

// URL da API
const API_URL = 'http://localhost:3000/api/processo';

// Dados de teste
const dadosProcesso = {
  numeroProcesso: '0727108-89.2024.8.02.0001',
  classeProcesso: 'Cumprimento Provisório de Sentença',
  assuntoProcesso: 'Constrição / Penhora / Avaliação / Indisponibilidade de Bens',
  juiz: 'Juiz de Teste',
  empresaUid: 'c0a80121-7ac0-1d2e-8175-0a80121f0002',
  partes: [
    {
      tipo: 'Autor',
      nome: 'Luna & Guardia Sociedade de Advogados',
      advogados: ['Flavio Marcelo Guardia']
    },
    {
      tipo: 'Réu',
      nome: 'Localyne Transporte Tur. Ltda',
      advogados: ['Márcio Macedo Conrado', 'Rodrigo Fernandes da Fonseca']
    }
  ]
};

// Movimentações de teste
const movimentacoes = [
  {
    data: '28/03/2025',
    descricao: 'Comunicação de Decisão - 2º Grau'
  },
  {
    data: '10/03/2025',
    descricao: 'Petição'
  },
  {
    data: '18/02/2025',
    descricao: 'Petição'
  },
  {
    data: '17/02/2025',
    descricao: 'Pedido de Bloqueio'
  }
];

/**
 * Função para enviar dados para a API
 */
async function enviarDadosParaAPI() {
  try {
    console.log('Enviando dados para a API...');
    console.log(`URL: ${API_URL}`);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dadosProcesso,
        movimentacoes
      }),
    });
    
    const responseText = await response.text();
    console.log('Resposta bruta:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Erro ao parsear resposta JSON:', e);
      console.log('Resposta não é um JSON válido');
      return null;
    }
    
    if (!response.ok) {
      console.error(`Erro ${response.status}: ${response.statusText}`);
      console.error('Detalhes do erro:', result.error || 'Sem detalhes');
      return null;
    }
    
    console.log('Resposta da API:', result);
    
    if (result.success) {
      console.log(`\nDados salvos com sucesso no Supabase!`);
      console.log(`UID do processo: ${result.processoUid}`);
      return result.processoUid;
    } else {
      console.log(`\nNão foi possível salvar os dados no Supabase.`);
      return null;
    }
  } catch (error) {
    console.error('Erro ao enviar dados para a API:', error);
    return null;
  }
}

// Executar o teste
enviarDadosParaAPI()
  .then(processoUid => {
    if (processoUid) {
      console.log('Teste concluído com sucesso!');
    } else {
      console.log('Teste falhou.');
    }
  })
  .catch(error => {
    console.error('Erro durante o teste:', error);
  });
