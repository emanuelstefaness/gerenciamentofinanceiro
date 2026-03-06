# Passo a passo: Vercel + Supabase (deploy e banco persistente)

Este guia leva você a publicar o app na **Vercel** usando o **Supabase** como banco. Tudo gratuito e com dados que **não somem** a cada deploy.

---

## Parte 1 – Supabase (banco de dados)

### 1.1 Criar conta e projeto

1. Acesse **https://supabase.com** e crie uma conta (pode usar GitHub).
2. Clique em **New Project**.
3. Preencha:
   - **Name:** por exemplo `bosque`
   - **Database Password:** crie uma senha **forte** e **guarde** (você vai usar na URL de conexão).
   - **Region:** escolha a mais próxima (ex.: South America).
4. Clique em **Create new project** e espere alguns minutos.

### 1.2 Pegar a URL do banco (Connection pooler)

1. No menu lateral, clique na **engrenagem** → **Project Settings**.
2. No menu da esquerda, clique em **Database**.
3. Role até **Connection string**.
4. Escolha a aba **URI**.
5. **Use a URL do Connection pooler (porta 6543).**  
   - Se aparecer apenas `db.xxx.supabase.co:5432`, procure na mesma tela a opção **“Transaction”** ou **“Session”** / **Connection pooling**, onde o host seja algo como `aws-0-xx.pooler.supabase.com` e a porta **6543**.  
   - A URL do pooler evita erro de rede (ENETUNREACH) na Vercel.
6. Copie a URL. Ela será algo como:
   ```text
   postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
7. **Substitua `[YOUR-PASSWORD]`** pela senha do banco que você criou.  
   Se a senha tiver **`#`**, use **`%23`** no lugar (ex.: senha `Minha#123` → `Minha%23123` na URL).
8. Guarde essa URL completa; ela será a **`DATABASE_URL`** na Vercel.

---

## Parte 2 – Vercel (hospedagem)

### 2.1 Conta e repositório

1. Acesse **https://vercel.com** e crie uma conta (pode usar GitHub).
2. Tenha o projeto **BOSQUE** em um repositório no **GitHub** (já com as alterações commitadas e enviadas com `git push`).

### 2.2 Criar projeto na Vercel

1. No painel da Vercel, clique em **Add New** → **Project**.
2. **Import** o repositório do GitHub onde está o BOSQUE (conecte o GitHub à Vercel se ainda não estiver).
3. Selecione o repositório (ex.: `emanuelstefaness/gerenciamentofinanceiro`) e clique em **Import**.
4. **Não** altere **Framework Preset** (deixe como está ou “Other”).
5. Em **Environment Variables**, adicione:
   - **Name:** `DATABASE_URL`
   - **Value:** a URL completa do Supabase que você montou no passo 1.2 (com senha e `%23` no lugar de `#`).
   - Marque **Production**, **Preview** e **Development** se quiser usar em todos os ambientes.
6. Clique em **Deploy**.

### 2.3 Aguardar o deploy

1. A Vercel vai fazer o build e o deploy.
2. Quando terminar, ela mostra a URL do app (ex.: `https://seu-projeto.vercel.app`).
3. Acesse essa URL: o app deve abrir e, na primeira vez, as tabelas serão criadas no Supabase automaticamente.

---

## Parte 3 – Depois do deploy

### 3.1 Conferir o banco no Supabase

1. No Supabase → **Database** → **Tables** (ou Schema Visualizer).
2. As tabelas (`users`, `arrecadacao`, `contas_fixas`, `contas_semanais`, `contas_diarias`, `logs`) devem aparecer após você usar o app uma vez.

### 3.2 Atualizações futuras

- Basta dar **push** no GitHub; a Vercel faz um novo deploy automaticamente.
- Os dados continuam no Supabase e **não são apagados** em novos deploys.

---

## Resumo

| Etapa        | Onde        | O que fazer |
|-------------|-------------|-------------|
| Banco       | Supabase    | Criar projeto, senha, copiar URL do **pooler (6543)** e trocar a senha na URL |
| Variável    | Vercel      | Adicionar `DATABASE_URL` com a URL completa (senha com `%23` se tiver `#`) |
| Deploy      | Vercel      | Conectar repositório e fazer o primeiro deploy |

---

## Desenvolvimento local

Para rodar no seu PC com o mesmo banco:

1. Crie um arquivo **`.env`** na pasta do projeto (não faça commit).
2. Coloque:
   ```text
   DATABASE_URL=postgresql://postgres.[ref]:sua_senha@aws-0-xx.pooler.supabase.com:6543/postgres
   ```
3. Rode:
   ```bash
   npm start
   ```
4. Acesse **http://localhost:3000**.

---

## Problemas comuns

- **Erro de rede / ENETUNREACH:** use sempre a URL do **pooler** (porta **6543**), não a conexão direta (5432).
- **Botões não fazem nada:** abra o Console do navegador (F12) e veja se há erro; confira se `DATABASE_URL` está correta na Vercel.
- **Tabelas não aparecem:** acesse o app na URL da Vercel pelo menos uma vez; as tabelas são criadas na primeira execução.

---

## Os dados não persistem (tabelas existem mas os lançamentos somem)

1. **Confirme o projeto no Supabase**  
   A `DATABASE_URL` tem um “ref” (ex.: `aikkjjdxtckgjzsyqxqb`). No Supabase, em **Project Settings → General**, o **Reference ID** deve ser o mesmo. Se você tiver mais de um projeto, pode estar vendo as tabelas de um e o app gravando em outro.

2. **Veja se aparece erro ao salvar**  
   Ao clicar em “Salvar Gasto”, se o backend falhar, deve aparecer um **alert** com a mensagem de erro. Se aparecer, anote a mensagem e confira a `DATABASE_URL` (senha, host do pooler, porta 6543).

3. **Confira no Supabase se os dados entram**  
   Depois de lançar um gasto, abra no Supabase: **Table Editor → contas_diarias**. Atualize a tabela (F5 ou botão de atualizar). Se o registro aparecer aí, o dado está persistindo e o problema pode ser na listagem (cache, filtro de data, etc.). Se não aparecer, o INSERT está falhando (veja o item 2).

4. **Logs na Vercel**  
   Em **Vercel → projeto → Deployments → último deploy → Functions → Logs**, procure por “Erro INSERT contas_diarias” ou “password authentication failed”. Se a senha estiver errada, corrija a `DATABASE_URL` e faça um novo deploy.
