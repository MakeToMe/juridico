'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface User {
  uid: string;
  email: string;
  nome: string;
  role: string;
  perfil?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Função para buscar os dados do usuário
    async function fetchUserData() {
      try {
        // Primeiro, buscar dados básicos do usuário do token JWT
        const response = await fetch('/api/auth/user', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('Dados do usuário do token:', userData);
          setUser(userData);
          
          // Agora, buscar dados atualizados diretamente do Supabase
          if (userData.email) {
            try {
              const supabaseResponse = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  // Se já tiver um perfil, manté-lo; caso contrário, usar um valor padrão
                  perfil: userData.perfil || ''
                }),
              });
              
              if (supabaseResponse.ok) {
                const updatedData = await supabaseResponse.json();
                console.log('Dados atualizados do Supabase:', updatedData);
                if (updatedData.user) {
                  setUser(prevUser => ({
                    ...prevUser!,
                    ...updatedData.user
                  }));
                }
              }
            } catch (supabaseError) {
              console.error('Erro ao buscar dados atualizados do usuário:', supabaseError);
            }
          }
        } else {
          // Se não estiver autenticado, redireciona para login
          router.push('/login');
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-dark-secondary">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Carregando...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto border-gray-900 dark:border-white"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Não renderiza nada, pois o redirecionamento já foi iniciado
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Seção de boas-vindas */}
        <div className="bg-white dark:bg-dark-primary shadow-md rounded-lg p-6 transition-colors duration-200">
          <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Bem-vindo, {user.nome}!</h1>
          <p className="mb-6 text-gray-700 dark:text-gray-300">Este é o seu painel de controle para gerenciar consultas processuais e acompanhar seus processos.</p>
        </div>

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-dark-primary shadow-md rounded-lg p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mr-4 transition-colors duration-200">
                <svg className="w-6 h-6 text-blue-500 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors duration-200">Processos</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-200">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-primary shadow-md rounded-lg p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 mr-4 transition-colors duration-200">
                <svg className="w-6 h-6 text-green-500 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors duration-200">Concluídos</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-200">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-primary shadow-md rounded-lg p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900 mr-4 transition-colors duration-200">
                <svg className="w-6 h-6 text-yellow-500 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors duration-200">Pendentes</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-200">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-dark-primary shadow-md rounded-lg p-6 transition-colors duration-200">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900 mr-4 transition-colors duration-200">
                <svg className="w-6 h-6 text-red-500 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <div>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors duration-200">Alertas</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-200">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="bg-white dark:bg-dark-primary shadow-md rounded-lg p-6 transition-colors duration-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white transition-colors duration-200">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/dashboard/consulta')}
              className="flex items-center p-4 bg-gray-50 dark:bg-dark-accent rounded-lg hover:bg-gray-100 dark:hover:bg-dark-secondary transition-colors duration-200"
            >
              <div className="p-3 rounded-full mr-4 bg-opacity-10 bg-alnpp dark:bg-opacity-30 transition-colors duration-200">
                <svg className="w-6 h-6 text-alnpp dark:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-800 dark:text-white transition-colors duration-200">Nova Consulta</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200">Consultar um novo processo</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/dashboard/processos')}
              className="flex items-center p-4 bg-gray-50 dark:bg-dark-accent rounded-lg hover:bg-gray-100 dark:hover:bg-dark-secondary transition-colors duration-200"
            >
              <div className="p-3 rounded-full mr-4 bg-opacity-10 bg-alnpp dark:bg-opacity-30 transition-colors duration-200">
                <svg className="w-6 h-6 text-alnpp dark:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-800 dark:text-white transition-colors duration-200">Meus Processos</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200">Ver processos salvos</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/dashboard/relatorios')}
              className="flex items-center p-4 bg-gray-50 dark:bg-dark-accent rounded-lg hover:bg-gray-100 dark:hover:bg-dark-secondary transition-colors duration-200"
            >
              <div className="p-3 rounded-full mr-4 bg-opacity-10 bg-alnpp dark:bg-opacity-30 transition-colors duration-200">
                <svg className="w-6 h-6 text-alnpp dark:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-800 dark:text-white transition-colors duration-200">Relatórios</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200">Gerar relatórios</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
