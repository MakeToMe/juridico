import { supabaseServerClient } from './supabase/server';

/**
 * Busca os dados completos do usuário no Supabase pelo email
 * @param email Email do usuário
 * @returns Dados do usuário ou null se não encontrado
 */
export async function getUserProfileByEmail(email: string) {
  try {
    const { data, error } = await supabaseServerClient
      .from('usuarios')
      .select('uid, email, nome, role, perfil')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao processar busca de perfil:', error);
    return null;
  }
}

/**
 * Atualiza o perfil do usuário no Supabase
 * @param uid ID do usuário
 * @param perfil URL da imagem de perfil
 * @returns Dados atualizados ou null se falhar
 */
export async function updateUserProfile(uid: string, perfil: string) {
  try {
    const { data, error } = await supabaseServerClient
      .from('usuarios')
      .update({ perfil })
      .eq('uid', uid)
      .select('uid, email, nome, role, perfil');

    if (error) {
      console.error('Erro ao atualizar perfil do usuário:', error);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Erro ao processar atualização de perfil:', error);
    return null;
  }
}
