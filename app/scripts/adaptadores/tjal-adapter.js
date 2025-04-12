const TribunalAdapter = require('./adapter-interface');

/**
 * Adaptador específico para o Tribunal de Justiça de Alagoas (TJAL)
 */
class TJALAdapter extends TribunalAdapter {
  getNomeTribunal() {
    return 'TJAL';
  }
  
  extrairNumeroProcesso(jsonTJAL) {
    return jsonTJAL.processo.numero;
  }
  
  /**
   * Limpa e remove duplicatas de um array de advogados
   * @param {Array} advogados - Array de advogados
   * @returns {Array} Array de advogados limpo e sem duplicatas
   */
  limparAdvogados(advogados) {
    if (!advogados || !Array.isArray(advogados)) return [];
    
    // Limpar cada advogado
    const advogadosLimpos = advogados.map(adv => {
      return adv.replace(/\t+/g, '')
               .replace(/\n+/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
    });
    
    // Remover duplicatas (case insensitive)
    const advogadosUnicos = [];
    const advogadosSet = new Set();
    
    for (const adv of advogadosLimpos) {
      const advLowerCase = adv.toLowerCase();
      if (adv && !advogadosSet.has(advLowerCase)) {
        advogadosSet.add(advLowerCase);
        advogadosUnicos.push(adv);
      }
    }
    
    return advogadosUnicos;
  }
  
  converterParaFormatoPadrao(jsonTJAL) {
    // Extrair e limpar autores
    const autores = jsonTJAL.partes.autores.map(a => ({
      nome: a.nome.replace(/\t+/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim(),
      tipo: a.tipo,
      advogados: this.limparAdvogados(a.advogados)
    }));
    
    // Extrair e limpar réus
    const reus = jsonTJAL.partes.reus.map(r => ({
      nome: r.nome.replace(/\t+/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim(),
      tipo: r.tipo,
      advogados: this.limparAdvogados(r.advogados)
    }));
    
    // Extrair outros participantes, se existirem
    const outros = jsonTJAL.partes.outros ? jsonTJAL.partes.outros.map(o => ({
      nome: o.nome.replace(/\t+/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim(),
      tipo: o.tipo,
      advogados: this.limparAdvogados(o.advogados)
    })) : [];
    
    // Extrair nomes de autores e advogados para o formato da tabela processos
    const nomesAutores = autores.map(a => a.nome);
    
    // Flatten e remover duplicatas dos advogados dos autores
    const advogadosAutores = this.limparAdvogados(
      autores.flatMap(a => a.advogados)
    );
    
    // Converter para o formato padronizado
    return {
      tribunal: this.getNomeTribunal(),
      numeroProcesso: jsonTJAL.processo.numero,
      comarca: jsonTJAL.processo.foro,
      vara: jsonTJAL.processo.vara,
      classe: jsonTJAL.processo.classe,
      assunto: jsonTJAL.processo.assunto,
      juiz: jsonTJAL.processo.juiz,
      area: jsonTJAL.processo.area,
      valorAcao: jsonTJAL.processo.valorAcao,
      distribuicao: jsonTJAL.processo.distribuicao,
      // Dados para a tabela processos
      dadosProcesso: {
        tribunal: this.getNomeTribunal(),
        comarca: jsonTJAL.processo.foro,
        processo: jsonTJAL.processo.numero,
        vara: jsonTJAL.processo.vara,
        classe: jsonTJAL.processo.classe,
        assunto: jsonTJAL.processo.assunto,
        juiz: jsonTJAL.processo.juiz,
        autor: nomesAutores,
        adv_autor: advogadosAutores
      },
      // Dados detalhados para uso na aplicação
      autores,
      reus,
      outros,
      movimentacoes: jsonTJAL.movimentacoes.map(m => ({
        data: m.data,
        descricao: m.descricao
      }))
    };
  }
}

module.exports = TJALAdapter;
