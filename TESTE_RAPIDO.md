# ⚡ Teste Rápido - 5 Minutos

## 🚀 Início Imediato

### Windows:
```bash
# Opção 1: Execute o arquivo
teste-rapido.bat

# Opção 2: Manual
npm install
npm start
```

### Linux/Mac:
```bash
npm install
npm start
```

## ✅ Teste Básico (2 minutos)

1. **Acesse:** `http://localhost:3000`
2. **Login:**
   - Usuário: `admin`
   - Senha: `admin123`
3. **Teste rápido:**
   - ✅ Dashboard aparece?
   - ✅ Clique em "Arrecadação" → "+ Nova Arrecadação"
   - ✅ Adicione: Data=hoje, Valor=1000
   - ✅ Salve e veja na tabela
   - ✅ Clique em "Relatórios"
   - ✅ Busque por qualquer termo
   - ✅ Clique em "Exportar PDF"

**Se tudo isso funcionou, o sistema está OK! ✅**

## 🧪 Teste Completo (5 minutos)

Siga o arquivo `GUIA_TESTE.md` para testes detalhados.

## 📝 Dados de Teste Rápido

**Arrecadação:**
- Data: Hoje | Valor: 2000 | Obs: "Teste"

**Conta Fixa:**
- Nome: "Aluguel" | Valor: 2000 | Mês: Atual

**Conta Diária:**
- Nome: "Maracujá" | Valor: 50 | Data: Hoje | Desc: "Teste"

**Depois teste:**
- Relatórios → Buscar "maracujá" → Ver total → Exportar PDF

## 🐛 Se algo não funcionar:

1. Verifique se a porta 3000 está livre
2. Feche outros programas usando a porta
3. Execute `npm install` novamente
4. Verifique o console do navegador (F12)

