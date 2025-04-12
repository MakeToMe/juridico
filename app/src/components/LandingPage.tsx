'use client';

import { useState } from 'react';
import Image from 'next/image';
import LoginModal from './LoginModal';

export default function LandingPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-10">
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
              <a href="#escritorio" className="text-white hover:text-gray-300 font-medium transition duration-300">
                O escritório
              </a>
              <a href="#clientes" className="text-white hover:text-gray-300 font-medium transition duration-300">
                Principais Clientes
              </a>
              <a href="#especialidades" className="text-white hover:text-gray-300 font-medium transition duration-300">
                Especialidades
              </a>
              <button 
                onClick={openLoginModal}
                className="bg-white text-blue-900 hover:bg-blue-100 px-4 py-2 rounded-md font-medium transition duration-300"
              >
                Área de Membros
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button className="text-white focus:outline-none">
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
        {/* Hero Image */}
        <div className="absolute inset-0 w-full h-full">
          <img 
            src="https://studio.rardevops.com/storage/v1/object/public/mtm/alnpp-hori.avif" 
            alt="Hero Background" 
            className="w-full h-full object-cover"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center px-6">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              ALNPP Advocacia
            </h1>
            <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto">
              Excelência jurídica e atendimento personalizado para seus processos
            </p>
            <button 
              onClick={openLoginModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-medium text-lg transition duration-300"
            >
              Acessar Área de Membros
            </button>
          </div>
        </div>
      </div>

      {/* Sections (placeholders) */}
      <section id="escritorio" className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">O Escritório</h2>
          <div className="max-w-4xl mx-auto">
            <p className="text-gray-700 mb-6">
              Fundado em 2010, o ALNPP Advocacia se destaca pela excelência no atendimento jurídico personalizado, 
              combinando experiência, conhecimento técnico e compromisso com os interesses de nossos clientes.
            </p>
            <p className="text-gray-700">
              Nossa equipe de advogados especializados trabalha com dedicação para oferecer soluções jurídicas 
              eficientes e estratégicas, sempre com foco na qualidade e na ética profissional.
            </p>
          </div>
        </div>
      </section>

      <section id="clientes" className="py-16 bg-gray-100">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Principais Clientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Cliente cards (placeholders) */}
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-white p-6 rounded-lg shadow-md">
                <div className="h-16 w-16 bg-gray-200 rounded-full mb-4 mx-auto"></div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">Cliente {item}</h3>
                <p className="text-gray-600 text-center">
                  Descrição do cliente e dos serviços prestados pelo escritório.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="especialidades" className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Especialidades</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Especialidades (placeholders) */}
            {['Direito Civil', 'Direito Empresarial', 'Direito Trabalhista', 'Direito Tributário', 'Direito Contratual', 'Direito Digital'].map((item) => (
              <div key={item} className="bg-gray-100 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item}</h3>
                <p className="text-gray-600">
                  Descrição da especialidade e como o escritório pode ajudar nesta área.
                </p>
              </div>
            ))}
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
      <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} />
    </div>
  );
}
