# Configuração Docker

Este documento descreve como o projeto será containerizado usando Docker.

## Dockerfile

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
RUN npm install

# Copiar o restante dos arquivos
COPY . .

# Compilar a aplicação Next.js
RUN npm run build

# Expor a porta da aplicação
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
```

## Explicação

- **Imagem Base**: Usamos a imagem oficial do Playwright (`mcr.microsoft.com/playwright:v1.40.0-focal`) que já inclui:
  - Node.js
  - Navegadores (Chromium, Firefox, WebKit)
  - Dependências necessárias para navegadores headless

- **Instalação**: Copiamos os arquivos de dependências e executamos `npm install` antes de copiar o resto do código para aproveitar o cache de camadas do Docker.

- **Build**: Compilamos a aplicação Next.js para produção.

- **Execução**: Expomos a porta 3000 e iniciamos a aplicação.

## Uso em Desenvolvimento

Para desenvolvimento local, você pode usar o seguinte comando:

```bash
docker build -t consulta-processual:dev .
docker run -p 3000:3000 -v $(pwd):/app consulta-processual:dev npm run dev
```

## Uso em Produção

Para produção na sua VPS:

```bash
# Construir a imagem
docker build -t consulta-processual:prod .

# Executar o container
docker run -d --name consulta-app -p 3000:3000 consulta-processual:prod
```

## Persistência de Dados

Para persistir dados entre reinicializações do container:

```bash
docker run -d --name consulta-app -p 3000:3000 \
  -v consulta-data:/app/data \
  consulta-processual:prod
```

## Considerações para VPS

- Certifique-se de que sua VPS tenha pelo menos 2GB de RAM para executar o Playwright adequadamente
- Configure um proxy reverso (como Nginx) para expor a aplicação com HTTPS
- Considere usar Docker Compose para gerenciar o container junto com outros serviços
