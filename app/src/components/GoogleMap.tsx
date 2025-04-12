'use client';

import { useEffect, useRef } from 'react';

// Definição de tipos para o Google Maps API
interface GoogleMapProps {
  address: string;
  apiKey: string;
}

type GoogleGeocodeResult = {
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    }
  }
};

export default function GoogleMap({ address, apiKey }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const isScriptLoaded = useRef(false);

  useEffect(() => {
    // Evitar carregar o script múltiplas vezes
    if (isScriptLoaded.current) return;
    
    // Função para inicializar o mapa
    const initMap = () => {
      if (!mapRef.current || !window.google) return;
      
      // Geocodificar o endereço para obter as coordenadas
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results: GoogleGeocodeResult[] | null, status: string) => {
        if (status === 'OK' && results && results[0]) {
          
          
          // Criar o mapa com o mapId necessário para marcadores avançados
          // Quando mapId está presente, os estilos são controlados via console do Google Cloud
          const map = new window.google.maps.Map(mapRef.current, {
            center: results[0].geometry.location,
            zoom: 16,
            mapTypeControl: false,
            fullscreenControl: false,
            mapId: "alnpp-map" // MapId é necessário para marcadores avançados
          });
          
          // Usar o marcador avançado conforme a documentação oficial
          try {
            // Verificar se a biblioteca de marcadores está disponível
            if (window.google.maps.marker) {
              // Criar um elemento de pin personalizado
              const pinElement = document.createElement('div');
              pinElement.innerHTML = `
                <div style="
                  background-color: #1F3626; 
                  color: white; 
                  padding: 8px 12px; 
                  border-radius: 8px; 
                  font-weight: bold; 
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  gap: 4px;
                ">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                  </svg>
                  ALNPP Advocacia
                </div>
              `;
              
              // Criar o marcador avançado
              const advancedMarker = new window.google.maps.marker.AdvancedMarkerElement({
                map,
                position: results[0].geometry.location,
                title: 'ALNPP Advocacia',
                content: pinElement
              });
              
              // Adicionar evento de clique para abrir o Google Maps em uma nova aba
              // Usar 'gmp-click' em vez de 'click' conforme recomendado
              advancedMarker.addEventListener('gmp-click', () => {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
              });
            } else {
              // Fallback para o marcador tradicional se a biblioteca de marcadores não estiver disponível
              console.warn('A biblioteca de marcadores avançados não está disponível, usando marcador tradicional');
              new window.google.maps.Marker({
                map,
                position: results[0].geometry.location,
                title: 'ALNPP Advocacia'
              });
            }
          } catch (error) {
            console.error('Erro ao criar marcador avançado:', error);
            // Fallback para o marcador tradicional em caso de erro
            new window.google.maps.Marker({
              map,
              position: results[0].geometry.location,
              title: 'ALNPP Advocacia'
            });
          }
        } else {
          console.error('Geocode falhou:', status);
        }
      });
    };

    // Carregar o script da API do Google Maps seguindo as boas práticas
    const script = document.createElement('script');
    // Adicionando a biblioteca de marcadores conforme a documentação oficial
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap&loading=async&v=weekly&libraries=marker`;
    script.async = true;
    script.defer = true;
    
    // Definir a função de callback global
    window.initGoogleMap = initMap;
    
    // Adicionar o script ao documento
    document.head.appendChild(script);
    isScriptLoaded.current = true;
    
    // Cleanup
    return () => {
      // Remover a função de callback global
      if (window.initGoogleMap) {
        // @ts-ignore - Necessário para evitar erro de tipagem
        window.initGoogleMap = undefined;
      }
      // Remover o script se necessário
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [address, apiKey]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full min-h-[400px] rounded-lg shadow-md"
      aria-label="Mapa mostrando a localização do escritório ALNPP Advocacia"
    />
  );
}

// Adicionar a definição do tipo global para a função de callback
declare global {
  interface Window {
    initGoogleMap: (() => void) | undefined;
    google: any;
  }
}
