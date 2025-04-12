# Estrutura Detalhada do Projeto

## Arquivos e Diretórios Principais

```
consulta-processual/
├── components/                  # Componentes React reutilizáveis
│   ├── Layout.jsx              # Layout principal da aplicação
│   ├── ProcessoForm.jsx        # Formulário para adicionar/editar processos
│   ├── ProcessoList.jsx        # Lista de processos cadastrados
│   ├── CredentialsForm.jsx     # Formulário para cadastro de credenciais
│   └── ResultadoItem.jsx       # Componente para exibir resultados de consultas
│
├── pages/                      # Páginas Next.js
│   ├── index.js                # Página inicial
│   ├── processos/              # Páginas relacionadas a processos
│   │   ├── index.js            # Lista de processos
│   │   ├── [id].js             # Detalhes de um processo específico
│   │   └── novo.js             # Página para adicionar novo processo
│   ├── configuracoes.js        # Página de configurações (credenciais, etc)
│   ├── resultados/             # Páginas de resultados
│   │   ├── index.js            # Lista de resultados
│   │   └── [id].js             # Detalhes de um resultado específico
│   └── api/                    # API Routes do Next.js
│       ├── processos/          # Endpoints para gerenciar processos
│       │   ├── index.js        # GET (listar), POST (criar)
│       │   └── [id].js         # GET, PUT, DELETE para processo específico
│       ├── credenciais/        # Endpoints para gerenciar credenciais
│       │   ├── index.js        # GET, POST
│       │   └── [id].js         # GET, PUT, DELETE
│       ├── resultados/         # Endpoints para resultados de consultas
│       │   ├── index.js        # GET (listar)
│       │   └── [id].js         # GET (detalhes)
│       ├── consulta.js         # Endpoint para iniciar consulta manual
│       └── cron.js             # Endpoint para agendamento de consultas
│
├── lib/                        # Código utilitário e lógica de negócios
│   ├── supabase.js             # Cliente e configuração do Supabase
│   ├── hooks/                  # React hooks customizados
│   │   ├── useProcessos.js     # Hook para gerenciar processos
│   │   └── useResultados.js    # Hook para gerenciar resultados
│   └── playwright/             # Scripts de automação com Playwright
│       ├── browser.js          # Configuração e gerenciamento do navegador
│       ├── login.js            # Função para realizar login no site
│       ├── consulta.js         # Função para consultar processos
│       └── extrator.js         # Funções para extrair dados dos resultados
│
├── styles/                     # Estilos da aplicação
│   ├── globals.css             # Estilos globais
│   └── components/             # Estilos específicos de componentes
│
├── public/                     # Arquivos estáticos
│   ├── favicon.ico             # Favicon
│   └── images/                 # Imagens
│
├── .env.local.example          # Exemplo de variáveis de ambiente
├── next.config.js              # Configuração do Next.js
├── package.json                # Dependências e scripts
├── Dockerfile                  # Configuração Docker
└── docker-compose.yml          # Configuração para desenvolvimento local
```

## Modelos de Dados

### Processo
```javascript
{
  id: String,               // ID único do processo
  numero: String,           // Número do processo
  descricao: String,        // Descrição ou observações
  status: String,           // Status atual (pendente, consultado, erro)
  ultimaConsulta: Date,     // Data da última consulta
  criadoEm: Date,           // Data de criação
  atualizadoEm: Date        // Data da última atualização
}
```

### Credencial
```javascript
{
  id: String,               // ID único
  site: String,             // URL ou identificador do site
  usuario: String,          // Nome de usuário
  senha: String,            // Senha (criptografada)
  ativa: Boolean,           // Se a credencial está ativa
  ultimoLogin: Date,        // Data do último login bem-sucedido
  criadoEm: Date,           // Data de criação
  atualizadoEm: Date        // Data da última atualização
}
```

### Resultado
```javascript
{
  id: String,               // ID único
  processoId: String,       // ID do processo relacionado
  dataConsulta: Date,       // Data da consulta
  dados: Object,            // Dados extraídos (formato JSON)
  statusProcesso: String,   // Status do processo no momento da consulta
  movimentacoes: Array,     // Lista de movimentações encontradas
  erro: String,             // Mensagem de erro (se houver)
  criadoEm: Date,           // Data de criação
  atualizadoEm: Date        // Data da última atualização
}
```

## Fluxos de Automação

### Fluxo de Consulta Diária
1. O agendador (cron) dispara a função de consulta
2. Sistema recupera a lista de processos a serem consultados
3. Para cada processo:
   - Inicia o navegador Playwright
   - Navega até o site de consulta
   - Realiza login com as credenciais armazenadas
   - Preenche o formulário de consulta com o número do processo
   - Aguarda o carregamento dos resultados
   - Extrai os dados relevantes
   - Salva os resultados no Supabase
   - Atualiza o status do processo
4. Fecha o navegador e registra o log da operação

### Fluxo de Consulta Manual
1. Usuário seleciona processos e clica em "Consultar Agora"
2. Sistema executa o mesmo fluxo da consulta diária, mas apenas para os processos selecionados
3. Interface exibe feedback em tempo real do progresso
4. Ao finalizar, exibe os resultados atualizados
