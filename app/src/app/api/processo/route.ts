import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Configuração do Supabase com a chave de serviço
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Criar cliente Supabase com a chave de serviço (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'alnpp' }
});

export async function POST(request: Request) {
  try {
    // Extrair dados do corpo da requisição
    const { dadosProcesso, movimentacoes } = await request.json();

    if (!dadosProcesso || !dadosProcesso.numeroProcesso) {
      return NextResponse.json(
        { error: 'Dados do processo inválidos ou incompletos' },
        { status: 400 }
      );
    }

    // Verificar se o processo já existe
    const { data: processoExistente, error: erroConsulta } = await supabase
      .from('processos')
      .select('uid')
      .eq('processo', dadosProcesso.numeroProcesso)
      .single();

    let processoUid;

    if (erroConsulta && erroConsulta.code !== 'PGRST116') {
      console.error('Erro ao consultar processo:', erroConsulta);
      return NextResponse.json(
        { error: `Erro ao consultar processo: ${erroConsulta.message}` },
        { status: 500 }
      );
    }

    if (processoExistente) {
      console.log(`Processo ${dadosProcesso.numeroProcesso} já existe no banco de dados.`);
      processoUid = processoExistente.uid;

      // Atualizar o processo existente
      const { error: erroAtualizacao } = await supabase
        .from('processos')
        .update({
          classe: dadosProcesso.classeProcesso,
          assunto: dadosProcesso.assuntoProcesso,
          juiz: dadosProcesso.juiz
        })
        .eq('uid', processoUid);

      if (erroAtualizacao) {
        console.error('Erro ao atualizar processo:', erroAtualizacao);
        return NextResponse.json(
          { error: `Erro ao atualizar processo: ${erroAtualizacao.message}` },
          { status: 500 }
        );
      }
    } else {
      console.log(`Inserindo novo processo ${dadosProcesso.numeroProcesso}...`);

      // Extrair advogados do autor
      const advogadosAutor = dadosProcesso.partes
        .filter((p: any) => p.tipo.includes('Autor'))
        .flatMap((p: any) => p.advogados);

      // Extrair nomes dos autores
      const autores = dadosProcesso.partes
        .filter((p: any) => p.tipo.includes('Autor'))
        .map((p: any) => p.nome);

      // Inserir novo processo
      const { data: novoProcesso, error: erroInsercao } = await supabase
        .from('processos')
        .insert({
          tribunal: 'TJAL',
          processo: dadosProcesso.numeroProcesso,
          classe: dadosProcesso.classeProcesso,
          assunto: dadosProcesso.assuntoProcesso,
          juiz: dadosProcesso.juiz,
          autor: autores,
          adv_autor: advogadosAutor,
          empresa: dadosProcesso.empresaUid
        })
        .select();

      if (erroInsercao) {
        console.error('Erro ao inserir processo:', erroInsercao);
        return NextResponse.json(
          { error: `Erro ao inserir processo: ${erroInsercao.message}` },
          { status: 500 }
        );
      }

      if (!novoProcesso || novoProcesso.length === 0) {
        console.error('Erro: Não foi possível obter o UID do processo inserido');
        return NextResponse.json(
          { error: 'Não foi possível obter o UID do processo inserido' },
          { status: 500 }
        );
      }

      processoUid = novoProcesso[0].uid;
      console.log(`Processo inserido com sucesso! UID: ${processoUid}`);
    }

    // Inserir as movimentações na tabela movimentacoes
    if (movimentacoes && movimentacoes.length > 0) {
      // Filtrar apenas movimentações com descrição
      const movimentacoesComDescricao = movimentacoes.filter((mov: any) => mov.descricao);

      if (movimentacoesComDescricao.length > 0) {
        console.log(`Inserindo ${movimentacoesComDescricao.length} movimentações...`);

        // Obter movimentações existentes para evitar duplicatas
        const { data: movimentacoesExistentes, error: erroConsultaMovs } = await supabase
          .from('movimentacoes')
          .select('data, movimentacao')
          .eq('processo_uid', processoUid);

        if (erroConsultaMovs) {
          console.error('Erro ao consultar movimentações existentes:', erroConsultaMovs);
          return NextResponse.json(
            { error: `Erro ao consultar movimentações existentes: ${erroConsultaMovs.message}` },
            { status: 500 }
          );
        }

        // Criar um conjunto para verificar duplicatas
        const movimentacoesExistentesSet = new Set();
        if (movimentacoesExistentes) {
          movimentacoesExistentes.forEach((mov: any) => {
            const dataFormatada = mov.data ? new Date(mov.data).toISOString().split('T')[0] : '';
            const chave = `${dataFormatada}|${mov.movimentacao}`;
            movimentacoesExistentesSet.add(chave);
          });
        }

        // Preparar movimentações para inserção, evitando duplicatas
        const movimentacoesParaInserir = [];

        for (const mov of movimentacoesComDescricao) {
          if (!mov.data || !mov.descricao) continue;

          // Converter data de DD/MM/AAAA para AAAA-MM-DD
          const partesData = mov.data.split('/');
          const dataFormatada = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;

          // Verificar se já existe
          const chave = `${dataFormatada}|${mov.descricao}`;
          if (movimentacoesExistentesSet.has(chave)) {
            console.log(`Movimentação já existe: ${mov.data} - ${mov.descricao}`);
            continue;
          }

          movimentacoesParaInserir.push({
            processo_uid: processoUid,
            data: dataFormatada,
            movimentacao: mov.descricao,
            empresa: dadosProcesso.empresaUid
          });
        }

        if (movimentacoesParaInserir.length > 0) {
          const { data: movs, error: erroInsercaoMovs } = await supabase
            .from('movimentacoes')
            .insert(movimentacoesParaInserir);

          if (erroInsercaoMovs) {
            console.error('Erro ao inserir movimentações:', erroInsercaoMovs);
            return NextResponse.json(
              { error: `Erro ao inserir movimentações: ${erroInsercaoMovs.message}` },
              { status: 500 }
            );
          }

          console.log(`${movimentacoesParaInserir.length} movimentações inseridas com sucesso!`);
        } else {
          console.log('Nenhuma movimentação nova para inserir.');
        }
      } else {
        console.log('Nenhuma movimentação com descrição para salvar.');
      }
    } else {
      console.log('Nenhuma movimentação para salvar.');
    }

    return NextResponse.json({
      success: true,
      message: 'Dados salvos com sucesso',
      processoUid
    });
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: `Erro ao processar requisição: ${error.message}` },
      { status: 500 }
    );
  }
}
