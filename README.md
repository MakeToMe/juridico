# Consulta Processual Automatizada

## Visão Geral

Este projeto implementa uma aplicação web para automatizar consultas processuais em sites jurídicos. A aplicação permite que usuários cadastrem suas credenciais, listem processos a serem consultados, e automaticamente realiza as consultas diárias, extraindo informações relevantes e armazenando-as no Supabase.

## Funcionalidades Planejadas

- Interface para cadastro de credenciais de acesso ao site de consulta
- Gerenciamento de lista de processos a serem consultados
- Automação de login e consulta usando Playwright
- Extração de dados específicos dos resultados
- Armazenamento de dados no Supabase
- Agendamento de consultas diárias

## Stack Tecnológica

- **Frontend**: React.js
- **Backend**: Next.js (API Routes)
- **Automação**: Playwright
- **Banco de Dados**: Supabase
- **Containerização**: Docker
- **Agendamento**: node-cron

## Estrutura do Projeto

```
consulta-processual/
├── components/       # Componentes React
├── pages/            # Páginas Next.js (frontend + API routes)
│   ├── api/          # Backend endpoints
│   └── ...           # Páginas da interface
├── lib/
│   ├── supabase.js   # Cliente Supabase
│   └── playwright/   # Scripts de automação
├── public/           # Arquivos estáticos
├── Dockerfile        # Configuração Docker
└── package.json      # Dependências
```

## Fluxo de Funcionamento

1. Usuário cadastra suas credenciais do site de consulta processual
2. Usuário adiciona processos a serem consultados
3. Diariamente, a aplicação:
   - Acessa o site de consulta
   - Realiza login com as credenciais cadastradas
   - Consulta cada processo da lista
   - Extrai os dados relevantes dos resultados
   - Armazena os dados no Supabase
4. Usuário pode visualizar os resultados através da interface

## Próximos Passos

- [ ] Configurar projeto Next.js
- [ ] Implementar autenticação e gerenciamento de usuários
- [ ] Criar interface para cadastro de credenciais
- [ ] Implementar CRUD de processos
- [ ] Desenvolver script Playwright para automação
- [ ] Integrar com Supabase
- [ ] Configurar agendamento de tarefas
- [ ] Criar Dockerfile para containerização
- [ ] Implementar testes

## Requisitos

- Node.js 20 ou superior
- Docker (para containerização)
- Conta no Supabase
