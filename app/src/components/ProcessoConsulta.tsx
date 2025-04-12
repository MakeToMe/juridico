'use client';

import React, { useState } from 'react';

interface ProcessoConsultaProps {
  onConsultar: (numeroProcesso: string) => Promise<void>;
  isLoading: boolean;
}

const ProcessoConsulta: React.FC<ProcessoConsultaProps> = ({ onConsultar, isLoading }) => {
  const [numeroProcesso, setNumeroProcesso] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numeroProcesso.trim()) {
      await onConsultar(numeroProcesso);
    }
  };

  // Função para formatar o número do processo no padrão CNJ
  const formatarNumeroProcesso = (numero: string) => {
    // Remove caracteres não numéricos
    const numerosApenas = numero.replace(/\D/g, '');
    
    // Aplica a máscara do padrão CNJ (NNNNNNN-NN.NNNN.N.NN.NNNN)
    if (numerosApenas.length <= 7) {
      return numerosApenas;
    } else if (numerosApenas.length <= 9) {
      return `${numerosApenas.slice(0, 7)}-${numerosApenas.slice(7)}`;
    } else if (numerosApenas.length <= 13) {
      return `${numerosApenas.slice(0, 7)}-${numerosApenas.slice(7, 9)}.${numerosApenas.slice(9)}`;
    } else if (numerosApenas.length <= 14) {
      return `${numerosApenas.slice(0, 7)}-${numerosApenas.slice(7, 9)}.${numerosApenas.slice(9, 13)}.${numerosApenas.slice(13)}`;
    } else if (numerosApenas.length <= 16) {
      return `${numerosApenas.slice(0, 7)}-${numerosApenas.slice(7, 9)}.${numerosApenas.slice(9, 13)}.${numerosApenas.slice(13, 14)}.${numerosApenas.slice(14)}`;
    } else {
      return `${numerosApenas.slice(0, 7)}-${numerosApenas.slice(7, 9)}.${numerosApenas.slice(9, 13)}.${numerosApenas.slice(13, 14)}.${numerosApenas.slice(14, 16)}.${numerosApenas.slice(16, 20)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setNumeroProcesso(formatarNumeroProcesso(valor));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#1F3626' }}>Consulta Processual</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="numeroProcesso" className="block text-sm font-medium text-gray-700 mb-1">
            Número do Processo (formato CNJ)
          </label>
          <input
            type="text"
            id="numeroProcesso"
            value={numeroProcesso}
            onChange={handleChange}
            placeholder="NNNNNNN-NN.NNNN.N.NN.NNNN"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isLoading}
          />
          <p className="mt-1 text-sm text-gray-500">
            Ex: 0710802-55.2018.8.02.0001
          </p>
        </div>
        
        <button
          type="submit"
          className="w-full py-2 px-4 bg-green-700 hover:bg-green-800 text-white font-medium rounded-md transition duration-300 flex items-center justify-center"
          style={{ backgroundColor: '#1F3626' }}
          disabled={isLoading || !numeroProcesso.trim()}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Consultando...
            </>
          ) : (
            'Consultar Processo'
          )}
        </button>
      </form>
    </div>
  );
};

export default ProcessoConsulta;
