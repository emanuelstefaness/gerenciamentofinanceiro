# 🧪 Guia Completo de Testes

## 📋 Pré-requisitos para Teste

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Iniciar o servidor:**
   ```bash
   npm start
   ```
   
   Você deve ver:
   ```
   Conectado ao banco de dados SQLite.
   Usuário admin criado (username: admin, password: admin123)
   Servidor rodando na porta 3000
   Acesse: http://localhost:3000
   ```

## 🧪 Testes Passo a Passo

### 1. Teste de Login ✅

1. Abra `http://localhost:3000` no navegador
2. Tente fazer login com credenciais inválidas (deve mostrar erro)
3. Faça login com:
   - **Usuário:** `admin`
   - **Senha:** `admin123`
4. ✅ Deve entrar no sistema e mostrar o Dashboard

### 2. Teste do Dashboard 📊

1. Verifique se aparecem os cards:
   - Total Arrecadado (Mês)
   - Total Gasto (Mês)
   - Lucro Líquido
2. Verifique se há gráficos (mesmo que vazios)
3. Mude o mês no seletor e veja se atualiza
4. ✅ Todos os elementos devem estar visíveis

### 3. Teste de Arrecadação 💵

1. Vá para a aba "Arrecadação"
2. Clique em "+ Nova Arrecadação"
3. Preencha:
   - Data: Hoje
   - Valor: 1500.00
   - Observações: "Vendas do dia"
4. Clique em "Salvar"
5. ✅ Deve aparecer na tabela
6. Teste editar: clique em "Editar" e altere o valor
7. Teste excluir: clique em "Excluir" e confirme
8. Teste filtros:
   - Selecione um intervalo de datas
   - Selecione um mês específico
   - Clique em "Filtrar"
9. ✅ Filtros devem funcionar corretamente

### 4. Teste de Contas Fixas 📅

1. Vá para "Contas Fixas"
2. Clique em "+ Nova Conta Fixa"
3. Preencha:
   - Nome: "Aluguel"
   - Valor: 2000.00
   - Mês Referência: Mês atual
   - Recorrência: Sim
4. Salve
5. ✅ Deve aparecer na tabela
6. Adicione mais 2-3 contas fixas
7. Teste editar e excluir
8. Mude o mês no seletor e veja se filtra
9. ✅ Total deve ser calculado automaticamente

### 5. Teste de Contas Semanais 📆

1. Vá para "Contas Semanais"
2. Clique em "+ Nova Conta Semanal"
3. Preencha:
   - Nome: "Compra de Frutas"
   - Valor: 300.00
   - Semana Referente: Semana atual (formato: 2024-W15)
   - Descrição: "Compra semanal de frutas"
   - Recorrência: Sim
4. Salve
5. ✅ Deve aparecer na tabela
6. Teste filtro por semana
7. Teste filtro por nome (digite "frutas")
8. ✅ Filtros devem funcionar

### 6. Teste de Contas Diárias 📝

1. Vá para "Contas Diárias"
2. Clique em "+ Nova Conta Diária"
3. Preencha:
   - Nome: "Maracujá"
   - Valor: 50.00
   - Data: Hoje
   - Descrição: "Compra de maracujá para sucos"
4. Salve
5. ✅ Deve aparecer na tabela
6. Adicione mais algumas contas diárias
7. Teste filtros:
   - Por intervalo de datas
   - Por mês
8. ✅ Filtros devem funcionar

### 7. Teste de Relatórios 📈

1. Vá para "Relatórios"
2. **Teste busca por nome:**
   - Digite "maracujá" no campo "Buscar por nome"
   - Clique em "Buscar"
   - ✅ Deve listar todas as despesas com "maracujá"
   - ✅ Deve mostrar o total somado automaticamente

3. **Teste busca por descrição:**
   - Digite "frutas" no campo "Buscar por descrição"
   - Clique em "Buscar"
   - ✅ Deve listar despesas com "frutas" na descrição

4. **Teste filtro por categoria:**
   - Selecione "Contas Diárias"
   - Clique em "Buscar"
   - ✅ Deve mostrar apenas contas diárias

5. **Teste filtro por período:**
   - Selecione um intervalo de datas
   - Clique em "Buscar"
   - ✅ Deve filtrar pelo período

6. **Teste exportação PDF:**
   - Faça uma busca
   - Clique em "📄 Exportar PDF"
   - ✅ Deve baixar um arquivo PDF

7. **Teste exportação Excel:**
   - Clique em "📊 Exportar Excel"
   - ✅ Deve baixar um arquivo .xlsx

8. **Teste exportação CSV:**
   - Clique em "📋 Exportar CSV"
   - ✅ Deve baixar um arquivo .csv

### 8. Teste de Modo Escuro 🌙

1. Clique no botão 🌙 no menu lateral
2. ✅ Interface deve mudar para modo escuro
3. Clique novamente (☀️)
4. ✅ Deve voltar ao modo claro
5. Recarregue a página
6. ✅ Deve manter o modo escolhido

### 9. Teste de Responsividade 📱

1. Reduza a janela do navegador
2. ✅ Layout deve se adaptar
3. Teste em diferentes tamanhos:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)
4. ✅ Todos os elementos devem ser acessíveis

### 10. Teste de Backup 💾

1. Vá para "Configurações"
2. Clique em "Criar Backup"
3. ✅ Deve mostrar mensagem de sucesso
4. Verifique se a pasta `backups/` foi criada
5. ✅ Deve conter um arquivo de backup

### 11. Teste de Logs 📋

1. Na aba "Configurações"
2. Verifique a tabela "Histórico de Alterações"
3. ✅ Deve mostrar as ações realizadas:
   - CREATE (criações)
   - UPDATE (edições)
   - DELETE (exclusões)

### 12. Teste de Comparação de Meses 📊

1. Na aba "Configurações"
2. Selecione dois meses diferentes
3. Clique em "Comparar"
4. ✅ Deve mostrar:
   - Arrecadação de cada mês
   - Gastos de cada mês
   - Lucro de cada mês
   - Diferença entre os meses

### 13. Teste de Navegação 🧭

1. Clique em cada item do menu lateral:
   - Dashboard
   - Arrecadação
   - Gastos
   - Contas Fixas
   - Contas Semanais
   - Contas Diárias
   - Relatórios
   - Configurações
2. ✅ Cada página deve abrir corretamente
3. ✅ O item ativo deve estar destacado

### 14. Teste de Logout 🚪

1. Clique em "Sair" no menu lateral
2. ✅ Deve voltar para a tela de login
3. Tente acessar diretamente uma URL da API
4. ✅ Deve pedir autenticação

## ✅ Checklist Final

- [ ] Login funciona
- [ ] Dashboard carrega e mostra dados
- [ ] Arrecadação: criar, editar, excluir, filtrar
- [ ] Contas Fixas: criar, editar, excluir, filtrar
- [ ] Contas Semanais: criar, editar, excluir, filtrar
- [ ] Contas Diárias: criar, editar, excluir, filtrar
- [ ] Relatórios: busca, filtros, exportação (PDF, Excel, CSV)
- [ ] Modo escuro/claro funciona
- [ ] Responsivo em diferentes tamanhos
- [ ] Backup funciona
- [ ] Logs são registrados
- [ ] Comparação de meses funciona
- [ ] Navegação entre páginas funciona
- [ ] Logout funciona

## 🐛 Problemas Comuns

**Servidor não inicia:**
- Verifique se a porta 3000 está livre
- Execute `npm install` novamente
- Verifique se o Node.js está instalado

**Erro de CORS:**
- Certifique-se de acessar via `http://localhost:3000`

**Banco de dados não cria:**
- Verifique permissões de escrita
- O banco é criado automaticamente na primeira execução

**Gráficos não aparecem:**
- Verifique o console do navegador (F12)
- Certifique-se de ter dados para exibir

## 📊 Dados de Teste Sugeridos

Para testar completamente, adicione:

**Arrecadação:**
- 5-10 registros de diferentes dias
- Valores variados (500-3000)

**Contas Fixas:**
- Aluguel: R$ 2000
- Salários: R$ 5000
- Internet: R$ 150

**Contas Semanais:**
- Compra de frutas: R$ 300
- Limpeza: R$ 200

**Contas Diárias:**
- Maracujá: R$ 50
- Carne: R$ 200
- Verduras: R$ 80

Isso permitirá testar todos os recursos com dados realistas!

