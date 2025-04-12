# Integração com Supabase

Este documento descreve como o projeto se integrará com o Supabase para armazenamento e gerenciamento de dados.

## Visão Geral

O Supabase será utilizado como backend-as-a-service (BaaS) para:
1. Armazenar dados de processos, credenciais e resultados de consultas
2. Autenticar usuários (se necessário em versões futuras)
3. Fornecer APIs para acesso aos dados

## Configuração Inicial

### 1. Criação do Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com/) e crie uma conta
2. Crie um novo projeto
3. Anote a URL e a chave anônima do projeto (serão usadas na configuração)

### 2. Estrutura de Tabelas

Crie as seguintes tabelas no Supabase:

#### Tabela: `processos`
```sql
CREATE TABLE processos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'pendente',
  ultima_consulta TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por número de processo
CREATE INDEX idx_processos_numero ON processos(numero);
```

#### Tabela: `credenciais`
```sql
CREATE TABLE credenciais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site TEXT NOT NULL,
  usuario TEXT NOT NULL,
  senha TEXT NOT NULL,
  ativa BOOLEAN DEFAULT TRUE,
  ultimo_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tabela: `resultados`
```sql
CREATE TABLE resultados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  processo_id UUID REFERENCES processos(id) ON DELETE CASCADE,
  data_consulta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dados JSONB,
  status_processo TEXT,
  movimentacoes JSONB,
  erro TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por processo_id
CREATE INDEX idx_resultados_processo_id ON resultados(processo_id);
```

## Integração com Next.js

### 1. Instalação das Dependências

```bash
npm install @supabase/supabase-js
```

### 2. Configuração do Cliente

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltam variáveis de ambiente do Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Funções auxiliares para operações comuns

// Processos
export async function getProcessos() {
  const { data, error } = await supabase
    .from('processos')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getProcessoById(id) {
  const { data, error } = await supabase
    .from('processos')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createProcesso(processo) {
  const { data, error } = await supabase
    .from('processos')
    .insert([processo])
    .select();
  
  if (error) throw error;
  return data[0];
}

export async function updateProcesso(id, updates) {
  const { data, error } = await supabase
    .from('processos')
    .update({ ...updates, updated_at: new Date() })
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0];
}

export async function deleteProcesso(id) {
  const { error } = await supabase
    .from('processos')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Credenciais
export async function getCredenciais() {
  const { data, error } = await supabase
    .from('credenciais')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getCredencialAtiva() {
  const { data, error } = await supabase
    .from('credenciais')
    .select('*')
    .eq('ativa', true)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createCredencial(credencial) {
  const { data, error } = await supabase
    .from('credenciais')
    .insert([credencial])
    .select();
  
  if (error) throw error;
  return data[0];
}

// Resultados
export async function getResultadosByProcessoId(processoId) {
  const { data, error } = await supabase
    .from('resultados')
    .select('*')
    .eq('processo_id', processoId)
    .order('data_consulta', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function salvarResultado(resultado) {
  const { data, error } = await supabase
    .from('resultados')
    .insert([{
      processo_id: resultado.processoId,
      status_processo: resultado.dados?.statusProcesso,
      movimentacoes: resultado.dados?.movimentacoes,
      dados: resultado.dados
    }])
    .select();
  
  if (error) throw error;
  return data[0];
}
```

### 3. Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

## Segurança

### Proteção de Credenciais

As credenciais de acesso ao site de consulta processual são informações sensíveis. Embora o Supabase ofereça criptografia em repouso para os dados, considere implementar criptografia adicional para o campo `senha` na tabela `credenciais`.

Exemplo de criptografia simétrica:

```javascript
// lib/crypto.js
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Deve ter 32 bytes (256 bits)
const IV_LENGTH = 16; // Para AES, é sempre 16

export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text) {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

Adicione a variável de ambiente:

```
ENCRYPTION_KEY=chave-de-32-caracteres-muito-segura
```

## Políticas de Acesso (RLS)

Se o projeto evoluir para ter múltiplos usuários, considere implementar Row Level Security (RLS) no Supabase:

```sql
-- Exemplo de política RLS para uma versão multi-usuário futura
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem ver apenas seus próprios processos" 
  ON processos FOR SELECT 
  USING (auth.uid() = user_id);
```
