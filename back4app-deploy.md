# 🚀 Guia de Deploy no Back4app

## 📋 Pré-requisitos

1. Conta no Back4app: https://www.back4app.com/
2. Projeto no GitHub: https://github.com/emanuelstefaness/gerenciamentofinanceiro

## 🔧 Passo a Passo

### 1. Criar Conta no Back4app

1. Acesse: https://www.back4app.com/
2. Clique em "Sign Up" ou "Get Started"
3. Crie sua conta (pode usar GitHub, Google ou email)

### 2. Conectar GitHub

1. No painel do Back4app, vá em "Settings" → "GitHub"
2. Conecte sua conta do GitHub
3. Autorize o Back4app a acessar seus repositórios

### 3. Criar Nova Aplicação

1. No dashboard do Back4app, clique em **"Build new app"**
2. Selecione **"CaaS"** (Containers as a Service)
3. Escolha **"Import from GitHub"**
4. Selecione o repositório: `emanuelstefaness/gerenciamentofinanceiro`
5. Escolha o branch: `main`

### 4. Configurar Aplicação

**Nome da Aplicação:**
```
gerenciamento-financeiro
```

**Configurações:**
- **Runtime:** Node.js 18
- **Port:** 8080 (Back4app define automaticamente)
- **Build Command:** (deixe vazio, o Dockerfile faz isso)
- **Start Command:** (deixe vazio, o Dockerfile faz isso)

**Environment Variables (Variáveis de Ambiente):**
Adicione estas variáveis no painel do Back4app:

```
NODE_ENV=production
JWT_SECRET=seu_secret_key_aqui_altere_este_valor
DATABASE_PATH=/app/restaurante.db
```

### 5. Deploy

1. Clique em **"Deploy"**
2. Aguarde o build (pode levar 5-10 minutos na primeira vez)
3. O Back4app irá:
   - Construir a imagem Docker
   - Instalar dependências
   - Iniciar a aplicação

### 6. Acessar Aplicação

Após o deploy, você receberá uma URL tipo:
```
https://gerenciamento-financeiro.back4app.io
```

ou

```
https://seu-app.back4app.io
```

## ✅ Verificação

1. Acesse a URL fornecida
2. Faça login com:
   - Usuário: `admin`
   - Senha: `admin123`
3. Teste as funcionalidades

## 🔒 Segurança

**IMPORTANTE:** Altere o `JWT_SECRET` no Back4app:
1. Vá em Settings → Environment Variables
2. Altere `JWT_SECRET` para um valor único e seguro
3. Reinicie a aplicação

## 💾 Banco de Dados

O SQLite será criado automaticamente no servidor Back4app e persistirá entre reinicializações.

**Backup:**
- Use a funcionalidade de backup dentro do sistema
- Ou faça download manual do arquivo `restaurante.db` via SSH (se disponível)

## 🔄 Atualizações

Para atualizar a aplicação:
1. Faça commit e push no GitHub
2. No Back4app, vá em "Deployments"
3. Clique em "Redeploy" ou configure auto-deploy

## 📊 Monitoramento

No painel do Back4app você pode:
- Ver logs da aplicação
- Monitorar uso de recursos
- Ver estatísticas de acesso

## 🆘 Troubleshooting

**Erro ao fazer deploy:**
- Verifique os logs no Back4app
- Certifique-se que o Dockerfile está correto
- Verifique se todas as dependências estão no package.json

**Aplicação não inicia:**
- Verifique as variáveis de ambiente
- Veja os logs em "Logs" no painel
- Certifique-se que a porta está configurada corretamente

**Banco de dados não persiste:**
- Verifique o caminho `DATABASE_PATH`
- Certifique-se que o volume está montado corretamente

## 📱 Acesso Mobile

Após o deploy, acesse pelo celular:
```
https://seu-app.back4app.io
```

A interface mobile simplificada aparecerá automaticamente!

---

**Pronto! Seu sistema estará online e gratuito permanentemente!** 🎉

