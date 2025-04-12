const { createClient } = require('@supabase/supabase-js');

/**
 * Serviço para manipulação de processos no Supabase
 */
class ProcessoService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: 'alnpp' } }
    );
    this.empresaId = '807d031b-d08e-492e-94ba-428b28fb604e';
  }
  
  /**
   * Converte uma data no formato DD/MM/YYYY para YYYY-MM-DD
   * @param {string} dataStr - Data no formato DD/MM/YYYY
   * @returns {string|null} Data no formato YYYY-MM-DD ou null se inválida
   */
  converterData(dataStr) {
    if (!dataStr) return null;
    const partesData = dataStr.split('/');
    if (partesData.length !== 3) return null;
    return `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
  }
  
  /**
   * Verifica se um processo já existe no banco de dados
   * @param {string} numeroProcesso - Número do processo
   * @returns {Promise<Object|null>} Dados do processo se existir, null caso contrário
   */
  async verificarProcessoExistente(numeroProcesso) {
    const { data, error } = await this.supabase
      .from('processos')
      .select('uid')
      .eq('processo', numeroProcesso)
      .eq('empresa', this.empresaId)
      .maybeSingle();
      
    if (error) {
      console.error('Erro ao verificar processo existente:', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Insere um novo processo no banco de dados
   * @param {Object} dadosProcesso - Dados do processo a ser inserido
   * @returns {Promise<Object>} Processo inserido
   */
  async inserirProcesso(dadosProcesso) {
    // Adicionar empresa ID
    const processoCompleto = {
      ...dadosProcesso,
      empresa: this.empresaId
    };
    
    const { data, error } = await this.supabase
      .from('processos')
      .insert(processoCompleto)
      .select('uid')
      .single();
      
    if (error) {
      console.error('Erro ao inserir processo:', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Atualiza um processo existente no banco de dados
   * @param {string} processoUid - UID do processo a ser atualizado
   * @param {Object} dadosProcesso - Novos dados do processo
   * @returns {Promise<Object>} Processo atualizado
   */
  async atualizarProcesso(processoUid, dadosProcesso) {
    const { data, error } = await this.supabase
      .from('processos')
      .update(dadosProcesso)
      .eq('uid', processoUid)
      .select('uid')
      .single();
      
    if (error) {
      console.error('Erro ao atualizar processo:', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Verifica se uma movimentação já existe no banco de dados
   * @param {string} processoUid - UID do processo
   * @param {string} dataFormatada - Data da movimentação (YYYY-MM-DD)
   * @param {string} descricao - Descrição da movimentação
   * @returns {Promise<Object|null>} Dados da movimentação se existir, null caso contrário
   */
  async verificarMovimentacaoExistente(processoUid, dataFormatada, descricao) {
    const { data, error } = await this.supabase
      .from('movimentacoes')
      .select('uid')
      .eq('processo_uid', processoUid)
      .eq('data', dataFormatada)
      .eq('movimentacao', descricao)
      .maybeSingle();
      
    if (error) {
      console.error('Erro ao verificar movimentação existente:', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Insere uma nova movimentação no banco de dados
   * @param {Object} dadosMovimentacao - Dados da movimentação a ser inserida
   * @returns {Promise<Object>} Movimentação inserida
   */
  async inserirMovimentacao(dadosMovimentacao) {
    // Adicionar empresa ID
    const movimentacaoCompleta = {
      ...dadosMovimentacao,
      empresa: this.empresaId
    };
    
    const { data, error } = await this.supabase
      .from('movimentacoes')
      .insert(movimentacaoCompleta)
      .select('uid')
      .single();
      
    if (error) {
      console.error('Erro ao inserir movimentação:', error);
      throw error;
    }
    
    return data;
  }
  
  /**
   * Salva um processo e suas movimentações no banco de dados
   * @param {Object} dadosPadronizados - Dados padronizados do processo
   * @returns {Promise<Object>} Resultado da operação
   */
  async salvarProcesso(dadosPadronizados) {
    try {
      console.log(`Processando: ${dadosPadronizados.numeroProcesso}`);
      
      // Verificar se o processo já existe
      const processoExistente = await this.verificarProcessoExistente(dadosPadronizados.numeroProcesso);
      
      let processoUid;
      
      if (processoExistente) {
        // Atualizar processo existente
        console.log(`Atualizando processo existente: ${dadosPadronizados.numeroProcesso}`);
        const processoAtualizado = await this.atualizarProcesso(
          processoExistente.uid, 
          dadosPadronizados.dadosProcesso
        );
        processoUid = processoAtualizado.uid;
      } else {
        // Inserir novo processo
        console.log(`Inserindo novo processo: ${dadosPadronizados.numeroProcesso}`);
        const novoProcesso = await this.inserirProcesso(dadosPadronizados.dadosProcesso);
        processoUid = novoProcesso.uid;
      }
      
      // Salvar movimentações
      console.log(`Processando ${dadosPadronizados.movimentacoes.length} movimentações...`);
      
      let contadorNovas = 0;
      let contadorExistentes = 0;
      
      for (const mov of dadosPadronizados.movimentacoes) {
        // Converter data para formato ISO
        const dataFormatada = this.converterData(mov.data);
        if (!dataFormatada) {
          console.warn(`Data inválida: ${mov.data}. Pulando movimentação.`);
          continue;
        }
        
        // Verificar se a movimentação já existe
        const movExistente = await this.verificarMovimentacaoExistente(
          processoUid, 
          dataFormatada, 
          mov.descricao
        );
        
        if (!movExistente) {
          // Inserir nova movimentação
          await this.inserirMovimentacao({
            processo_uid: processoUid,
            data: dataFormatada,
            movimentacao: mov.descricao,
            processo: dadosPadronizados.numeroProcesso
          });
          
          contadorNovas++;
        } else {
          contadorExistentes++;
        }
      }
      
      return {
        processoUid,
        numeroProcesso: dadosPadronizados.numeroProcesso,
        novasMovimentacoes: contadorNovas,
        movimentacoesExistentes: contadorExistentes
      };
      
    } catch (error) {
      console.error('Erro ao salvar processo:', error);
      throw error;
    }
  }
}

module.exports = ProcessoService;
