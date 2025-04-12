import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'; // Import necessário para ler cookies, mas não para setar na resposta

const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables.');
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    // 1. Buscar usuário pelo email no Supabase (schema 'alnpp')
    const { data: user, error: dbError } = await supabaseServerClient
      .from('usuarios') // Tabela 'usuarios' dentro do schema 'alnpp'
      .select('uid, email, nome, senha, role, perfil') // Seleciona os campos necessários, incluindo perfil
      .eq('email', email)
      .single(); // Espera encontrar no máximo um usuário

    if (dbError || !user) {
      console.error('Erro ao buscar usuário ou usuário não encontrado:', dbError);
      return NextResponse.json(
        { error: 'Credenciais inválidas.' }, // Mensagem genérica por segurança
        { status: 401 }
      );
    }

    // 2. Verificar a senha
    if (!user.senha) {
      console.error('Senha armazenada está vazia ou nula para o usuário:', email);
      return NextResponse.json(
        { error: 'Erro interno ao processar login.' },
        { status: 500 }
      );
    }
    
    // Verificar se a senha está no formato esperado para descriptografia
    const isEncrypted = user.senha.includes(':');
    
    // Comparação de senha
    let passwordMatches = false;
    
    if (isEncrypted) {
      // Tentar descriptografar se estiver no formato correto
      try {
        const storedPasswordDecrypted = decrypt(user.senha);
        passwordMatches = storedPasswordDecrypted === password;
        console.log('Verificação de senha criptografada para:', email);
      } catch (decryptError) {
        console.error(`Erro ao descriptografar senha para o usuário ${email}:`, decryptError);
        return NextResponse.json(
          { error: 'Erro interno ao processar login.' },
          { status: 500 }
        );
      }
    } else {
      // Comparação direta se não estiver criptografada
      passwordMatches = user.senha === password;
      console.log('Verificação de senha em texto puro para:', email);
    }
    
    // Verificar se a senha está correta
    if (!passwordMatches) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    // 4. Gerar o JWT (Garantir que JWT_SECRET é string aqui)
    if (!JWT_SECRET) {
      // Esta verificação é redundante devido à verificação no topo do arquivo,
      // mas satisfaz o type checker dentro deste escopo.
      console.error('JWT_SECRET is missing!');
      return NextResponse.json({ error: 'Erro interno de configuração.' }, { status: 500 });
    }
    const payload = {
      uid: user.uid,
      email: user.email,
      nome: user.nome,
      role: user.role,
      perfil: user.perfil || null,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '1d', // Token expira em 1 dia (ajuste conforme necessário)
    });

    // 5. Criar a resposta e definir o cookie HTTP-only nela
    const response = NextResponse.json({ message: 'Login bem-sucedido!' });

    response.cookies.set('auth_token', token, {
      httpOnly: true, // Impede acesso via JavaScript no cliente
      secure: NODE_ENV === 'production', // Usar secure apenas em produção (HTTPS)
      path: '/', // Cookie disponível em todo o site
      maxAge: 60 * 60 * 24, // 1 dia em segundos
      sameSite: 'lax', // Proteção contra CSRF
    });

    // 6. Retornar a resposta com o cookie definido
    return response;

  } catch (error) {
    console.error('Erro inesperado na API de login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
