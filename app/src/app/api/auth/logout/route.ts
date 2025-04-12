import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Criar uma resposta
    const response = NextResponse.json({ message: 'Logout realizado com sucesso!' });

    // Remover o cookie auth_token
    response.cookies.delete('auth_token');

    // Retornar a resposta
    return response;
  } catch (error) {
    console.error('Erro ao realizar logout:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
