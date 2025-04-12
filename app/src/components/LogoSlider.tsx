'use client';

import { useEffect, useState } from 'react';

interface LogoItem {
  url: string;
  alt: string;
}

interface LogoSliderProps {
  logos: LogoItem[];
}

export default function LogoSlider({ logos }: LogoSliderProps) {
  const [mounted, setMounted] = useState(false);

  // Evitar problemas de hidratação
  useEffect(() => {
    setMounted(true);
  }, []);

  // Se não estiver montado, não renderizar nada
  if (!mounted) {
    return null;
  }

  // Duplicar os logos para criar o efeito de loop contínuo
  const duplicatedLogos = [...logos, ...logos];

  return (
    <div className="w-full overflow-hidden">
      <div className="logo-slider-container relative">
        <div className="logo-slider flex animate-slide">
          {duplicatedLogos.map((logo, index) => (
            <div 
              key={index} 
              className="logo-slide flex-shrink-0 mx-8 h-24 flex items-center justify-center"
              style={{ minWidth: '150px' }}
            >
              <img 
                src={logo.url} 
                alt={logo.alt} 
                className="max-h-20 max-w-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-slide {
          animation: slide 30s linear infinite;
        }
        
        .logo-slider-container:hover .animate-slide {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
