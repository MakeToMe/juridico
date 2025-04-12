import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabase/server';
import { jwtVerify } from 'jose';

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const token = req.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 2. Verificar o token JWT
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET não está definido nas variáveis de ambiente');
      return NextResponse.json(
        { error: 'Erro de configuração do servidor' },
        { status: 500 }
      );
    }

    try {
      // Verificar o token
      const secretBuffer = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secretBuffer);
      
      // 3. Obter os dados enviados na requisição
      const { perfil } = await req.json();
      
      if (!perfil) {
        return NextResponse.json(
          { error: 'URL do perfil é obrigatória' },
          { status: 400 }
        );
      }

      // 4. Atualizar o perfil do usuário no Supabase
      const { data, error } = await supabaseServerClient
        .from('usuarios')
        .update({ perfil })
        .eq('uid', payload.uid)
        .select('uid, email, nome, role, perfil');

      if (error) {
        console.error('Erro ao atualizar perfil:', error);
        return NextResponse.json(
          { error: 'Erro ao atualizar perfil' },
          { status: 500 }
        );
      }

      // 5. Retornar os dados atualizados
      return NextResponse.json({
        message: 'Perfil atualizado com sucesso',
        user: data[0]
      });
    } catch (jwtError) {
      console.error('Erro ao verificar token JWT:', jwtError);
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
