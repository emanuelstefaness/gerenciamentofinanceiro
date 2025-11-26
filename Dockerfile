# Imagem base Node.js
FROM node:18-alpine

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install --production

# Copia o restante do código
COPY . .

# Cria diretório para backups
RUN mkdir -p backups

# Expõe a porta (Back4app usa variável de ambiente PORT)
EXPOSE 8080

# Inicia a aplicação
CMD ["node", "server.js"]

