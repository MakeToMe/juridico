# Automação com Playwright

Este documento descreve como o Playwright será utilizado para automatizar as consultas processuais.

## Visão Geral

O Playwright será responsável por:
1. Abrir um navegador headless
2. Navegar até o site de consulta processual
3. Realizar login com as credenciais fornecidas
4. Consultar os processos listados
5. Extrair dados dos resultados
6. Retornar os dados para armazenamento no Supabase

## Estrutura do Código

```javascript
// lib/playwright/browser.js
// Responsável por inicializar e gerenciar o navegador

const { chromium } = require('playwright');

async function iniciarNavegador() {
  const browser = await chromium.launch({
    headless: true, // true para produção, false para debug
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  return { browser, context, page };
}

async function fecharNavegador(browser) {
  await browser.close();
}

module.exports = {
  iniciarNavegador,
  fecharNavegador
};
```

```javascript
// lib/playwright/login.js
// Responsável por realizar o login no site

async function realizarLogin(page, credenciais) {
  try {
    await page.goto(credenciais.site);
    
    // Preencher formulário de login
    await page.fill('input[name="usuario"]', credenciais.usuario);
    await page.fill('input[name="senha"]', credenciais.senha);
    
    // Clicar no botão de login
    await page.click('button[type="submit"]');
    
    // Verificar se o login foi bem-sucedido
    // Isso dependerá da estrutura específica do site
    await page.waitForSelector('.area-logada', { timeout: 10000 });
    
    return { sucesso: true };
  } catch (error) {
    return { 
      sucesso: false, 
      erro: error.message 
    };
  }
}

module.exports = { realizarLogin };
```

```javascript
// lib/playwright/consulta.js
// Responsável por realizar a consulta de processos

async function consultarProcesso(page, numeroProcesso) {
  try {
    // Navegar para a página de consulta
    await page.goto('https://site-consulta.com/consulta');
    
    // Preencher o número do processo
    await page.fill('input[name="numeroProcesso"]', numeroProcesso);
    
    // Clicar no botão de pesquisa
    await page.click('button[type="submit"]');
    
    // Aguardar o carregamento dos resultados
    await page.waitForSelector('.resultado-consulta', { timeout: 30000 });
    
    // Verificar se o processo foi encontrado
    const naoEncontrado = await page.$$('.mensagem-erro');
    if (naoEncontrado.length > 0) {
      return {
        sucesso: false,
        encontrado: false,
        erro: 'Processo não encontrado'
      };
    }
    
    // Extrair dados usando o extrator
    const dados = await extrairDados(page);
    
    return {
      sucesso: true,
      encontrado: true,
      dados
    };
  } catch (error) {
    return {
      sucesso: false,
      erro: error.message
    };
  }
}

module.exports = { consultarProcesso };
```

```javascript
// lib/playwright/extrator.js
// Responsável por extrair dados da página de resultados

async function extrairDados(page) {
  // Exemplo de extração de dados - adaptar conforme a estrutura do site
  const statusProcesso = await page.textContent('.status-processo');
  
  // Extrair movimentações
  const movimentacoes = await page.$$eval('.movimentacao-item', items => {
    return items.map(item => ({
      data: item.querySelector('.data')?.textContent.trim(),
      descricao: item.querySelector('.descricao')?.textContent.trim()
    }));
  });
  
  // Extrair outras informações relevantes
  const partes = await page.$$eval('.parte-processo', items => {
    return items.map(item => ({
      tipo: item.querySelector('.tipo-parte')?.textContent.trim(),
      nome: item.querySelector('.nome-parte')?.textContent.trim()
    }));
  });
  
  return {
    statusProcesso,
    movimentacoes,
    partes,
    dataConsulta: new Date().toISOString()
  };
}

module.exports = { extrairDados };
```

```javascript
// lib/playwright/index.js
// Módulo principal que orquestra todo o processo

const { iniciarNavegador, fecharNavegador } = require('./browser');
const { realizarLogin } = require('./login');
const { consultarProcesso } = require('./consulta');
const { salvarResultado } = require('../supabase'); // Função para salvar no Supabase

async function executarConsultas(processos, credenciais) {
  const resultados = [];
  const { browser, page } = await iniciarNavegador();
  
  try {
    // Realizar login
    const loginResult = await realizarLogin(page, credenciais);
    if (!loginResult.sucesso) {
      throw new Error(`Falha no login: ${loginResult.erro}`);
    }
    
    // Consultar cada processo
    for (const processo of processos) {
      console.log(`Consultando processo: ${processo.numero}`);
      
      const resultado = await consultarProcesso(page, processo.numero);
      
      // Adicionar informações do processo ao resultado
      resultado.processoId = processo.id;
      resultado.numeroProcesso = processo.numero;
      
      // Salvar resultado no Supabase
      if (resultado.sucesso && resultado.encontrado) {
        await salvarResultado(resultado);
      }
      
      resultados.push(resultado);
    }
  } catch (error) {
    console.error('Erro durante a execução das consultas:', error);
  } finally {
    // Garantir que o navegador seja fechado mesmo em caso de erro
    await fecharNavegador(browser);
  }
  
  return resultados;
}

module.exports = { executarConsultas };
```

## Considerações Importantes

### Seletores

Os seletores CSS usados nos exemplos acima (`input[name="usuario"]`, `.resultado-consulta`, etc.) são apenas ilustrativos. Você precisará adaptar esses seletores com base na estrutura real do site de consulta processual.

### Tratamento de Erros

A implementação inclui tratamento básico de erros, mas você pode precisar adicionar lógica mais robusta para lidar com:
- Captchas
- Timeouts
- Mudanças na estrutura do site
- Sessões expiradas

### Headless vs. Headed

Em ambiente de produção, o navegador deve ser executado em modo headless (sem interface gráfica). Para depuração durante o desenvolvimento, você pode configurar `headless: false` para visualizar o processo.

### Otimização

Para melhorar o desempenho:
- Considere reutilizar a mesma sessão de navegador para múltiplas consultas
- Implemente estratégias de retry para lidar com falhas temporárias
- Configure timeouts adequados com base na velocidade típica do site
