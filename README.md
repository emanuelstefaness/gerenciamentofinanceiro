# Sistema de Gerenciamento Financeiro para Restaurante

Sistema completo e funcional para controle financeiro de restaurantes, com interface moderna, responsiva e banco de dados permanente.

## 🚀 Funcionalidades

### 1. Controle de Arrecadação Diária
- Registro de valores arrecadados por dia
- Filtros por data, intervalo e valor
- Gráficos de arrecadação
- Listagem por mês, semana ou período

### 2. Controle de Gastos

#### A) Contas Fixas (Mensais)
- Cadastro de contas fixas mensais
- Recorrência mensal
- Listagem e edição
- Filtro por mês

#### B) Contas Semanais
- Cadastro de contas semanais
- Descrição detalhada
- Recorrência semanal opcional
- Filtro por semana ou nome

#### C) Contas Diárias
- Cadastro de contas diárias
- Descrição opcional
- Filtro por dia, semana, mês ou período

### 3. Relatórios Completos
- Filtros avançados (nome, descrição, categoria, período)
- Busca inteligente com soma automática
- Exportação em PDF, Excel e CSV
- Detalhamento completo de transações

### 4. Dashboard Geral
- Total arrecadado no mês
- Total gasto no mês
- Lucro líquido
- Gráficos interativos (linha, barras)
- Ranking dos maiores gastos
- Alertas para contas fixas vencendo
- Previsão financeira baseada em histórico

### 5. Funcionalidades Extras
- Sistema de login com autenticação
- Backup automático do banco de dados
- Histórico de alterações (log)
- Comparação de meses
- Modo claro/escuro
- Interface totalmente responsiva

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- npm (geralmente vem com Node.js)

## 🔧 Instalação

1. Clone ou baixe o projeto
2. Abra o terminal na pasta do projeto
3. Instale as dependências:

```bash
npm install
```

## 🚀 Como Usar

1. Inicie o servidor:

```bash
npm start
```

Ou para desenvolvimento com auto-reload:

```bash
npm run dev
```

2. Acesse o sistema no navegador:

```
http://localhost:3000
```

3. Faça login com as credenciais padrão:
   - **Usuário:** admin
   - **Senha:** admin123

## 📁 Estrutura do Projeto

```
BOSQUE/
├── server.js              # Servidor Node.js/Express
├── package.json           # Dependências do projeto
├── restaurante.db        # Banco de dados SQLite (criado automaticamente)
├── backups/              # Pasta de backups (criada automaticamente)
└── public/               # Arquivos frontend
    ├── index.html        # Interface principal
    ├── styles.css        # Estilos CSS
    └── app.js            # Lógica JavaScript
```

## 🗄️ Banco de Dados

O sistema utiliza SQLite como banco de dados permanente. As tabelas são criadas automaticamente na primeira execução:

- `users` - Usuários do sistema
- `arrecadacao` - Registros de arrecadação diária
- `contas_fixas` - Contas fixas mensais
- `contas_semanais` - Contas semanais
- `contas_diarias` - Contas diárias
- `logs` - Histórico de alterações

## 🔐 Segurança

- Autenticação via JWT (JSON Web Tokens)
- Senhas criptografadas com bcrypt
- Proteção de rotas com middleware de autenticação

## 📊 Exportação de Relatórios

O sistema permite exportar relatórios em três formatos:

1. **PDF** - Relatório formatado em PDF
2. **Excel** - Planilha Excel (.xlsx)
3. **CSV** - Arquivo CSV para importação

## 🎨 Interface

- Design moderno e profissional
- Modo claro/escuro
- Totalmente responsivo (mobile, tablet, desktop)
- Navegação intuitiva por abas
- Gráficos interativos com Chart.js

## 🔄 Backup

O sistema permite criar backups do banco de dados através da seção de Configurações. Os backups são salvos na pasta `backups/` com timestamp.

## 📝 Logs

Todas as ações do sistema são registradas na tabela `logs`, incluindo:
- Usuário que realizou a ação
- Tipo de ação (CREATE, UPDATE, DELETE)
- Tabela afetada
- Dados anteriores e novos

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js, Express.js
- **Banco de Dados:** SQLite3
- **Autenticação:** JWT, bcrypt
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Gráficos:** Chart.js
- **Exportação:** jsPDF, xlsx

## 📱 Responsividade

O sistema é totalmente responsivo e funciona perfeitamente em:
- Desktop
- Tablet
- Smartphone

## 🔮 Funcionalidades Futuras

- Múltiplos restaurantes
- Relatórios personalizados
- Integração com sistemas de pagamento
- App mobile
- Notificações por email

## 📞 Suporte

Para dúvidas ou problemas, verifique:
1. Se o Node.js está instalado corretamente
2. Se as dependências foram instaladas (`npm install`)
3. Se a porta 3000 está disponível
4. Se o banco de dados foi criado corretamente

## 📄 Licença

Este projeto é de código aberto e está disponível para uso livre.

---

**Desenvolvido com ❤️ para gestão financeira de restaurantes**

