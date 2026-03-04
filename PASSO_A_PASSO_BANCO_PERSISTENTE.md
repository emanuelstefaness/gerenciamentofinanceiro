# Banco de dados persistente (Turso) – passo a passo

O Turso é um banco SQLite na nuvem, **gratuito**, e os dados **persistem** entre deploys. Siga os passos abaixo.

> **Não conseguiu instalar o Turso?** Use a opção **Supabase** (tudo pelo navegador, sem instalar nada): veja o arquivo **PASSO_A_PASSO_SUPABASE.md**.

---

## 1. Criar conta no Turso

1. Acesse: **https://turso.tech**
2. Clique em **Sign up** e crie a conta (pode usar GitHub ou e-mail).

---

## 2. Instalar o Turso CLI

### Windows (PowerShell)

```powershell
irm https://github.com/tursodatabase/turso/releases/latest/download/turso_cli-installer.ps1 | iex
```

### macOS / Linux

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

Feche e abra o terminal depois de instalar.

---

## 3. Fazer login no Turso

No terminal:

```bash
turso auth login
```

Abra o link que aparecer no navegador e autorize. Volte ao terminal quando terminar.

---

## 4. Criar o banco de dados

No terminal, na pasta do seu projeto (ou em qualquer lugar):

```bash
turso db create bosque-financeiro --region scl
```

- `bosque-financeiro` é o nome do banco (pode trocar).
- `--region scl` é Santiago (América do Sul, boa latência para o Brasil).  
  Outras regiões: `iad` (EUA), `lhr` (Europa). Liste com: `turso db locations`.

Anote o nome do banco que você usou.

---

## 5. Obter a URL do banco

Substitua `bosque-financeiro` pelo nome que você usou:

```bash
turso db show bosque-financeiro --url
```

A saída será algo como: `libsql://bosque-financeiro-nomeusuario.turso.io`

**Copie essa URL** – é a sua **TURSO_DATABASE_URL**.

---

## 6. Criar o token de acesso

Ainda com o nome do seu banco:

```bash
turso db tokens create bosque-financeiro
```

A saída será um token longo (ex.: `eyJhbG...`).

**Copie esse token** – é a sua **TURSO_AUTH_TOKEN**.

---

## 7. Configurar no Render (ou outro host)

1. No **Render**: abra seu **Web Service** → **Environment** (Variáveis de ambiente).
2. Adicione:

   | Nome                 | Valor                          |
   |----------------------|--------------------------------|
   | `TURSO_DATABASE_URL` | a URL que você copiou (passo 5) |
   | `TURSO_AUTH_TOKEN`   | o token que você copiou (passo 6) |

3. Salve. Na próxima vez que fizer **deploy**, o app vai usar o Turso e os dados **não serão mais apagados**.

---

## 8. Testar em desenvolvimento (opcional)

Na pasta do projeto, crie um arquivo `.env` (não faça commit dele):

```
TURSO_DATABASE_URL=libsql://bosque-financeiro-seuusuario.turso.io
TURSO_AUTH_TOKEN=seu_token_aqui
```

Depois rode:

```bash
npm start
```

O servidor vai conectar no Turso. As tabelas são criadas automaticamente na primeira execução.

---

## Resumo

| Onde              | O que fazer |
|-------------------|-------------|
| **Turso**         | Conta criada, banco criado, URL e token copiados |
| **Render (env)**  | `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` preenchidos |
| **Deploy**        | Após o próximo deploy, o banco passa a ser o Turso e os dados persistem |

Se **não** definir essas variáveis, o app continua usando o SQLite local (arquivo `restaurante.db`), como antes.

---

## Limites do plano gratuito Turso

- 9 GB de armazenamento  
- 500 milhões de linhas lidas por mês  
- 1 banco por conta no free tier (dá para criar mais e apagar os antigos se precisar)

Para mais detalhes: https://docs.turso.tech
