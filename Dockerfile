# Imagem base Node.js (usar slim ao invés de alpine para melhor compatibilidade com sqlite3)
FROM node:18-slim

# Instalar dependências do sistema necessárias para sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências primeiro (para cache do Docker)
COPY package*.json ./

# Instala as dependências
RUN npm install --production

# Copia o restante do código
COPY . .

# Cria diretório para backups
RUN mkdir -p backups

# Expõe a porta (Back4app usa variável de ambiente PORT, padrão 8080)
EXPOSE 8080

# Variável de ambiente para Node.js
ENV NODE_ENV=production

# Inicia a aplicação
# Usar node diretamente para melhor controle e logs
CMD ["node", "server.js"]

