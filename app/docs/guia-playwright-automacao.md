# Guia Completo de Automação Web com Playwright

## Sumário
1. [Introdução ao Playwright](#introdução-ao-playwright)
2. [Instalação e Configuração](#instalação-e-configuração)
3. [Estrutura Básica de um Script](#estrutura-básica-de-um-script)
4. [Navegação e Interação com Páginas](#navegação-e-interação-com-páginas)
5. [Seletores e Como Encontrá-los](#seletores-e-como-encontrá-los)
6. [Estratégias para Lidar com Formulários Complexos](#estratégias-para-lidar-com-formulários-complexos)
7. [Captura de Screenshots para Debugging](#captura-de-screenshots-para-debugging)
8. [Tratamento de Erros e Timeouts](#tratamento-de-erros-e-timeouts)
9. [Integração com TypeScript](#integração-com-typescript)
10. [Dicas e Truques Avançados](#dicas-e-truques-avançados)
11. [Problemas Comuns e Soluções](#problemas-comuns-e-soluções)
12. [Exemplos Práticos](#exemplos-práticos)

## Introdução ao Playwright

O Playwright é uma ferramenta de automação de navegador desenvolvida pela Microsoft que permite controlar navegadores como Chrome, Firefox e Safari com uma única API. Ele é especialmente útil para:

- Testes automatizados de interfaces web
- Web scraping e extração de dados
- Automação de tarefas repetitivas em navegadores
- Geração de screenshots e PDFs de páginas web

Diferente de outras ferramentas como Selenium, o Playwright foi projetado para ser mais rápido, mais confiável e com melhor suporte para aplicações web modernas que utilizam JavaScript intensivamente.

## Instalação e Configuração

### Pré-requisitos
- Node.js (versão 12 ou superior)
- npm ou yarn

### Instalação Básica

```bash
# Criar um novo projeto
mkdir meu-projeto-playwright
cd meu-projeto-playwright
npm init -y

# Instalar o Playwright
npm install playwright
```

### Instalação com TypeScript

```bash
# Instalar TypeScript
npm install typescript --save-dev

# Instalar os tipos do Playwright
npm install @types/node --save-dev

# Inicializar configuração do TypeScript
npx tsc --init
```

Configuração básica do `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

### Instalação dos Navegadores

O Playwright pode instalar automaticamente os navegadores necessários:

```bash
# Instalar todos os navegadores
npx playwright install

# Ou instalar navegadores específicos
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

## Estrutura Básica de um Script

### Script JavaScript Básico

```javascript
// exemplo-basico.js
const { chromium } = require('playwright');

(async () => {
  // Iniciar o navegador
  const browser = await chromium.launch({
    headless: false // Define como false para visualizar o navegador
  });
  
  // Criar uma nova página
  const page = await browser.newPage();
  
  // Navegar para uma URL
  await page.goto('https://exemplo.com');
  
  // Realizar alguma ação na página
  await page.fill('#username', 'usuario');
  await page.fill('#password', 'senha');
  await page.click('#login-button');
  
  // Aguardar algum resultado
  await page.waitForSelector('.dashboard');
  
  // Capturar um screenshot
  await page.screenshot({ path: 'resultado.png' });
  
  // Fechar o navegador
  await browser.close();
})();
```

### Script TypeScript

```typescript
// exemplo-basico.ts
import { chromium, Browser, Page } from 'playwright';

async function executarAutomacao() {
  let browser: Browser | null = null;
  
  try {
    // Iniciar o navegador
    browser = await chromium.launch({
      headless: false
    });
    
    // Criar uma nova página
    const page: Page = await browser.newPage();
    
    // Navegar para uma URL
    await page.goto('https://exemplo.com');
    
    // Realizar alguma ação na página
    await page.fill('#username', 'usuario');
    await page.fill('#password', 'senha');
    await page.click('#login-button');
    
    // Aguardar algum resultado
    await page.waitForSelector('.dashboard');
    
    // Capturar um screenshot
    await page.screenshot({ path: 'resultado.png' });
  } catch (error) {
    console.error('Erro durante a automação:', error);
  } finally {
    // Fechar o navegador
    if (browser) {
      await browser.close();
    }
  }
}

// Executar a função
executarAutomacao();
```

## Navegação e Interação com Páginas

### Navegação Básica

```javascript
// Navegar para uma URL
await page.goto('https://exemplo.com');

// Navegar com opções adicionais
await page.goto('https://exemplo.com', {
  timeout: 60000, // Timeout em milissegundos
  waitUntil: 'networkidle' // Esperar até que a rede esteja ociosa
});

// Navegar para trás e para frente
await page.goBack();
await page.goForward();

// Recarregar a página
await page.reload();
```

### Interação com Elementos

```javascript
// Clicar em um elemento
await page.click('#botao');

// Preencher um campo de texto
await page.fill('#campo-texto', 'Valor a ser preenchido');

// Selecionar uma opção em um dropdown
await page.selectOption('#dropdown', 'valor');

// Marcar ou desmarcar um checkbox
await page.check('#checkbox');
await page.uncheck('#checkbox');

// Pressionar teclas
await page.press('#campo', 'Enter');

// Arrastar e soltar
await page.dragAndDrop('#origem', '#destino');
```

### Esperas e Timeouts

```javascript
// Esperar por um seletor
await page.waitForSelector('#elemento', { timeout: 30000 });

// Esperar por um elemento desaparecer
await page.waitForSelector('#loading', { state: 'hidden' });

// Esperar por uma navegação
await Promise.all([
  page.waitForNavigation(), // Esperar pela navegação
  page.click('#link-que-navega') // Clicar no link que inicia a navegação
]);

// Esperar por um tempo fixo (evite usar quando possível)
await page.waitForTimeout(5000); // 5 segundos
```

## Seletores e Como Encontrá-los

O Playwright suporta vários tipos de seletores para encontrar elementos na página:

### Tipos de Seletores

1. **Seletores CSS** (mais comuns):
   ```javascript
   await page.click('#id');
   await page.click('.classe');
   await page.click('div.classe > span');
   ```

2. **Seletores de Texto**:
   ```javascript
   await page.click('text=Clique Aqui');
   await page.click('button:has-text("Enviar")');
   ```

3. **Seletores XPath**:
   ```javascript
   await page.click('xpath=//button[@type="submit"]');
   ```

4. **Seletores Combinados**:
   ```javascript
   await page.click('css=form >> text=Enviar');
   ```

### Estratégias para Encontrar Seletores

#### 1. Usando o Inspetor do Navegador

1. Abra o site no navegador
2. Clique com o botão direito no elemento e selecione "Inspecionar"
3. Analise o HTML para encontrar identificadores únicos (id, class, etc.)
4. Teste o seletor no console do navegador: `document.querySelector('#meu-id')`

#### 2. Usando o Modo de Inspeção do Playwright

```javascript
// Adicione esta linha ao seu script para pausar e abrir o inspetor
await page.pause();
```

#### 3. Usando Scripts de Diagnóstico

Crie scripts específicos para analisar a estrutura da página:

```javascript
// diagnostico-seletores.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('https://exemplo.com');
  
  // Listar todos os botões na página
  const botoes = await page.$$('button, input[type="button"], input[type="submit"]');
  
  console.log(`Encontrados ${botoes.length} botões na página`);
  
  for (let i = 0; i < botoes.length; i++) {
    const botao = botoes[i];
    const id = await botao.getAttribute('id');
    const texto = await botao.textContent();
    const tipo = await botao.getAttribute('type');
    
    console.log(`Botão ${i+1}: id="${id}", texto="${texto?.trim()}", tipo="${tipo}"`);
    
    // Destacar o botão para visualização
    await page.evaluate((idx) => {
      const botoes = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
      if (botoes[idx]) {
        botoes[idx].style.border = '2px solid red';
      }
    }, i);
    
    // Tirar screenshot para botões relevantes
    if (id || texto) {
      await page.screenshot({ path: `botao-${i+1}.png` });
    }
  }
  
  // Aguardar para visualização manual
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  await browser.close();
})();
```

## Estratégias para Lidar com Formulários Complexos

### 1. Preenchimento de Formulários Dinâmicos

Quando os IDs ou classes mudam dinamicamente:

```javascript
// Encontrar campos por placeholders ou labels
const campoEmail = await page.$('input[placeholder="Email"]');
const campoSenha = await page.$('input[placeholder="Senha"]');

if (campoEmail && campoSenha) {
  await campoEmail.fill('usuario@exemplo.com');
  await campoSenha.fill('senha123');
}
```

### 2. Usando JavaScript para Preencher Campos

Quando os seletores são muito complexos ou dinâmicos:

```javascript
// Preencher campos usando JavaScript diretamente no contexto da página
await page.evaluate(() => {
  // Encontrar campos por atributos ou posição
  const formulario = document.querySelector('form');
  const inputs = formulario.querySelectorAll('input[type="text"]');
  
  // Preencher os campos
  if (inputs.length >= 2) {
    inputs[0].value = 'Primeiro campo';
    inputs[1].value = 'Segundo campo';
  }
  
  // Submeter o formulário
  formulario.submit();
});
```

### 3. Preenchimento de Campos Separados

Para formulários com campos separados para um único valor (como números de processo, CPF, telefone):

```javascript
// Exemplo: Preenchimento de número de processo em campos separados
function separarNumeroProcesso(numeroCompleto) {
  // Remover caracteres não numéricos
  const numeroLimpo = numeroCompleto.replace(/[^0-9]/g, '');
  
  // Separar as partes do número (formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO)
  return {
    sequencial: numeroLimpo.substring(0, 7),
    digito: numeroLimpo.substring(7, 9),
    ano: numeroLimpo.substring(9, 13),
    justica: numeroLimpo.substring(13, 14),
    tribunal: numeroLimpo.substring(14, 16),
    origem: numeroLimpo.substring(16, 20)
  };
}

// Preencher os campos separados
const partesNumero = separarNumeroProcesso('0000398-17.2017.8.17.2001');

await page.fill('#campo-sequencial', partesNumero.sequencial);
await page.fill('#campo-digito', partesNumero.digito);
await page.fill('#campo-ano', partesNumero.ano);
// ... e assim por diante
```

## Captura de Screenshots para Debugging

Os screenshots são uma ferramenta poderosa para debugging:

```javascript
// Capturar screenshot da página inteira
await page.screenshot({ path: 'pagina-completa.png' });

// Capturar screenshot de um elemento específico
const elemento = await page.$('#meu-elemento');
await elemento.screenshot({ path: 'elemento-especifico.png' });

// Capturar screenshots em momentos críticos
await page.screenshot({ path: 'antes-login.png' });
await page.fill('#username', 'usuario');
await page.fill('#password', 'senha');
await page.screenshot({ path: 'apos-preencher.png' });
await page.click('#login-button');
await page.screenshot({ path: 'apos-login.png' });
```

## Tratamento de Erros e Timeouts

### Estrutura Básica de Try-Catch

```javascript
async function executarAutomacao() {
  const browser = await chromium.launch({ headless: false });
  
  try {
    const page = await browser.newPage();
    
    // Aumentar o timeout padrão
    page.setDefaultTimeout(60000); // 60 segundos
    
    await page.goto('https://exemplo.com');
    
    // Resto do código...
    
  } catch (error) {
    console.error('Erro durante a automação:', error);
    
    // Capturar screenshot em caso de erro
    if (page) {
      await page.screenshot({ path: 'erro.png' });
    }
  } finally {
    // Garantir que o navegador seja fechado mesmo em caso de erro
    if (browser) {
      await browser.close();
    }
  }
}
```

### Tratamento de Timeouts

```javascript
// Aumentar o timeout para uma ação específica
try {
  await page.waitForSelector('#elemento-que-demora', { timeout: 120000 }); // 2 minutos
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.log('Timeout ao esperar pelo elemento');
    // Implementar lógica alternativa
  } else {
    throw error; // Repassar outros tipos de erro
  }
}
```

### Verificação de Elementos Antes de Interagir

```javascript
// Verificar se o elemento existe antes de interagir
const botao = await page.$('#botao-submit');

if (botao) {
  await botao.click();
} else {
  console.log('Botão não encontrado, tentando alternativa...');
  // Implementar lógica alternativa
}
```

## Integração com TypeScript

### Configuração do Projeto

Estrutura de diretórios recomendada:
```
meu-projeto/
├── src/
│   ├── lib/
│   │   └── playwright/
│   │       ├── browser.ts
│   │       ├── login.ts
│   │       └── consulta.ts
│   ├── scripts/
│   │   └── index.ts
│   └── types/
│       └── index.ts
├── tests/
├── package.json
└── tsconfig.json
```

### Definição de Interfaces

```typescript
// src/types/index.ts

export interface Credenciais {
  usuario: string;
  senha: string;
}

export interface ResultadoConsulta {
  sucesso: boolean;
  mensagem: string;
  detalhesAcessados: boolean;
  erro?: string;
}
```

### Módulo de Configuração do Browser

```typescript
// src/lib/playwright/browser.ts

import { chromium, firefox, webkit, Browser, BrowserType, BrowserContext, LaunchOptions } from 'playwright';

type BrowserName = 'chromium' | 'firefox' | 'webkit';

export async function criarBrowser(
  browserName: BrowserName = 'chromium',
  options: LaunchOptions = {}
): Promise<Browser> {
  const defaultOptions: LaunchOptions = {
    headless: false,
    args: ['--disable-dev-shm-usage'],
    timeout: 60000,
    ...options
  };
  
  let browserType: BrowserType;
  
  switch (browserName) {
    case 'firefox':
      browserType = firefox;
      break;
    case 'webkit':
      browserType = webkit;
      break;
    case 'chromium':
    default:
      browserType = chromium;
      break;
  }
  
  return await browserType.launch(defaultOptions);
}

export async function criarContexto(browser: Browser): Promise<BrowserContext> {
  return await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ignoreHTTPSErrors: true
  });
}
```

### Módulo de Login

```typescript
// src/lib/playwright/login.ts

import { Page } from 'playwright';
import { Credenciais } from '../types';

export async function realizarLogin(page: Page, credenciais: Credenciais): Promise<boolean> {
  try {
    await page.goto('https://exemplo.com/login');
    
    await page.fill('#username', credenciais.usuario);
    await page.fill('#password', credenciais.senha);
    
    await Promise.all([
      page.waitForNavigation({ timeout: 60000 }),
      page.click('#login-button')
    ]);
    
    // Verificar se o login foi bem-sucedido
    const url = page.url();
    return url.includes('/dashboard');
  } catch (error) {
    console.error('Erro durante o login:', error);
    return false;
  }
}
```

### Script Principal

```typescript
// src/scripts/index.ts

import { Browser, Page } from 'playwright';
import { criarBrowser, criarContexto } from '../lib/playwright/browser';
import { realizarLogin } from '../lib/playwright/login';
import { Credenciais } from '../types';

async function main() {
  let browser: Browser | null = null;
  
  try {
    // Credenciais
    const credenciais: Credenciais = {
      usuario: 'usuario',
      senha: 'senha'
    };
    
    // Iniciar o navegador
    browser = await criarBrowser('chromium');
    const contexto = await criarContexto(browser);
    const page = await contexto.newPage();
    
    // Realizar login
    const loginSucesso = await realizarLogin(page, credenciais);
    
    if (!loginSucesso) {
      throw new Error('Falha no login');
    }
    
    console.log('Login realizado com sucesso!');
    
    // Resto da automação...
    
  } catch (error) {
    console.error('Erro durante a execução:', error);
  } finally {
    // Fechar o navegador
    if (browser) {
      await browser.close();
    }
  }
}

// Executar o script
main();
```

### Compilação e Execução

```bash
# Compilar o projeto
npx tsc

# Executar o script compilado
node dist/scripts/index.js
```

## Dicas e Truques Avançados

### 1. Emulação de Dispositivos Móveis

```javascript
// Emular um iPhone 12
const iPhone12 = playwright.devices['iPhone 12'];
const context = await browser.newContext({
  ...iPhone12
});
```

### 2. Interceptação de Requisições de Rede

```javascript
// Bloquear imagens para acelerar a navegação
await page.route('**/*.{png,jpg,jpeg,gif}', route => route.abort());

// Modificar respostas de API
await page.route('**/api/dados', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ resultado: 'dados mockados' })
  });
});

// Monitorar requisições
page.on('request', request => console.log('>>>', request.method(), request.url()));
page.on('response', response => console.log('<<<', response.status(), response.url()));
```

### 3. Execução em Paralelo

```javascript
// Executar várias automações em paralelo
async function executarEmParalelo() {
  const tarefas = [];
  
  for (let i = 0; i < 5; i++) {
    tarefas.push(executarAutomacao(`tarefa-${i}`));
  }
  
  await Promise.all(tarefas);
}
```

### 4. Uso de Contextos para Múltiplas Páginas

```javascript
// Trabalhar com múltiplas páginas no mesmo navegador
const browser = await chromium.launch();
const context = await browser.newContext();

const page1 = await context.newPage();
await page1.goto('https://exemplo1.com');

const page2 = await context.newPage();
await page2.goto('https://exemplo2.com');

// Alternar entre as páginas
await page1.bringToFront();
// Trabalhar com page1...

await page2.bringToFront();
// Trabalhar com page2...
```

### 5. Persistência de Estado (Cookies/LocalStorage)

```javascript
// Salvar o estado após o login
const context = await browser.newContext();
const page = await context.newPage();

await page.goto('https://exemplo.com');
await page.fill('#username', 'usuario');
await page.fill('#password', 'senha');
await page.click('#login-button');

// Salvar cookies e localStorage
await context.storageState({ path: 'estado.json' });

// Em uma execução futura, restaurar o estado
const novoContext = await browser.newContext({
  storageState: 'estado.json'
});
```

## Problemas Comuns e Soluções

### 1. Elementos Não Encontrados

**Problema**: O Playwright não consegue encontrar um elemento que você vê na página.

**Soluções**:
- Verifique se o seletor está correto
- Aumente o timeout: `await page.waitForSelector('#elemento', { timeout: 60000 })`
- Verifique se o elemento está dentro de um iframe: `const frame = page.frame({ url: /exemplo/ })`
- Use seletores mais flexíveis: `text=Texto do Botão` em vez de `#id-especifico`

### 2. Problemas com Popups e Novas Janelas

**Problema**: A automação não consegue interagir com popups ou novas janelas.

**Solução**:
```javascript
// Capturar novas páginas quando abrirem
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  page.click('#botao-que-abre-popup')
]);

// Interagir com a nova página
await popup.waitForLoadState();
await popup.click('#botao-no-popup');
```

### 3. Problemas com CAPTCHA

**Problema**: A página contém CAPTCHA que impede a automação.

**Soluções**:
- Use o modo de teste da aplicação, se disponível
- Implemente uma lógica para detectar CAPTCHA e pausar para intervenção manual
- Use serviços de resolução de CAPTCHA (em casos específicos e respeitando os termos de serviço)

### 4. Elementos Dinâmicos/AJAX

**Problema**: Elementos que aparecem dinamicamente após requisições AJAX.

**Solução**:
```javascript
// Esperar até que um elemento específico apareça
await page.waitForSelector('#elemento-dinamico');

// Ou esperar até que uma requisição de rede seja concluída
await page.waitForResponse('**/api/dados');

// Ou usar uma função de verificação personalizada
await page.waitForFunction(() => {
  return document.querySelector('#elemento-dinamico') !== null;
});
```

### 5. Problemas de Performance

**Problema**: Scripts de automação muito lentos.

**Soluções**:
- Use `headless: true` para execução sem interface gráfica
- Bloqueie recursos desnecessários: `await page.route('**/*.{png,jpg,css}', route => route.abort())`
- Reduza o número de screenshots e logs
- Otimize as esperas, usando `waitForSelector` em vez de `waitForTimeout`

## Exemplos Práticos

### Exemplo 1: Login em um Sistema

```javascript
const { chromium } = require('playwright');

async function loginSistema(usuario, senha) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navegar para a página de login
    await page.goto('https://exemplo.com/login');
    
    // Preencher credenciais
    await page.fill('#username', usuario);
    await page.fill('#password', senha);
    
    // Clicar no botão de login
    await Promise.all([
      page.waitForNavigation(),
      page.click('#login-button')
    ]);
    
    // Verificar se o login foi bem-sucedido
    const url = page.url();
    if (url.includes('/dashboard')) {
      console.log('Login realizado com sucesso!');
      await page.screenshot({ path: 'login-sucesso.png' });
      return true;
    } else {
      console.log('Falha no login');
      await page.screenshot({ path: 'login-falha.png' });
      return false;
    }
  } catch (error) {
    console.error('Erro durante o login:', error);
    await page.screenshot({ path: 'login-erro.png' });
    return false;
  } finally {
    await browser.close();
  }
}

// Executar o login
loginSistema('usuario', 'senha');
```

### Exemplo 2: Preenchimento de Formulário Complexo

```javascript
const { chromium } = require('playwright');

async function preencherFormularioComplexo() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navegar para a página do formulário
    await page.goto('https://exemplo.com/formulario');
    
    // Preencher campos de texto
    await page.fill('#nome', 'João Silva');
    await page.fill('#email', 'joao@exemplo.com');
    
    // Selecionar opção em dropdown
    await page.selectOption('#estado', 'SP');
    
    // Marcar checkbox
    await page.check('#termos');
    
    // Preencher campos de data
    await page.fill('#data-nascimento', '01/01/1990');
    
    // Upload de arquivo
    const inputArquivo = await page.$('input[type="file"]');
    await inputArquivo.setInputFiles('caminho/para/arquivo.pdf');
    
    // Preencher campos dinâmicos
    await page.click('#adicionar-telefone');
    await page.fill('#telefone-1', '(11) 98765-4321');
    
    // Submeter o formulário
    await Promise.all([
      page.waitForNavigation(),
      page.click('#submit-button')
    ]);
    
    // Verificar resultado
    const mensagemSucesso = await page.textContent('.mensagem-sucesso');
    if (mensagemSucesso && mensagemSucesso.includes('sucesso')) {
      console.log('Formulário enviado com sucesso!');
      return true;
    } else {
      console.log('Falha no envio do formulário');
      return false;
    }
  } catch (error) {
    console.error('Erro durante o preenchimento do formulário:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Executar o preenchimento do formulário
preencherFormularioComplexo();
```

### Exemplo 3: Extração de Dados (Web Scraping)

```javascript
const { chromium } = require('playwright');
const fs = require('fs');

async function extrairDados() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navegar para a página com os dados
    await page.goto('https://exemplo.com/dados');
    
    // Extrair dados de uma tabela
    const dados = await page.evaluate(() => {
      const linhas = Array.from(document.querySelectorAll('table tr'));
      
      return linhas.map(linha => {
        const colunas = Array.from(linha.querySelectorAll('td'));
        return colunas.map(coluna => coluna.textContent.trim());
      }).filter(linha => linha.length > 0); // Filtrar linhas vazias
    });
    
    // Salvar os dados em um arquivo JSON
    fs.writeFileSync('dados.json', JSON.stringify(dados, null, 2));
    
    console.log(`Extraídos ${dados.length} registros`);
    return dados;
  } catch (error) {
    console.error('Erro durante a extração de dados:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// Executar a extração de dados
extrairDados();
```

---

Este guia cobre os aspectos fundamentais e avançados da automação web com Playwright. Para mais informações, consulte a [documentação oficial do Playwright](https://playwright.dev/docs/intro).

Lembre-se de que a automação web deve ser usada de forma ética e respeitando os termos de serviço dos sites que você está automatizando.
