'use client';

import { useEffect, useState } from 'react';

interface SlideImage {
  url: string;
  alt: string;
}

interface HeroSliderProps {
  images: SlideImage[];
}

export default function HeroSlider({ images }: HeroSliderProps) {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Evitar problemas de hidratação
  useEffect(() => {
    setMounted(true);
    
    // Iniciar o slider quando o componente montar
    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [images.length]);

  // Se não estiver montado, mostrar uma div vazia
  if (!mounted) {
    return <div className="absolute inset-0 bg-gray-900" />;
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Imagens do slider */}
      {images.map((image, index) => (
        <div 
          key={index}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
        >
          <div 
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${image.url})` }}
          />
        </div>
      ))}
      
      {/* Overlay para melhorar a legibilidade do texto */}
      <div className="absolute inset-0 bg-black/60 z-10"></div>
    </div>
  );
}
