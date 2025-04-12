'use client';

import React, { useEffect, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Registrar os componentes necessários do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

interface SpecialtyChartProps {
  data: {
    label: string;
    percentage: number;
    color: string;
  }[];
}

const SpecialtyChart: React.FC<SpecialtyChartProps> = ({ data }) => {
  const chartRef = useRef<ChartJS<"doughnut", number[], string>>(null);
  
  // Preparar os dados para o gráfico
  const chartData = {
    labels: data.map(item => `${item.label} - ${item.percentage}%`),
    datasets: [
      {
        data: data.map(item => item.percentage),
        backgroundColor: data.map(item => item.color),
        borderColor: data.map(item => item.color),
        borderWidth: 1,
        hoverOffset: 15,
      },
    ],
  };
  
  // Opções do gráfico
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            size: 14,
            family: 'Arial, sans-serif',
          },
          color: '#1F3626',
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.raw}%`;
          }
        },
        backgroundColor: '#1F3626',
        titleFont: {
          size: 14,
          family: 'Arial, sans-serif',
        },
        bodyFont: {
          size: 14,
          family: 'Arial, sans-serif',
        },
        padding: 12,
        cornerRadius: 8,
      },
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 2000,
      easing: 'easeInOutQuart' as const,
    },
  };

  // Efeito para animação personalizada
  useEffect(() => {
    const chart = chartRef.current;
    
    if (chart) {
      // Adicionar animação suave quando o componente é montado
      chart.update();
    }
  }, []);

  return (
    <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center">
      <h3 className="text-xl font-semibold mb-4" style={{ color: '#1F3626' }}>
        Distribuição de Casos
      </h3>
      <div className="w-full h-[350px] relative">
        <Doughnut ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SpecialtyChart;
