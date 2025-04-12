import { createClient } from '@supabase/supabase-js';

// Lê as variáveis de ambiente do servidor
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Valida se as variáveis foram carregadas
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is missing in environment variables.');
}

// Cria e exporta o cliente Supabase para uso server-side
// Especifica o schema 'alnpp' nas opções
export const supabaseServerClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  db: {
    schema: 'alnpp', // Define o schema padrão para as operações
  },
  auth: {
    // Desabilita autoRefreshToken e persistSession, pois gerenciaremos a sessão manualmente
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false, // Não precisamos detectar sessão na URL
  },
});

// Nota: Este cliente usa a chave de serviço e NUNCA deve ser exposto no lado do cliente (browser).
