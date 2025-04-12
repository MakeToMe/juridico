import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(req: NextRequest) {
  try {
    // 1. Obter o token do cookie diretamente da requisição
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
      
      // 3. Retornar os dados do usuário
      return NextResponse.json({
        uid: payload.uid,
        email: payload.email,
        nome: payload.nome,
        role: payload.role,
        perfil: payload.perfil // Retornar o valor real do perfil do usuário
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
