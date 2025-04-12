import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // Usando 'jose' que é mais adequado para Edge Runtime

const JWT_SECRET = process.env.JWT_SECRET;

// Função auxiliar para verificar o JWT usando 'jose'
async function verifyToken(token: string, secret: string): Promise<any> {
  try {
    const secretBuffer = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretBuffer, {
      // Especificar algoritmos esperados se necessário, ex: ['HS256']
    });
    return payload;
  } catch (error) {
    console.error('JWT Verification failed:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Obter o token do cookie
  const token = request.cookies.get('auth_token')?.value;

  // 2. Definir rotas públicas (não precisam de autenticação)
  const publicPaths = ['/', '/login', '/api/auth/login', '/api/auth/logout']; // Adicionamos a página inicial como pública

  // Permitir acesso a rotas públicas sempre
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // 3. Verificar o token para rotas protegidas
  if (!token) {
    // Se não há token e a rota não é pública, redireciona para a página inicial
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  // Verificar se JWT_SECRET está definido
  if (!JWT_SECRET) {
     console.error("JWT_SECRET is not defined in middleware!");
     // Lidar com erro de configuração - talvez redirecionar para uma página de erro?
     // Por enquanto, redireciona para login como fallback seguro.
     const loginUrl = new URL('/login', request.url);
     return NextResponse.redirect(loginUrl);
  }

  // 4. Validar o token JWT
  const payload = await verifyToken(token, JWT_SECRET);

  if (!payload) {
    // Se o token é inválido (expirado, assinatura errada), redireciona para login
    // Opcional: remover o cookie inválido aqui
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token'); // Remove cookie inválido
    return response;
  }

  // 5. Se o token é válido, permite o acesso à rota solicitada
  // Opcional: Adicionar dados do usuário ao cabeçalho da requisição para uso em Server Components
  // const requestHeaders = new Headers(request.headers);
  // requestHeaders.set('x-user-payload', JSON.stringify(payload));
  // return NextResponse.next({ request: { headers: requestHeaders } });

  return NextResponse.next();
}

// 6. Configurar o matcher para definir quais rotas o middleware deve rodar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/login (API login route) - já coberto pela lógica de publicPaths
     * - api/auth/logout (API logout route) - já coberto pela lógica de publicPaths
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth/login|api/auth/logout|_next/static|_next/image|favicon.ico).*)',
  ],
};
