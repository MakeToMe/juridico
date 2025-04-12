'use client'; // Indica que este é um Client Component

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className = '' }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Logout bem-sucedido, redirecionar para a página de login
        router.push('/login');
        // Forçar um refresh completo para limpar qualquer estado do cliente
        router.refresh();
      } else {
        console.error('Falha ao fazer logout');
        // Mesmo em caso de erro, tentamos redirecionar para login
        router.push('/login');
      }
    } catch (error) {
      console.error('Erro ao tentar fazer logout:', error);
      // Mesmo em caso de erro, tentamos redirecionar para login
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${className}`}
      style={{ backgroundColor: '#dc2626', color: 'white' }}
    >
      {loading ? 'Saindo...' : 'Sair'}
    </button>
  );
}
