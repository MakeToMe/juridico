'use client';

import { useState, useEffect } from 'react';
import LoginModal from '@/components/LoginModal';
import HeroSlider from '@/components/HeroSlider';
import LogoSlider from '@/components/LogoSlider';
import GoogleMap from '@/components/GoogleMap';
import SpecialtyCard from '@/components/SpecialtyCard';
import SpecialtyChart from '@/components/SpecialtyChart';
import './styles/hero.css';

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Estado para controlar o modal de login
  
  // Estado para controlar o modal de login

  // Detectar scroll para aplicar efeito na navbar
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const openLoginModal = () => {
    console.log('Abrindo modal de login');
    setIsLoginModalOpen(true);
  };
  
  const closeLoginModal = () => setIsLoginModalOpen(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/20 backdrop-blur-sm shadow-md' : 'bg-transparent'}`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="https://studio.rardevops.com/storage/v1/object/public/mtm/logo-alnpp.png" 
                alt="ALNPP Logo" 
                className="h-12 w-auto"
              />
            </div>

            {/* Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#escritorio" style={{color: 'white', textDecoration: 'none'}} className="hover:text-gray-300 font-medium transition duration-300">
                O escritório
              </a>
              <a href="#clientes" style={{color: 'white', textDecoration: 'none'}} className="hover:text-gray-300 font-medium transition duration-300">
                Principais Clientes
              </a>
              <a href="#especialidades" style={{color: 'white', textDecoration: 'none'}} className="hover:text-gray-300 font-medium transition duration-300">
                Especialidades
              </a>
              <button 
                onClick={openLoginModal}
                style={{backgroundColor: 'rgba(255, 255, 255, 0.25)', color: 'white'}} 
                className="hover:bg-white/40 px-4 py-2 rounded-md font-normal transition duration-300 shadow-md border border-white/30"
              >
                Área de Membros
              </button>
            </div>

            {/* Mobile menu button e botão de login */}
            <div className="md:hidden flex items-center space-x-4">
              <button 
                onClick={openLoginModal}
                style={{backgroundColor: 'rgba(255, 255, 255, 0.25)', color: 'white'}}
                className="hover:bg-white/40 px-3 py-1 rounded-md text-sm font-normal transition duration-300 shadow-md border border-white/30"
              >
                Área de Membros
              </button>
              <button style={{color: 'white'}} className="focus:outline-none">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative w-full h-screen">
        {/* Hero Slider */}
        <HeroSlider 
          images={[
            { url: 'https://studio.rardevops.com/storage/v1/object/public/mtm/alnpp-hori.avif', alt: 'ALNPP Advocacia' },
            { url: 'https://studio.rardevops.com/storage/v1/object/public/mtm/alnpp1.avif', alt: 'ALNPP Advocacia 1' },
            { url: 'https://studio.rardevops.com/storage/v1/object/public/mtm/alnpp2.avif', alt: 'ALNPP Advocacia 2' },
            { url: 'https://studio.rardevops.com/storage/v1/object/public/mtm/alnpp3.avif', alt: 'ALNPP Advocacia 3' }
          ]}
        />

        {/* Hero Content */}
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center px-6">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              ALNPP Advocacia
            </h1>
            <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto">
              Excelência jurídica e atendimento personalizado para seus processos
            </p>
          </div>
        </div>
      </div>

      {/* Sections (placeholders) */}
      <section id="escritorio" className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8 text-center" style={{ color: '#1F3626' }}>O Escritório</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-6xl mx-auto">
            {/* Coluna de texto */}
            <div>
              <p className="mb-6" style={{ color: '#374151' }}>
                Fundado em 2010, o ALNPP Advocacia se destaca pela excelência no atendimento jurídico personalizado, 
                combinando experiência, conhecimento técnico e compromisso com os interesses de nossos clientes.
              </p>
              <p className="mb-6" style={{ color: '#374151' }}>
                Nossa equipe de advogados especializados trabalha com dedicação para oferecer soluções jurídicas 
                eficientes e estratégicas, sempre com foco na qualidade e na ética profissional.
              </p>
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-2" style={{ color: '#1F3626' }}>Endereço</h3>
                <p style={{ color: '#374151' }}>
                  Av. Gov. Osman Loureiro, 137 - Mangabeiras<br />
                  Maceió - AL, 57037-630<br />
                  <span className="mt-2 block">Telefone: (82) 3333-4444</span>
                </p>
              </div>
            </div>
            
            {/* Mapa */}
            <div className="h-96 md:h-auto">
              <GoogleMap 
                address="Av. Gov. Osman Loureiro, 137 - Mangabeiras, Maceió - AL, 57037-630" 
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} 
              />
            </div>
          </div>
        </div>
      </section>

      <section id="clientes" className="py-16 bg-gray-100">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-8 text-center" style={{ color: '#1F3626' }}>Principais Clientes</h2>
          <p className="text-center mb-10 max-w-3xl mx-auto" style={{ color: '#374151' }}>
            Temos orgulho de atender empresas de diversos setores, oferecendo soluções jurídicas personalizadas para cada necessidade.
          </p>
          
          {/* Logo Slider */}
          <div className="py-8">
            <LogoSlider 
              logos={[
                { url: 'https://studio.rardevops.com/storage/v1/object/public/mtm/logo-braskem.png', alt: 'Braskem' },
                { url: 'https://studio.rardevops.com/storage/v1/object/public/mtm/logo-casal.png', alt: 'Casal' },
                { url: 'https://studio.rardevops.com/storage/v1/object/public/mtm/logo-copra.png', alt: 'Copra' },
                { url: 'https://studio.rardevops.com/storage/v1/object/public/mtm/logo-equatorial.png', alt: 'Equatorial' },
                { url: 'https://studio.rardevops.com/storage/v1/object/public/mtm/logo-oi.png', alt: 'Oi' },
                { url: 'https://studio.rardevops.com/storage/v1/object/public/mtm/logo-sao-francisco.png', alt: 'São Francisco' },
                { url: 'https://studio.rardevops.com/storage/v1/object/public/mtm/logo-unicompra.png', alt: 'Unicompra' }
              ]}
            />
          </div>
        </div>
      </section>

      <section id="especialidades" className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center" style={{ color: '#1F3626' }}>Nossas Especialidades</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Gráfico de especialidades */}
            <div className="bg-white p-6 rounded-lg shadow-md h-[450px] flex items-center justify-center">
              <SpecialtyChart 
                data={[
                  { label: 'Direito Trabalhista', percentage: 40, color: '#1F3626' },
                  { label: 'Direito do Consumidor', percentage: 50, color: '#4A7862' },
                  { label: 'Direito Civil', percentage: 10, color: '#8FB3A5' }
                ]}
              />
            </div>
            
            {/* Cards de especialidades */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SpecialtyCard 
                title="Direito Trabalhista"
                description="Especialistas em resolver questões trabalhistas, defendendo os direitos dos trabalhadores e orientando empresas."
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>}
              />
              
              <SpecialtyCard 
                title="Direito do Consumidor"
                description="Proteção aos direitos do consumidor, atuando em casos de produtos defeituosos e cobranças indevidas."
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>}
              />
              
              <SpecialtyCard 
                title="Direito Civil"
                description="Assessoria jurídica em questões de contratos, responsabilidade civil, direito imobiliário e família."
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>}
              />
              
              <SpecialtyCard 
                title="Mais de 10 mil processos"
                description="Experiência comprovada com mais de 10 mil processos atendidos com excelência e comprometimento."
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <img 
                src="https://studio.rardevops.com/storage/v1/object/public/mtm/logo-alnpp.png" 
                alt="ALNPP Logo" 
                className="h-10 w-auto mb-4 brightness-200"
              />
              <p className="text-gray-400">
                Excelência jurídica desde 2010
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="text-lg font-semibold mb-4">Contato</h4>
                <p className="text-gray-400 mb-2">contato@alnpp.com.br</p>
                <p className="text-gray-400">+55 (11) 3456-7890</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Endereço</h4>
                <p className="text-gray-400">
                  Av. Paulista, 1000<br />
                  São Paulo - SP<br />
                  CEP 01310-100
                </p>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-4">Redes Sociais</h4>
                <div className="flex space-x-4">
                  <a href="#" className="text-gray-400 hover:text-white transition duration-300">
                    <span className="sr-only">Facebook</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition duration-300">
                    <span className="sr-only">Instagram</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition duration-300">
                    <span className="sr-only">LinkedIn</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} ALNPP Advocacia. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
      )}
    </div>
  );
}
