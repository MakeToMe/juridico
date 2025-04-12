'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProcessoConsulta from '@/components/ProcessoConsulta';
import ResultadoConsulta from '@/components/ResultadoConsulta';

interface ResultadoConsultaData {
  sucesso: boolean;
  encontrado?: boolean;
  dados?: any;
  erro?: string;
}

export default function ConsultaProcessual() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoConsultaData | null>(null);

  const handleConsultar = async (numeroProcesso: string) => {
    setIsLoading(true);
    setResultado(null);

    try {
      // Chamar a API para consultar o processo
      const response = await fetch('/api/consulta-processo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numeroProcesso }),
      });
      
      const resultadoConsulta = await response.json();
      
      // Atualizar o estado com o resultado
      setResultado(resultadoConsulta);
    } catch (error) {
      console.error('Erro ao consultar processo:', error);
      setResultado({
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido durante a consulta'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold" style={{ color: '#1F3626' }}>
              Consulta Processual
            </h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 transition duration-300"
            >
              Voltar ao Dashboard
            </button>
          </div>
          <p className="text-gray-600">
            Consulte processos judiciais do TJAL utilizando o número no formato CNJ.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8">
          {/* Formulário de consulta */}
          <ProcessoConsulta onConsultar={handleConsultar} isLoading={isLoading} />
          
          {/* Resultado da consulta */}
          <ResultadoConsulta resultado={resultado} />
        </div>
      </div>
    </div>
  );
}
