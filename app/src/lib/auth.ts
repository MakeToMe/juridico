import { cookies } from 'next/headers';
import { jwtVerify, JWTPayload } from 'jose';

// Interface para o payload do usuário no JWT
export interface UserPayload {
  uid: string;
  email: string;
  nome: string;
  role: string;
  iat?: number; // Issued at (quando o token foi emitido)
  exp?: number; // Expiration time (quando o token expira)
}

/**
 * Obtém o usuário atual a partir do token JWT no cookie
 * @returns O payload do usuário ou null se não estiver autenticado
 */
export async function getCurrentUser(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error('JWT_SECRET não está definido nas variáveis de ambiente');
    return null;
  }

  try {
    const secretBuffer = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretBuffer);
    
    // Verificar se o payload contém as propriedades necessárias
    const userPayload = payload as JWTPayload;
    if (
      typeof userPayload.uid === 'string' &&
      typeof userPayload.email === 'string' &&
      typeof userPayload.nome === 'string' &&
      typeof userPayload.role === 'string'
    ) {
      return userPayload as unknown as UserPayload;
    }
    
    console.error('Payload JWT não contém as propriedades esperadas');
    return null;
  } catch (error) {
    console.error('Erro ao verificar token JWT:', error);
    return null;
  }
}
