# 🚀 Guia de Configuração no Vercel

## ✅ O que foi feito

O código foi completamente adaptado para usar **Turso** (banco de dados SQLite na nuvem) ao invés de SQLite local. Todas as rotas foram convertidas para usar `async/await` e o cliente `@libsql/client`.

## 📋 Passo a Passo para Configurar no Vercel

### 1. **Configurar Variáveis de Ambiente no Vercel**

No painel do Vercel:

1. Vá em **Settings** → **Environment Variables**
2. Adicione as seguintes variáveis:

#### Variáveis Obrigatórias:

```
TURSO_DATABASE_URL = libsql://financeiro-manustefanees.aws-us-east-1.turso.io
TURSO_AUTH_TOKEN = eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjQzNTE5NDksImlkIjoiNmY4MDBiZDQtM2M2Yi00MzYzLThhNGYtMTkzZWU0NDVhNmYzIiwicmlkIjoiZDI5NmQ3MGItNjNiYS00ZmU0LTg0NzEtYzBkYzc4YWQxNzY2In0.Zebw4EpHyQj8OjmJ9EUU3Asg0wJLac7rYZOSD-La6I8WfR00fNdtaXBtzmnQavJRqrBVXX_dGq_3uKbc1TE5Aw
```

#### Variáveis Opcionais (mas recomendadas):

```
JWT_SECRET = sua_chave_secreta_aqui_altere_esta_chave
PORT = 3000
```

### 2. **Criar arquivo `vercel.json` (se necessário)**

Se o Vercel não detectar automaticamente, crie um arquivo `vercel.json` na raiz:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

### 3. **Fazer Deploy**

1. **Se já está conectado ao GitHub:**
   - O Vercel detectará automaticamente o novo commit
   - Aguarde o deploy automático

2. **Se ainda não conectou:**
   - Vá em **Settings** → **Git**
   - Conecte seu repositório GitHub
   - O Vercel fará o deploy automaticamente

### 4. **Verificar o Deploy**

Após o deploy, verifique:

1. **Logs do Deploy:**
   - Vá em **Deployments** → Clique no último deploy
   - Verifique se há erros nos logs

2. **Testar a Aplicação:**
   - Acesse a URL fornecida pelo Vercel
   - Tente fazer login com:
     - **Usuário:** `admin`
     - **Senha:** `admin123`

## 🔍 Verificação de Funcionamento

### Logs Esperados:

Ao iniciar, você deve ver nos logs:
```
Conectando ao banco de dados Turso...
✅ Conectado ao banco de dados Turso
Iniciando criação das tabelas...
✅ Tabela users criada/verificada
✅ Tabela arrecadacao criada/verificada
✅ Tabela contas_fixas criada/verificada
✅ Tabela contas_semanais criada/verificada
✅ Tabela contas_diarias criada/verificada
✅ Tabela logs criada/verificada
✅ Usuário admin criado
✅ Banco de dados inicializado com sucesso
✅ Servidor rodando na porta 3000
```

## ⚠️ Problemas Comuns

### Erro: "Cannot find module '@libsql/client'"

**Solução:** Verifique se o `package.json` foi atualizado e o deploy incluiu a nova dependência.

### Erro: "Connection refused" ou "Database connection failed"

**Solução:** 
- Verifique se as variáveis de ambiente `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` estão configuradas corretamente
- Verifique se o token do Turso ainda é válido

### Erro: "Table does not exist"

**Solução:** 
- As tabelas são criadas automaticamente na primeira execução
- Verifique os logs para ver se houve erro na criação das tabelas

## 📝 Notas Importantes

1. **Backup:** Com Turso, não é necessário fazer backup manual - os dados já estão na nuvem com backups automáticos

2. **Performance:** O Turso é otimizado para produção e oferece melhor performance que SQLite local

3. **Escalabilidade:** O Turso suporta múltiplas conexões simultâneas, ideal para produção

## 🎉 Pronto!

Após configurar as variáveis de ambiente e fazer o deploy, sua aplicação estará funcionando com o banco de dados Turso na nuvem!

---

**Dúvidas?** Verifique os logs do Vercel ou entre em contato.

