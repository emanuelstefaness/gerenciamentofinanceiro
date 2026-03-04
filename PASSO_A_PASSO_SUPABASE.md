# Banco persistente com Supabase (PostgreSQL) – sem instalar nada

**Boa opção se você não conseguiu instalar o Turso.** Tudo é feito **no navegador**; não precisa instalar CLI nem programas no PC.

---

## 1. Criar conta no Supabase

1. Acesse: **https://supabase.com**
2. Clique em **Start your project** e crie a conta (pode usar GitHub).

---

## 2. Criar um novo projeto

1. No painel do Supabase, clique em **New Project**.
2. Preencha:
   - **Name:** por exemplo `bosque-financeiro`
   - **Database Password:** crie uma senha **forte** e **guarde** (você vai usar no connection string).
   - **Region:** escolha a mais próxima (ex.: South America (São Paulo)).
3. Clique em **Create new project** e espere alguns minutos.

---

## 3. Pegar a connection string (URL do banco)

1. No menu lateral, vá em **Project Settings** (ícone de engrenagem).
2. Clique em **Database** no menu da esquerda.
3. Role até **Connection string**.
4. Escolha a aba **URI**.
5. Copie a URL. Ela será algo como:
   ```text
   postgresql://postgres.[alguma-coisa]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
6. **Substitua `[YOUR-PASSWORD]`** pela senha do banco que você criou no passo 2.  
   **Se a senha tiver caracteres especiais** (`#`, `@`, `/`, `%`, etc.), use a forma **codificada** na URL:
   - `#` → `%23`
   - `@` → `%40`
   - `/` → `%2F`
   - `%` → `%25`
   Exemplo: se a senha for `Minha#Senha`, use `Minha%23Senha` na URL.
7. Essa URL completa é a sua **`DATABASE_URL`** (nunca faça commit nem compartilhe essa URL).

---

## 4. Configurar no Render (ou outro host)

1. No **Render**, abra seu **Web Service** → **Environment** (Variáveis de ambiente).
2. Adicione uma variável:
   - **Nome:** `DATABASE_URL`
   - **Valor:** a URL completa que você colou (com a senha já substituída; use `%23` no lugar de `#` na senha).
3. Salve e faça um **novo deploy**.

O app vai conectar no Supabase e as tabelas são criadas sozinhas na primeira execução. Os dados **persistem** entre deploys.

---

## 5. Testar em desenvolvimento (opcional)

1. Na pasta do projeto, crie um arquivo **`.env`** (não faça commit dele).
2. Coloque uma linha:
   ```text
   DATABASE_URL=postgresql://postgres.xxxx:sua_senha@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
3. Rode:
   ```bash
   npm start
   ```

---

## Resumo

| Onde            | O que fazer |
|-----------------|-------------|
| **Supabase**    | Criar projeto, anotar senha, copiar connection string e trocar `[YOUR-PASSWORD]` |
| **Render (env)** | Variável `DATABASE_URL` = URL completa (com senha; `#` → `%23`) |
| **Deploy**       | Depois do próximo deploy, o banco passa a ser o Supabase e os dados ficam salvos |

Se **não** definir `DATABASE_URL` (ou se não começar com `postgres://` ou `postgresql://`), o app continua usando SQLite local (arquivo) ou Turso, se você tiver configurado.

---

## Limites do plano gratuito Supabase

- 500 MB de banco
- 1 GB de tráfego de saída por mês
- 2 projetos

Para mais detalhes: https://supabase.com/docs
