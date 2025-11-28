# 💻 Guia de Instalação em Outro Computador

## 📋 Pré-requisitos

Antes de instalar, você precisa ter instalado no computador:

1. **Node.js** (versão 14 ou superior)
   - Baixe em: https://nodejs.org/
   - Escolha a versão LTS (Long Term Support)
   - Instale normalmente

2. **Git** (opcional, mas recomendado)
   - Baixe em: https://git-scm.com/
   - Ou baixe o projeto como ZIP

## 🚀 Método 1: Usando Git (Recomendado)

### Passo 1: Clonar o Repositório

Abra o terminal/prompt de comando e execute:

```bash
git clone https://github.com/emanuelstefaness/gerenciamentofinanceiro.git
```

### Passo 2: Entrar na Pasta

```bash
cd gerenciamentofinanceiro
```

### Passo 3: Instalar Dependências

```bash
npm install
```

### Passo 4: Iniciar o Servidor

```bash
npm start
```

### Passo 5: Acessar no Navegador

Abra o navegador e acesse:
```
http://localhost:3000
```

---

## 📦 Método 2: Baixar como ZIP

### Passo 1: Baixar o Projeto

1. Acesse: https://github.com/emanuelstefaness/gerenciamentofinanceiro
2. Clique em **"Code"** → **"Download ZIP"**
3. Extraia o arquivo ZIP em uma pasta

### Passo 2: Abrir Terminal na Pasta

1. Abra a pasta onde extraiu o projeto
2. Abra o terminal/prompt de comando nesta pasta
   - **Windows:** Clique com botão direito na pasta → "Abrir no Terminal" ou "Abrir no PowerShell"
   - **Mac/Linux:** Abra o Terminal e use `cd` para entrar na pasta

### Passo 3: Instalar Dependências

```bash
npm install
```

### Passo 4: Iniciar o Servidor

```bash
npm start
```

### Passo 5: Acessar no Navegador

Abra o navegador e acesse:
```
http://localhost:3000
```

---

## 🔐 Primeiro Acesso

Ao acessar pela primeira vez, use as credenciais padrão:

- **Usuário:** `admin`
- **Senha:** `admin123`

⚠️ **IMPORTANTE:** Altere a senha após o primeiro acesso!

---

## 📁 Onde Ficam os Dados?

O banco de dados será criado automaticamente na pasta do projeto:

```
restaurante.db
```

Este arquivo contém todos os seus dados (usuários, arrecadações, contas, etc.).

### Para Copiar Dados de Um Computador para Outro:

1. **No computador antigo:**
   - Copie o arquivo `restaurante.db`
   - Copie também a pasta `backups/` (se houver)

2. **No computador novo:**
   - Cole o arquivo `restaurante.db` na pasta do projeto
   - Substitua o arquivo se já existir

---

## 🔄 Atualizar o Sistema

Se você fez alterações no código e quer atualizar em outro computador:

### Usando Git:

```bash
cd gerenciamentofinanceiro
git pull origin main
npm install
npm start
```

### Sem Git:

1. Baixe o projeto novamente (ZIP)
2. **IMPORTANTE:** Antes de substituir, copie o arquivo `restaurante.db` para um lugar seguro
3. Substitua os arquivos do projeto
4. Cole o `restaurante.db` de volta na pasta
5. Execute `npm install` e depois `npm start`

---

## 🛠️ Solução de Problemas

### Erro: "npm não é reconhecido"

**Solução:** Instale o Node.js primeiro (veja Pré-requisitos)

### Erro: "Porta 3000 já está em uso"

**Solução:** 
- Feche outros programas que possam estar usando a porta 3000
- Ou altere a porta no arquivo `server.js` (linha 12):
  ```javascript
  const PORT = process.env.PORT || 3001; // Mude para outra porta
  ```

### Erro ao instalar sqlite3

**Windows:**
- Instale o Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/
- Ou use: `npm install --global windows-build-tools`

**Mac:**
```bash
xcode-select --install
```

**Linux:**
```bash
sudo apt-get install build-essential
```

### O banco de dados não aparece

**Solução:** O arquivo `restaurante.db` é criado automaticamente na primeira execução. Se não aparecer, verifique se o servidor iniciou corretamente.

---

## 📱 Acessar de Outros Dispositivos na Mesma Rede

Para acessar o sistema de outro celular/computador na mesma rede Wi-Fi:

### Passo 1: Descobrir o IP do Computador

**Windows:**
```bash
ipconfig
```
Procure por "IPv4 Address" (ex: 192.168.1.100)

**Mac/Linux:**
```bash
ifconfig
```
Procure por "inet" (ex: 192.168.1.100)

### Passo 2: Alterar o server.js

No arquivo `server.js`, linha ~1030, altere:

**De:**
```javascript
app.listen(PORT, () => {
```

**Para:**
```javascript
app.listen(PORT, '0.0.0.0', () => {
```

### Passo 3: Reiniciar o Servidor

```bash
npm start
```

### Passo 4: Acessar de Outro Dispositivo

No celular/outro computador, acesse:
```
http://SEU_IP:3000
```
Exemplo: `http://192.168.1.100:3000`

⚠️ **IMPORTANTE:** Ambos os dispositivos devem estar na mesma rede Wi-Fi!

---

## ✅ Checklist de Instalação

- [ ] Node.js instalado
- [ ] Projeto baixado/clonado
- [ ] Dependências instaladas (`npm install`)
- [ ] Servidor iniciado (`npm start`)
- [ ] Acessou `http://localhost:3000`
- [ ] Fez login com `admin` / `admin123`
- [ ] Alterou a senha padrão

---

## 🎉 Pronto!

Agora você pode usar o sistema em qualquer computador. Todos os dados ficam salvos localmente no arquivo `restaurante.db`.

**Dúvidas?** Verifique os logs do servidor ou consulte a documentação no README.md

