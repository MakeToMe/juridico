'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Evitar problemas de hidratação
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // Login bem-sucedido, redirecionar para a página de dashboard
        router.push('/dashboard');
        router.refresh(); // Forçar refresh para atualizar o estado de autenticação
        onClose(); // Fechar o modal
      } else {
        // Tratar erro de login
        const data = await response.json();
        setError(data.error || 'Falha no login. Verifique suas credenciais.');
      }
    } catch (err) {
      console.error('Erro ao tentar fazer login:', err);
      setError('Ocorreu um erro ao tentar fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Se o modal não estiver aberto, não renderiza nada
  if (!isOpen || !mounted) return null;

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay com blur */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-all duration-300 ease-in-out"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md overflow-hidden rounded-lg bg-white p-6 shadow-lg transition-all duration-300 ease-in-out"
          onClick={(e) => e.stopPropagation()} // Previne que cliques no modal fechem ele
        >
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img 
              src="https://studio.rardevops.com/storage/v1/object/public/mtm/logo-alnpp%20(1).png"
              alt="Logo ALNPP Advocacia"
              className="w-20 h-20 object-contain"
            />
          </div>
          
          {/* Título principal */}
          <div className="mb-2 text-center">
            <h2 className="text-xl font-bold" style={{ color: '#1F3626' }}>
              ALNPP Advocacia
            </h2>
          </div>
          
          {/* Subtítulo */}
          <div className="mb-2 text-center">
            <p className="text-sm font-medium" style={{ color: '#1F3626' }}>
              Acesso do Membro
            </p>
          </div>
          
          {/* Texto explicativo */}
          <div className="mb-6 text-center">
            <p className="text-xs" style={{ color: '#374151' }}>
              Digite suas credenciais para acessar seus dados
            </p>
          </div>
          
          {/* Formulário de login */}
          <form onSubmit={handleSubmit}>
            {/* Campo de email */}
            <div className="mb-4">
              <div className="mb-2">
                <span className="text-sm font-medium" style={{ color: '#1F3626' }}>Login</span>
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border-0 px-3 py-3 bg-gray-800 text-white placeholder-gray-400 shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-600"
                placeholder="admin@adlibertas.com"
              />
            </div>

            {/* Campo de senha */}
            <div className="mb-4">
              <div className="mb-2">
                <span className="text-sm font-medium" style={{ color: '#1F3626' }}>Senha</span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-0 px-3 py-3 bg-gray-800 text-white placeholder-gray-400 shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-600 pr-10"
                  placeholder="**************"
                />
                <button 
                  type="button" 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400" 
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Botão de login */}
            <div className="mb-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-[#1F3626] px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#2a4a35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F3626]"
              >
                {loading ? 'Acessando...' : 'Acessar'}
              </button>
            </div>
          </form>
          
          {/* Linha separadora */}
          <div className="border-t border-gray-200 my-4"></div>
          
          {/* Rodapé */}
          <div className="text-center">
            <span className="text-xs" style={{ color: '#1F3626' }}>
              {new Date().getFullYear()} ALNPP Advocacia - Todos os direitos reservados
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
