# Serviço de Processamento de Feed XML para Supabase

Este documento contém instruções para implementar um serviço Node.js que lê um feed XML de produtos e armazena os dados no Supabase. O serviço utiliza uma abordagem leve com Axios e fast-xml-parser, sem necessidade de navegador headless.

## Pré-requisitos

- Node.js 14+ instalado
- Conta no Supabase com banco de dados configurado
- URL e chave de serviço do Supabase (para operações server-side)

## Configuração do Banco de Dados Supabase

### Tabela de Produtos

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  currency TEXT,
  link TEXT,
  main_image TEXT,
  brand TEXT,
  availability TEXT,
  condition TEXT,
  product_type TEXT,
  weight DECIMAL(10, 3),
  gtin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscas rápidas por product_id
CREATE INDEX idx_products_product_id ON products(product_id);
```

### Tabela de Imagens de Produtos

```sql
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Restrição para evitar duplicatas
  CONSTRAINT unique_product_image UNIQUE (product_id, image_url)
);

-- Índice para buscas rápidas por product_id
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
```

## Implementação do Serviço

### Estrutura de Arquivos

```
/xml-feed-processor
  ├── config.js           # Configurações (URLs, credenciais)
  ├── package.json        # Dependências e scripts
  ├── index.js            # Ponto de entrada do serviço
  ├── src/
  │   ├── parser.js       # Lógica de processamento XML
  │   ├── database.js     # Interação com Supabase
  │   └── logger.js       # Utilitário de logging
  └── .env                # Variáveis de ambiente (não versionado)
```

### Instalação de Dependências

```bash
npm init -y
npm install axios fast-xml-parser @supabase/supabase-js dotenv node-cron winston
```

### Arquivo .env

```
SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_KEY=sua_chave_de_servico_do_supabase
XML_FEED_URL=https://www.artlimpbrasil.com.br/pub/media/mageplaza/feed/shopping.xml
CRON_SCHEDULE="0 0 * * *"  # Executar diariamente à meia-noite
```

### config.js

```javascript
require('dotenv').config();

module.exports = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  feed: {
    url: process.env.XML_FEED_URL || 'https://www.artlimpbrasil.com.br/pub/media/mageplaza/feed/shopping.xml',
  },
  cron: {
    schedule: process.env.CRON_SCHEDULE || '0 0 * * *', // Diariamente à meia-noite por padrão
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'xml-processor.log',
  }
};
```

### src/logger.js

```javascript
const winston = require('winston');
const config = require('../config');

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: config.logging.file })
  ]
});

module.exports = logger;
```

### src/database.js

```javascript
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const logger = require('./logger');

// Inicializar cliente Supabase com chave de serviço para bypass de RLS
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Insere ou atualiza um produto no Supabase
 * @param {Object} product - Dados do produto
 * @returns {Promise<Object>} - Resultado da operação
 */
async function upsertProduct(product) {
  try {
    const { data, error } = await supabase
      .from('products')
      .upsert(
        {
          product_id: product.product_id,
          title: product.title,
          description: product.description,
          price: product.price,
          currency: product.currency,
          link: product.link,
          main_image: product.main_image,
          brand: product.brand,
          availability: product.availability,
          condition: product.condition,
          product_type: product.product_type,
          weight: product.weight,
          gtin: product.gtin,
          updated_at: new Date()
        },
        {
          onConflict: 'product_id',
          returning: 'minimal'
        }
      );

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (err) {
    logger.error(`Erro ao inserir/atualizar produto ${product.product_id}:`, err);
    return { success: false, error: err };
  }
}

/**
 * Insere imagens de produto no Supabase, evitando duplicatas
 * @param {string} productId - ID do produto
 * @param {Array<string>} imageUrls - URLs das imagens
 * @returns {Promise<Object>} - Resultado da operação
 */
async function insertProductImages(productId, imageUrls) {
  try {
    // Primeiro, obter imagens existentes para este produto
    const { data: existingImages, error: fetchError } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', productId);

    if (fetchError) {
      throw fetchError;
    }

    // Filtrar apenas novas imagens que não existem no banco
    const existingUrls = new Set(existingImages.map(img => img.image_url));
    const newImageUrls = imageUrls.filter(url => !existingUrls.has(url));

    if (newImageUrls.length === 0) {
      return { success: true, message: 'Nenhuma nova imagem para adicionar' };
    }

    // Preparar dados para inserção
    const imagesToInsert = newImageUrls.map(url => ({
      product_id: productId,
      image_url: url
    }));

    // Inserir novas imagens
    const { data, error } = await supabase
      .from('product_images')
      .insert(imagesToInsert);

    if (error) {
      throw error;
    }

    return { 
      success: true, 
      message: `${newImageUrls.length} novas imagens inseridas para o produto ${productId}` 
    };
  } catch (err) {
    logger.error(`Erro ao inserir imagens para o produto ${productId}:`, err);
    return { success: false, error: err };
  }
}

module.exports = {
  supabase,
  upsertProduct,
  insertProductImages
};
```

### src/parser.js

```javascript
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const logger = require('./logger');
const { upsertProduct, insertProductImages } = require('./database');

/**
 * Busca e processa o feed XML
 * @param {string} feedUrl - URL do feed XML
 * @returns {Promise<Object>} - Estatísticas de processamento
 */
async function processFeed(feedUrl) {
  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    imagesProcessed: 0
  };

  try {
    logger.info(`Iniciando download do feed: ${feedUrl}`);
    const response = await axios.get(feedUrl, {
      responseType: 'text',
      timeout: 30000 // 30 segundos timeout
    });

    logger.info('Feed XML baixado com sucesso, iniciando parsing');
    
    // Configurar o parser XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      isArray: (name) => ['item', 'g:additional_image_link'].includes(name)
    });

    // Parsear o XML
    const result = parser.parse(response.data);
    
    // Verificar se o feed tem a estrutura esperada
    if (!result.rss || !result.rss.channel || !Array.isArray(result.rss.channel.item)) {
      throw new Error('Estrutura do feed XML inválida');
    }

    const items = result.rss.channel.item;
    stats.total = items.length;
    
    logger.info(`Encontrados ${items.length} produtos no feed`);

    // Processar cada item
    for (const item of items) {
      try {
        // Extrair e formatar dados do produto
        const productData = {
          product_id: item['g:id'] ? item['g:id'].toString() : null,
          title: item.title || null,
          description: item.description || null,
          link: item.link || null,
          main_image: item['g:image_link'] || null,
          price: item['g:price'] ? parseFloat(item['g:price'].split(' ')[0]) : null,
          currency: item['g:price'] ? item['g:price'].split(' ')[1] : null,
          brand: item['g:brand'] || null,
          availability: item['g:availability'] || null,
          condition: item['g:condition'] || null,
          product_type: item['g:product_type'] || null,
          weight: item['g:weight'] ? parseFloat(item['g:weight']) : null,
          gtin: item['g:gtin'] || null
        };

        // Validar dados obrigatórios
        if (!productData.product_id || !productData.title) {
          logger.warn(`Produto ignorado por falta de dados obrigatórios: ${JSON.stringify(productData)}`);
          stats.failed++;
          continue;
        }

        // Inserir ou atualizar o produto
        const productResult = await upsertProduct(productData);
        
        if (!productResult.success) {
          stats.failed++;
          continue;
        }

        // Processar imagens adicionais
        const additionalImages = item['g:additional_image_link'] || [];
        if (additionalImages.length > 0) {
          const imageResult = await insertProductImages(productData.product_id, additionalImages);
          if (imageResult.success) {
            stats.imagesProcessed += additionalImages.length;
          }
        }

        stats.success++;
        logger.debug(`Produto processado com sucesso: ${productData.product_id}`);
      } catch (itemError) {
        stats.failed++;
        logger.error(`Erro ao processar item: ${itemError.message}`);
      }
    }

    logger.info(`Processamento concluído. Estatísticas: ${JSON.stringify(stats)}`);
    return stats;
  } catch (error) {
    logger.error(`Erro ao processar feed: ${error.message}`);
    throw error;
  }
}

module.exports = {
  processFeed
};
```

### index.js

```javascript
const cron = require('node-cron');
const config = require('./config');
const logger = require('./src/logger');
const { processFeed } = require('./src/parser');

// Função principal que executa o processamento
async function runProcessor() {
  logger.info('Iniciando processamento do feed XML');
  
  try {
    const stats = await processFeed(config.feed.url);
    logger.info(`Processamento concluído: ${stats.success} produtos processados com sucesso, ${stats.failed} falhas`);
  } catch (error) {
    logger.error(`Falha no processamento: ${error.message}`);
  }
}

// Execução imediata na inicialização
runProcessor();

// Configuração do agendamento via cron
if (config.cron.schedule) {
  logger.info(`Agendando execuções futuras com cron: ${config.cron.schedule}`);
  
  cron.schedule(config.cron.schedule, () => {
    logger.info('Executando processamento agendado');
    runProcessor();
  });
}

// Tratamento de encerramento gracioso
process.on('SIGINT', () => {
  logger.info('Serviço interrompido pelo usuário');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Serviço encerrado pelo sistema');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error(`Exceção não tratada: ${error.message}`, error);
  process.exit(1);
});
```

### package.json

```json
{
  "name": "xml-feed-processor",
  "version": "1.0.0",
  "description": "Serviço para processar feed XML e armazenar no Supabase",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "keywords": [
    "xml",
    "feed",
    "supabase"
  ],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@supabase/supabase-js": "^2.21.0",
    "axios": "^1.3.6",
    "dotenv": "^16.0.3",
    "fast-xml-parser": "^4.2.2",
    "node-cron": "^3.0.2",
    "winston": "^3.8.2"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
```

## Execução do Serviço

1. Clone o repositório ou crie a estrutura de arquivos conforme descrito acima
2. Crie um arquivo `.env` com suas credenciais do Supabase
3. Instale as dependências: `npm install`
4. Execute o serviço: `npm start`

## Configuração do Cron

O serviço está configurado para executar automaticamente conforme a expressão cron definida no arquivo `.env` ou no `config.js`. Por padrão, ele executa diariamente à meia-noite.

Exemplos de configurações cron:
- `0 0 * * *`: Diariamente à meia-noite
- `0 */6 * * *`: A cada 6 horas
- `0 8,20 * * *`: Duas vezes por dia, às 8h e 20h
- `0 9 * * 1-5`: De segunda a sexta às 9h

## Monitoramento e Logs

Os logs são gravados tanto no console quanto em um arquivo de log configurável. Verifique o arquivo de log para acompanhar a execução e identificar possíveis problemas.

## Considerações de Segurança

- A chave de serviço do Supabase tem acesso total ao banco de dados, bypassing RLS (Row Level Security)
- Mantenha o arquivo `.env` seguro e nunca o inclua em repositórios de código
- Considere usar variáveis de ambiente em ambientes de produção em vez de arquivos `.env`
- Implemente controle de acesso adequado para o servidor onde este serviço será executado

## Solução de Problemas

### O serviço não está inserindo novos produtos
- Verifique se a URL do feed XML está correta e acessível
- Confirme se as credenciais do Supabase estão corretas
- Verifique os logs para identificar erros específicos

### Erros de timeout ao baixar o feed
- Aumente o valor de timeout no axios em `parser.js`
- Verifique a conexão de rede do servidor

### Problemas com o agendamento cron
- Verifique se a expressão cron está correta
- Em ambientes Windows, pode ser necessário usar um serviço adicional para garantir que o cron funcione corretamente

## Containerização com Docker

### Dockerfile

Crie um arquivo `Dockerfile` na raiz do projeto:

```dockerfile
FROM node:18-alpine

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código-fonte
COPY . .

# Criar volume para logs persistentes
VOLUME ["/app/logs"]

# Definir variáveis de ambiente padrão
ENV NODE_ENV=production

# Executar como usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

USER nodeuser

# Comando para iniciar a aplicação
CMD ["node", "index.js"]
```

### .dockerignore

Crie um arquivo `.dockerignore` para excluir arquivos desnecessários:

```
node_modules
npm-debug.log
.git
.env
.env.*
logs
*.log
.DS_Store
```

### Construção da Imagem Docker

```bash
# Construir a imagem
docker build -t xml-feed-processor:latest .

# Testar a imagem localmente
docker run --env-file .env -v ./logs:/app/logs xml-feed-processor:latest
```

### Publicação no Docker Hub

```bash
# Fazer login no Docker Hub
docker login

# Taguear a imagem com seu nome de usuário
docker tag xml-feed-processor:latest seuusuario/xml-feed-processor:latest

# Enviar para o Docker Hub
docker push seuusuario/xml-feed-processor:latest
```

## Implantação com Docker Swarm via Portainer

### Arquivo de Stack para Docker Swarm (stack.yml)

Crie um arquivo `stack.yml` que será usado no editor do Portainer:

```yaml
version: '3.8'

services:
  xml-processor:
    image: seuusuario/xml-feed-processor:latest
    environment:
      - SUPABASE_URL=sua_url_do_supabase
      - SUPABASE_SERVICE_KEY=sua_chave_de_servico_do_supabase
      - XML_FEED_URL=https://www.artlimpbrasil.com.br/pub/media/mageplaza/feed/shopping.xml
      - CRON_SCHEDULE=0 0 * * *
      - LOG_LEVEL=info
    volumes:
      - xml_processor_logs:/app/logs
    deploy:
      mode: replicated
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    networks:
      - backend

networks:
  backend:
    external: true

volumes:
  xml_processor_logs:
    driver: local
```

### Instruções para Implantação via Portainer

1. Acesse o Portainer e navegue até seu cluster Docker Swarm
2. Vá para a seção "Stacks"
3. Clique em "Add stack"
4. Dê um nome para a stack, como "xml-feed-processor"
5. Na seção "Build method", selecione "Web editor"
6. Cole o conteúdo do arquivo `stack.yml` no editor
7. Substitua as variáveis de ambiente pelos valores reais
8. Clique em "Deploy the stack"

### Gerenciamento da Stack

- **Atualização**: Para atualizar a imagem, envie uma nova versão para o Docker Hub e depois atualize a stack no Portainer
- **Monitoramento**: Use a seção "Containers" do Portainer para verificar logs e status
- **Escala**: Ajuste o número de réplicas conforme necessário na configuração da stack

### Considerações de Segurança para Docker Swarm

- Armazene as variáveis de ambiente sensíveis (como a chave do Supabase) usando Docker Secrets
- Configure limites de recursos para evitar que um contêiner consuma todos os recursos do host
- Use uma rede dedicada para comunicação entre serviços
- Mantenha as imagens atualizadas com as últimas correções de segurança

### Exemplo de Configuração com Docker Secrets

```yaml
version: '3.8'

services:
  xml-processor:
    image: seuusuario/xml-feed-processor:latest
    environment:
      - SUPABASE_URL=sua_url_do_supabase
      - XML_FEED_URL=https://www.artlimpbrasil.com.br/pub/media/mageplaza/feed/shopping.xml
      - CRON_SCHEDULE=0 0 * * *
      - LOG_LEVEL=info
    secrets:
      - supabase_service_key
    volumes:
      - xml_processor_logs:/app/logs
    deploy:
      mode: replicated
      replicas: 1
      restart_policy:
        condition: on-failure

secrets:
  supabase_service_key:
    external: true

volumes:
  xml_processor_logs:
    driver: local
```

Para usar esta configuração, você precisará criar o secret no Docker Swarm:

```bash
echo "sua_chave_secreta_do_supabase" | docker secret create supabase_service_key -
```

E modificar o código da aplicação para ler o secret de `/run/secrets/supabase_service_key`.
