'use client';

import React from 'react';

interface Movimentacao {
  data?: string;
  descricao?: string;
}

interface Parte {
  tipo?: string;
  nome?: string;
}

interface ResultadoConsultaProps {
  resultado: {
    sucesso: boolean;
    encontrado?: boolean;
    dados?: {
      numeroProcesso?: string;
      classe?: string;
      assunto?: string;
      distribuicao?: string;
      juiz?: string;
      valorAcao?: string;
      statusProcesso?: string;
      movimentacoes: Movimentacao[];
      partes: Parte[];
      dataConsulta: string;
    };
    erro?: string;
  } | null;
}

const ResultadoConsulta: React.FC<ResultadoConsultaProps> = ({ resultado }) => {
  if (!resultado) {
    return null;
  }

  if (!resultado.sucesso) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Erro na consulta</h3>
        <p className="text-red-600">{resultado.erro || 'Ocorreu um erro ao consultar o processo.'}</p>
      </div>
    );
  }

  if (!resultado.encontrado) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-yellow-700 mb-2">Processo não encontrado</h3>
        <p className="text-yellow-600">Não foram encontrados dados para o processo informado.</p>
      </div>
    );
  }

  const { dados } = resultado;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
      <h3 className="text-xl font-bold mb-4" style={{ color: '#1F3626' }}>Resultado da Consulta</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-500 mb-1">Número do Processo</h4>
          <p className="text-gray-800">{dados?.numeroProcesso || 'Não informado'}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-gray-500 mb-1">Classe</h4>
          <p className="text-gray-800">{dados?.classe || 'Não informado'}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-gray-500 mb-1">Assunto</h4>
          <p className="text-gray-800">{dados?.assunto || 'Não informado'}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-gray-500 mb-1">Distribuição</h4>
          <p className="text-gray-800">{dados?.distribuicao || 'Não informado'}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-gray-500 mb-1">Juiz</h4>
          <p className="text-gray-800">{dados?.juiz || 'Não informado'}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-gray-500 mb-1">Valor da Ação</h4>
          <p className="text-gray-800">{dados?.valorAcao || 'Não informado'}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-gray-500 mb-1">Status do Processo</h4>
          <p className="text-gray-800">{dados?.statusProcesso || 'Não informado'}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-gray-500 mb-1">Data da Consulta</h4>
          <p className="text-gray-800">
            {dados?.dataConsulta 
              ? new Date(dados.dataConsulta).toLocaleString('pt-BR') 
              : 'Não informado'}
          </p>
        </div>
      </div>
      
      {/* Partes do processo */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-3" style={{ color: '#1F3626' }}>Partes do Processo</h4>
        {dados?.partes && dados.partes.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dados.partes.map((parte, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{parte.tipo || 'Não informado'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{parte.nome || 'Não informado'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">Nenhuma parte encontrada.</p>
        )}
      </div>
      
      {/* Movimentações */}
      <div>
        <h4 className="text-lg font-semibold mb-3" style={{ color: '#1F3626' }}>Movimentações</h4>
        {dados?.movimentacoes && dados.movimentacoes.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dados.movimentacoes.map((movimentacao, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{movimentacao.data || 'Não informado'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{movimentacao.descricao || 'Não informado'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">Nenhuma movimentação encontrada.</p>
        )}
      </div>
    </div>
  );
};

export default ResultadoConsulta;
