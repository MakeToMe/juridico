import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'API de teste funcionando!' });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Dados recebidos com sucesso!',
      data: body
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Erro ao processar requisição: ${error.message}` },
      { status: 500 }
    );
  }
}
