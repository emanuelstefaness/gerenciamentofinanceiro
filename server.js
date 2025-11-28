const express = require('express');
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
// Back4app define PORT automaticamente, usar 8080 como fallback
const PORT = process.env.PORT || process.env.BACK4APP_PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'restaurante_financeiro_secret_key_2024';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Inicializar banco de dados Turso
const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://financeiro-manustefanees.aws-us-east-1.turso.io';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjQzNTE5NDksImlkIjoiNmY4MDBiZDQtM2M2Yi00MzYzLThhNGYtMTkzZWU0NDVhNmYzIiwicmlkIjoiZDI5NmQ3MGItNjNiYS00ZmU0LTg0NzEtYzBkYzc4YWQxNzY2In0.Zebw4EpHyQj8OjmJ9EUU3Asg0wJLac7rYZOSD-La6I8WfR00fNdtaXBtzmnQavJRqrBVXX_dGq_3uKbc1TE5Aw';

console.log('Conectando ao banco de dados Turso...');
const db = createClient({
    url: TURSO_URL,
    authToken: TURSO_AUTH_TOKEN
});

// Inicializar banco de forma assíncrona
(async () => {
    try {
        await initializeDatabase();
        console.log('✅ Banco de dados inicializado com sucesso');
    } catch (err) {
        console.error('❌ Erro ao inicializar banco:', err);
    }
})();

// Inicializar tabelas
async function initializeDatabase() {
    console.log('Iniciando criação das tabelas...');
    
    try {
        // Tabela de usuários (PRIMEIRA - mais importante)
        await db.execute(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('✅ Tabela users criada/verificada');

        // Tabela de arrecadação diária
        await db.execute(`CREATE TABLE IF NOT EXISTS arrecadacao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data DATE NOT NULL,
            valor REAL NOT NULL,
            observacoes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('✅ Tabela arrecadacao criada/verificada');

        // Tabela de contas fixas
        await db.execute(`CREATE TABLE IF NOT EXISTS contas_fixas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            valor REAL NOT NULL,
            mes_referencia TEXT NOT NULL,
            recorrencia_mensal INTEGER DEFAULT 1,
            ativo INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('✅ Tabela contas_fixas criada/verificada');

        // Tabela de contas semanais
        await db.execute(`CREATE TABLE IF NOT EXISTS contas_semanais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            valor REAL NOT NULL,
            semana_referente TEXT NOT NULL,
            descricao TEXT,
            recorrencia_semanal INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('✅ Tabela contas_semanais criada/verificada');

        // Tabela de contas diárias
        await db.execute(`CREATE TABLE IF NOT EXISTS contas_diarias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            valor REAL NOT NULL,
            data DATE NOT NULL,
            descricao TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('✅ Tabela contas_diarias criada/verificada');

        // Tabela de logs
        await db.execute(`CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT,
            acao TEXT NOT NULL,
            tabela TEXT,
            registro_id INTEGER,
            dados_anteriores TEXT,
            dados_novos TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('✅ Tabela logs criada/verificada');

        // Criar usuário admin padrão (DEPOIS que a tabela users foi criada)
        const adminCheck = await db.execute({
            sql: "SELECT * FROM users WHERE username = ?",
            args: ['admin']
        });
        
        if (adminCheck.rows.length === 0) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            await db.execute({
                sql: "INSERT INTO users (username, password) VALUES (?, ?)",
                args: ['admin', hashedPassword]
            });
            console.log('✅ Usuário admin criado (username: admin, password: admin123)');
        } else {
            console.log('✅ Usuário admin já existe');
        }
        
        console.log('✅ Inicialização do banco de dados concluída');
    } catch (err) {
        console.error('❌ Erro ao inicializar banco:', err.message);
        throw err;
    }
}

// Middleware de autenticação
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

// Função para criar log (async)
async function createLog(usuario, acao, tabela, registroId, dadosAnteriores, dadosNovos) {
    try {
        await db.execute({
            sql: `INSERT INTO logs (usuario, acao, tabela, registro_id, dados_anteriores, dados_novos) 
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [usuario, acao, tabela, registroId, JSON.stringify(dadosAnteriores), JSON.stringify(dadosNovos)]
        });
    } catch (err) {
        console.error('Erro ao criar log:', err.message);
    }
}

// Função auxiliar para normalizar texto (agrupar palavras similares)
function normalizarTexto(texto) {
    if (!texto) return '';
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .trim()
        .replace(/\s+/g, ' '); // Remove espaços extras
}

// Função para calcular similaridade entre strings
function similaridade(str1, str2) {
    const s1 = normalizarTexto(str1);
    const s2 = normalizarTexto(str2);
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Verificar se são muito similares
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    if (minLen / maxLen < 0.7) return 0;
    
    let matches = 0;
    const minStr = s1.length < s2.length ? s1 : s2;
    const maxStr = s1.length >= s2.length ? s1 : s2;
    
    for (let i = 0; i < minStr.length; i++) {
        if (maxStr.includes(minStr[i])) matches++;
    }
    
    return matches / maxLen;
}

// ========== ROTAS DE AUTENTICAÇÃO ==========
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const result = await db.execute({
            sql: "SELECT * FROM users WHERE username = ?",
            args: [username]
        });

        const user = result.rows[0];
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: user.username });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username e senha são obrigatórios' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);

        const result = await db.execute({
            sql: "INSERT INTO users (username, password) VALUES (?, ?)",
            args: [username, hashedPassword]
        });

        res.json({ message: 'Usuário criado com sucesso', id: result.lastInsertRowid });
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username já existe' });
        }
        console.error('Erro ao criar usuário:', err);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// ========== ROTAS DE ARRECADAÇÃO ==========
app.get('/api/arrecadacao', authenticateToken, async (req, res) => {
    try {
        const { data_inicio, data_fim, mes, semana } = req.query;
        let query = "SELECT * FROM arrecadacao WHERE 1=1";
        const args = [];

        if (data_inicio && data_fim) {
            query += " AND data BETWEEN ? AND ?";
            args.push(data_inicio, data_fim);
        } else if (mes) {
            query += " AND strftime('%Y-%m', data) = ?";
            args.push(mes);
        } else if (semana) {
            query += " AND strftime('%Y-W%W', data) = ?";
            args.push(semana);
        }

        query += " ORDER BY data DESC";

        const result = await db.execute({ sql: query, args });
        const rows = result.rows.map(row => ({
            id: row.id,
            data: row.data,
            valor: row.valor,
            observacoes: row.observacoes,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar arrecadação:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/arrecadacao', authenticateToken, async (req, res) => {
    try {
        const { data, valor, observacoes } = req.body;

        const result = await db.execute({
            sql: "INSERT INTO arrecadacao (data, valor, observacoes) VALUES (?, ?, ?)",
            args: [data, valor, observacoes || null]
        });

        await createLog(req.user.username, 'CREATE', 'arrecadacao', result.lastInsertRowid, null, req.body);
        res.json({ id: result.lastInsertRowid, message: 'Arrecadação registrada com sucesso' });
    } catch (err) {
        console.error('Erro ao criar arrecadação:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/arrecadacao/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, valor, observacoes } = req.body;

        const oldResult = await db.execute({
            sql: "SELECT * FROM arrecadacao WHERE id = ?",
            args: [id]
        });

        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Arrecadação não encontrada' });
        }

        const oldRow = oldResult.rows[0];

        await db.execute({
            sql: "UPDATE arrecadacao SET data = ?, valor = ?, observacoes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            args: [data, valor, observacoes || null, id]
        });

        await createLog(req.user.username, 'UPDATE', 'arrecadacao', id, oldRow, req.body);
        res.json({ message: 'Arrecadação atualizada com sucesso' });
    } catch (err) {
        console.error('Erro ao atualizar arrecadação:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/arrecadacao/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.execute({
            sql: "SELECT * FROM arrecadacao WHERE id = ?",
            args: [id]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Arrecadação não encontrada' });
        }

        const row = result.rows[0];

        await db.execute({
            sql: "DELETE FROM arrecadacao WHERE id = ?",
            args: [id]
        });

        await createLog(req.user.username, 'DELETE', 'arrecadacao', id, row, null);
        res.json({ message: 'Arrecadação excluída com sucesso' });
    } catch (err) {
        console.error('Erro ao excluir arrecadação:', err);
        res.status(500).json({ error: err.message });
    }
});

// ========== ROTAS DE CONTAS FIXAS ==========
app.get('/api/contas-fixas', authenticateToken, async (req, res) => {
    try {
        const { mes } = req.query;
        let query = "SELECT * FROM contas_fixas WHERE 1=1";
        const args = [];

        if (mes) {
            query += " AND mes_referencia = ?";
            args.push(mes);
        }

        query += " ORDER BY mes_referencia DESC, nome ASC";

        const result = await db.execute({ sql: query, args });
        const rows = result.rows.map(row => ({
            id: row.id,
            nome: row.nome,
            valor: row.valor,
            mes_referencia: row.mes_referencia,
            recorrencia_mensal: row.recorrencia_mensal,
            ativo: row.ativo,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar contas fixas:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contas-fixas', authenticateToken, async (req, res) => {
    try {
        const { nome, valor, mes_referencia, recorrencia_mensal } = req.body;

        const result = await db.execute({
            sql: "INSERT INTO contas_fixas (nome, valor, mes_referencia, recorrencia_mensal) VALUES (?, ?, ?, ?)",
            args: [nome, valor, mes_referencia, recorrencia_mensal || 1]
        });

        await createLog(req.user.username, 'CREATE', 'contas_fixas', result.lastInsertRowid, null, req.body);
        res.json({ id: result.lastInsertRowid, message: 'Conta fixa criada com sucesso' });
    } catch (err) {
        console.error('Erro ao criar conta fixa:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/contas-fixas/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, valor, mes_referencia, recorrencia_mensal, ativo } = req.body;

        const oldResult = await db.execute({
            sql: "SELECT * FROM contas_fixas WHERE id = ?",
            args: [id]
        });

        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Conta fixa não encontrada' });
        }

        const oldRow = oldResult.rows[0];

        await db.execute({
            sql: "UPDATE contas_fixas SET nome = ?, valor = ?, mes_referencia = ?, recorrencia_mensal = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            args: [nome, valor, mes_referencia, recorrencia_mensal || 1, ativo !== undefined ? ativo : 1, id]
        });

        await createLog(req.user.username, 'UPDATE', 'contas_fixas', id, oldRow, req.body);
        res.json({ message: 'Conta fixa atualizada com sucesso' });
    } catch (err) {
        console.error('Erro ao atualizar conta fixa:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/contas-fixas/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.execute({
            sql: "SELECT * FROM contas_fixas WHERE id = ?",
            args: [id]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conta fixa não encontrada' });
        }

        const row = result.rows[0];

        await db.execute({
            sql: "DELETE FROM contas_fixas WHERE id = ?",
            args: [id]
        });

        await createLog(req.user.username, 'DELETE', 'contas_fixas', id, row, null);
        res.json({ message: 'Conta fixa excluída com sucesso' });
    } catch (err) {
        console.error('Erro ao excluir conta fixa:', err);
        res.status(500).json({ error: err.message });
    }
});

// ========== ROTAS DE CONTAS SEMANAIS ==========
app.get('/api/contas-semanais', authenticateToken, async (req, res) => {
    try {
        const { semana, nome } = req.query;
        let query = "SELECT * FROM contas_semanais WHERE 1=1";
        const args = [];

        if (semana) {
            query += " AND semana_referente = ?";
            args.push(semana);
        }
        if (nome) {
            query += " AND nome LIKE ?";
            args.push(`%${nome}%`);
        }

        query += " ORDER BY semana_referente DESC, nome ASC";

        const result = await db.execute({ sql: query, args });
        const rows = result.rows.map(row => ({
            id: row.id,
            nome: row.nome,
            valor: row.valor,
            semana_referente: row.semana_referente,
            descricao: row.descricao,
            recorrencia_semanal: row.recorrencia_semanal,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar contas semanais:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contas-semanais', authenticateToken, async (req, res) => {
    try {
        const { nome, valor, semana_referente, descricao, recorrencia_semanal } = req.body;

        const result = await db.execute({
            sql: "INSERT INTO contas_semanais (nome, valor, semana_referente, descricao, recorrencia_semanal) VALUES (?, ?, ?, ?, ?)",
            args: [nome, valor, semana_referente, descricao || null, recorrencia_semanal || 0]
        });

        await createLog(req.user.username, 'CREATE', 'contas_semanais', result.lastInsertRowid, null, req.body);
        res.json({ id: result.lastInsertRowid, message: 'Conta semanal criada com sucesso' });
    } catch (err) {
        console.error('Erro ao criar conta semanal:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/contas-semanais/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, valor, semana_referente, descricao, recorrencia_semanal } = req.body;

        const oldResult = await db.execute({
            sql: "SELECT * FROM contas_semanais WHERE id = ?",
            args: [id]
        });

        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Conta semanal não encontrada' });
        }

        const oldRow = oldResult.rows[0];

        await db.execute({
            sql: "UPDATE contas_semanais SET nome = ?, valor = ?, semana_referente = ?, descricao = ?, recorrencia_semanal = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            args: [nome, valor, semana_referente, descricao || null, recorrencia_semanal || 0, id]
        });

        await createLog(req.user.username, 'UPDATE', 'contas_semanais', id, oldRow, req.body);
        res.json({ message: 'Conta semanal atualizada com sucesso' });
    } catch (err) {
        console.error('Erro ao atualizar conta semanal:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/contas-semanais/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.execute({
            sql: "SELECT * FROM contas_semanais WHERE id = ?",
            args: [id]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conta semanal não encontrada' });
        }

        const row = result.rows[0];

        await db.execute({
            sql: "DELETE FROM contas_semanais WHERE id = ?",
            args: [id]
        });

        await createLog(req.user.username, 'DELETE', 'contas_semanais', id, row, null);
        res.json({ message: 'Conta semanal excluída com sucesso' });
    } catch (err) {
        console.error('Erro ao excluir conta semanal:', err);
        res.status(500).json({ error: err.message });
    }
});

// ========== ROTAS DE CONTAS DIÁRIAS ==========
app.get('/api/contas-diarias', authenticateToken, async (req, res) => {
    try {
        const { data_inicio, data_fim, mes, semana, dia } = req.query;
        let query = "SELECT * FROM contas_diarias WHERE 1=1";
        const args = [];

        if (data_inicio && data_fim) {
            query += " AND data BETWEEN ? AND ?";
            args.push(data_inicio, data_fim);
        } else if (mes) {
            query += " AND strftime('%Y-%m', data) = ?";
            args.push(mes);
        } else if (semana) {
            query += " AND strftime('%Y-W%W', data) = ?";
            args.push(semana);
        } else if (dia) {
            query += " AND data = ?";
            args.push(dia);
        }

        query += " ORDER BY created_at DESC, nome ASC";

        const result = await db.execute({ sql: query, args });
        const rows = result.rows.map(row => ({
            id: row.id,
            nome: row.nome,
            valor: row.valor,
            data: row.data,
            descricao: row.descricao,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar contas diárias:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contas-diarias', authenticateToken, async (req, res) => {
    try {
        const { nome, valor, data, descricao } = req.body;

        const result = await db.execute({
            sql: "INSERT INTO contas_diarias (nome, valor, data, descricao) VALUES (?, ?, ?, ?)",
            args: [nome, valor, data, descricao || null]
        });

        await createLog(req.user.username, 'CREATE', 'contas_diarias', result.lastInsertRowid, null, req.body);
        res.json({ id: result.lastInsertRowid, message: 'Conta diária criada com sucesso' });
    } catch (err) {
        console.error('Erro ao criar conta diária:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/contas-diarias/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, valor, data, descricao } = req.body;

        const oldResult = await db.execute({
            sql: "SELECT * FROM contas_diarias WHERE id = ?",
            args: [id]
        });

        if (oldResult.rows.length === 0) {
            return res.status(404).json({ error: 'Conta diária não encontrada' });
        }

        const oldRow = oldResult.rows[0];

        await db.execute({
            sql: "UPDATE contas_diarias SET nome = ?, valor = ?, data = ?, descricao = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            args: [nome, valor, data, descricao || null, id]
        });

        await createLog(req.user.username, 'UPDATE', 'contas_diarias', id, oldRow, req.body);
        res.json({ message: 'Conta diária atualizada com sucesso' });
    } catch (err) {
        console.error('Erro ao atualizar conta diária:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/contas-diarias/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.execute({
            sql: "SELECT * FROM contas_diarias WHERE id = ?",
            args: [id]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conta diária não encontrada' });
        }

        const row = result.rows[0];

        await db.execute({
            sql: "DELETE FROM contas_diarias WHERE id = ?",
            args: [id]
        });

        await createLog(req.user.username, 'DELETE', 'contas_diarias', id, row, null);
        res.json({ message: 'Conta diária excluída com sucesso' });
    } catch (err) {
        console.error('Erro ao excluir conta diária:', err);
        res.status(500).json({ error: err.message });
    }
});

// ========== ROTAS DE RELATÓRIOS COMPLETOS ==========
app.get('/api/relatorios', authenticateToken, async (req, res) => {
    const { nome, descricao, categoria, data_inicio, data_fim, mes, semana, agrupar_similares } = req.query;
    
    try {
        // Determinar período
        let periodoInicio, periodoFim;
        if (data_inicio && data_fim) {
            periodoInicio = data_inicio;
            periodoFim = data_fim;
        } else if (mes) {
            periodoInicio = mes + '-01';
            const [ano, mesNum] = mes.split('-');
            const ultimoDia = new Date(ano, mesNum, 0).getDate();
            periodoFim = mes + '-' + String(ultimoDia).padStart(2, '0');
        } else if (semana) {
            // Calcular início e fim da semana
            const [ano, semanaNum] = semana.split('-W');
            const inicioAno = new Date(ano, 0, 1);
            const dias = (semanaNum - 1) * 7;
            const inicioSemana = new Date(inicioAno);
            inicioSemana.setDate(inicioSemana.getDate() + dias);
            periodoInicio = inicioSemana.toISOString().slice(0, 10);
            const fimSemana = new Date(inicioSemana);
            fimSemana.setDate(fimSemana.getDate() + 6);
            periodoFim = fimSemana.toISOString().slice(0, 10);
        } else {
            // Último mês por padrão
            const hoje = new Date();
            periodoInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
            periodoFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
        }

        const promises = {
            arrecadacao: (async () => {
                const result = await db.execute({
                    sql: "SELECT * FROM arrecadacao WHERE data BETWEEN ? AND ?",
                    args: [periodoInicio, periodoFim]
                });
                return result.rows || [];
            })(),
            fixas: (async () => {
                if (categoria && categoria !== 'fixa') return [];
                let query = "SELECT * FROM contas_fixas WHERE 1=1";
                const args = [];
                if (mes) {
                    query += " AND mes_referencia = ?";
                    args.push(mes);
                }
                if (nome) {
                    query += " AND nome LIKE ?";
                    args.push(`%${nome}%`);
                }
                const result = await db.execute({ sql: query, args });
                return result.rows || [];
            })(),
            semanais: (async () => {
                if (categoria && categoria !== 'semanal') return [];
                let query = "SELECT * FROM contas_semanais WHERE 1=1";
                const args = [];
                if (semana) {
                    query += " AND semana_referente = ?";
                    args.push(semana);
                }
                if (nome) {
                    query += " AND nome LIKE ?";
                    args.push(`%${nome}%`);
                }
                if (descricao) {
                    query += " AND descricao LIKE ?";
                    args.push(`%${descricao}%`);
                }
                const result = await db.execute({ sql: query, args });
                return result.rows || [];
            })(),
            diarias: (async () => {
                if (categoria && categoria !== 'diaria') return [];
                let query = "SELECT * FROM contas_diarias WHERE data BETWEEN ? AND ?";
                const args = [periodoInicio, periodoFim];
                if (nome) {
                    query += " AND nome LIKE ?";
                    args.push(`%${nome}%`);
                }
                if (descricao) {
                    query += " AND descricao LIKE ?";
                    args.push(`%${descricao}%`);
                }
                const result = await db.execute({ sql: query, args });
                return result.rows || [];
            })()
        };

        const [arrecadacao, fixas, semanais, diarias] = await Promise.all([
            promises.arrecadacao,
            promises.fixas,
            promises.semanais,
            promises.diarias
        ]);

        // Calcular totais
        const totalArrecadado = arrecadacao.reduce((sum, item) => sum + parseFloat(item.valor || 0), 0);
        const totalFixas = fixas.reduce((sum, item) => sum + parseFloat(item.valor || 0), 0);
        const totalSemanais = semanais.reduce((sum, item) => sum + parseFloat(item.valor || 0), 0);
        const totalDiarias = diarias.reduce((sum, item) => sum + parseFloat(item.valor || 0), 0);
        const totalGastos = totalFixas + totalSemanais + totalDiarias;
        const lucroPrejuizo = totalArrecadado - totalGastos;
        const margem = totalArrecadado > 0 ? ((lucroPrejuizo / totalArrecadado) * 100).toFixed(2) : 0;

        // Preparar dados detalhados
        const detalhes = [];
        
        // Adicionar arrecadação
        arrecadacao.forEach(item => {
            detalhes.push({
                tipo: 'arrecadacao',
                categoria: 'Receita',
                id: item.id,
                nome: 'Arrecadação',
                valor: parseFloat(item.valor || 0),
                periodo: item.data,
                descricao: item.observacoes || 'Arrecadação diária',
                created_at: item.created_at,
                data: item.data
            });
        });

        // Adicionar gastos fixos
        fixas.forEach(item => {
            detalhes.push({
                tipo: 'gasto',
                categoria: 'Fixa',
                id: item.id,
                nome: item.nome,
                valor: parseFloat(item.valor || 0),
                periodo: item.mes_referencia,
                descricao: null,
                created_at: item.created_at,
                data: null
            });
        });

        // Adicionar gastos semanais
        semanais.forEach(item => {
            detalhes.push({
                tipo: 'gasto',
                categoria: 'Semanal',
                id: item.id,
                nome: item.nome,
                valor: parseFloat(item.valor || 0),
                periodo: item.semana_referente,
                descricao: item.descricao,
                created_at: item.created_at,
                data: null
            });
        });

        // Adicionar gastos diários
        diarias.forEach(item => {
            detalhes.push({
                tipo: 'gasto',
                categoria: 'Diária',
                id: item.id,
                nome: item.nome,
                valor: parseFloat(item.valor || 0),
                periodo: item.data,
                descricao: item.descricao,
                created_at: item.created_at,
                data: item.data
            });
        });

        // Agrupar gastos similares se solicitado
        let gastosAgrupados = [];
        if (agrupar_similares === 'true' || agrupar_similares === '1') {
            const gastos = detalhes.filter(d => d.tipo === 'gasto');
            const grupos = {};
            
            gastos.forEach(gasto => {
                const nomeNormalizado = normalizarTexto(gasto.nome);
                let encontrado = false;
                
                // Procurar grupo similar
                for (const [chave, grupo] of Object.entries(grupos)) {
                    if (similaridade(nomeNormalizado, chave) > 0.7) {
                        grupo.total += gasto.valor;
                        grupo.quantidade++;
                        grupo.itens.push(gasto);
                        encontrado = true;
                        break;
                    }
                }
                
                if (!encontrado) {
                    grupos[nomeNormalizado] = {
                        nome: gasto.nome, // Usa o primeiro nome encontrado
                        total: gasto.valor,
                        quantidade: 1,
                        itens: [gasto]
                    };
                }
            });
            
            // Converter grupos em array
            gastosAgrupados = Object.values(grupos).map(grupo => ({
                nome: grupo.nome,
                total: grupo.total,
                quantidade: grupo.quantidade,
                media: grupo.total / grupo.quantidade,
                itens: grupo.itens
            })).sort((a, b) => b.total - a.total);
        }

        // Análise por categoria de gasto
        const gastosPorCategoria = {
            fixa: totalFixas,
            semanal: totalSemanais,
            diaria: totalDiarias
        };

        // Top 10 maiores gastos
        const todosGastos = [...fixas, ...semanais, ...diarias];
        const topGastos = todosGastos
            .map(g => ({ nome: g.nome, valor: parseFloat(g.valor), categoria: g.mes_referencia ? 'Fixa' : (g.semana_referente ? 'Semanal' : 'Diária') }))
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 10);

        // Análise diária (se período for mensal)
        let analiseDiaria = [];
        if (mes || (data_inicio && data_fim && data_inicio.slice(0, 7) === data_fim.slice(0, 7))) {
            const mesAnalise = mes || data_inicio.slice(0, 7);
            const diasNoMes = new Date(mesAnalise.split('-')[0], mesAnalise.split('-')[1], 0).getDate();
            
            for (let dia = 1; dia <= diasNoMes; dia++) {
                const dataStr = mesAnalise + '-' + String(dia).padStart(2, '0');
                const arrecDia = arrecadacao.filter(a => a.data === dataStr).reduce((sum, a) => sum + parseFloat(a.valor), 0);
                const gastosDia = diarias.filter(d => d.data === dataStr).reduce((sum, d) => sum + parseFloat(d.valor), 0);
                analiseDiaria.push({
                    data: dataStr,
                    arrecadado: arrecDia,
                    gastos: gastosDia,
                    lucro: arrecDia - gastosDia
                });
            }
        }

        // Resposta completa
        const relatorio = {
            periodo: {
                inicio: periodoInicio,
                fim: periodoFim,
                tipo: mes ? 'mensal' : (semana ? 'semanal' : 'customizado')
            },
            resumo: {
                arrecadado: totalArrecadado,
                gastos: totalGastos,
                lucro_prejuizo: lucroPrejuizo,
                margem: parseFloat(margem),
                status: lucroPrejuizo >= 0 ? 'lucro' : 'prejuizo'
            },
            detalhes: detalhes,
            gastos_agrupados: gastosAgrupados,
            gastos_por_categoria: gastosPorCategoria,
            top_gastos: topGastos,
            analise_diaria: analiseDiaria,
            estatisticas: {
                total_transacoes: detalhes.length,
                total_arrecadacoes: arrecadacao.length,
                total_gastos: todosGastos.length,
                media_diaria_arrecadacao: periodoInicio && periodoFim ? 
                    totalArrecadado / Math.ceil((new Date(periodoFim) - new Date(periodoInicio)) / (1000 * 60 * 60 * 24)) : 0,
                media_diaria_gastos: periodoInicio && periodoFim ? 
                    totalGastos / Math.ceil((new Date(periodoFim) - new Date(periodoInicio)) / (1000 * 60 * 60 * 24)) : 0
            }
        };

        res.json(relatorio);
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório completo' });
    }
});

// ========== ROTAS DE DASHBOARD ==========
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const { mes } = req.query;
        const mesAtual = mes || new Date().toISOString().slice(0, 7);

        const dashboard = {};

        // Total arrecadado no mês
        const arrecResult = await db.execute({
            sql: "SELECT COALESCE(SUM(valor), 0) as total FROM arrecadacao WHERE strftime('%Y-%m', data) = ?",
            args: [mesAtual]
        });
        dashboard.totalArrecadado = arrecResult.rows[0]?.total || 0;

        // Total gasto no mês (contas fixas + semanais + diárias)
        const fixasResult = await db.execute({
            sql: "SELECT COALESCE(SUM(valor), 0) as total FROM contas_fixas WHERE mes_referencia = ? AND ativo = 1",
            args: [mesAtual]
        });
        const totalFixas = fixasResult.rows[0]?.total || 0;

        // Para contas semanais, buscar todas e filtrar por mês no código
        const semanaisResult = await db.execute({
            sql: "SELECT * FROM contas_semanais",
            args: []
        });
        const semanaisRows = semanaisResult.rows || [];
        const [anoAtual] = mesAtual.split('-');
        const totalSemanais = semanaisRows.filter(s => {
            return s.semana_referente && s.semana_referente.startsWith(anoAtual);
        }).reduce((sum, s) => sum + parseFloat(s.valor || 0), 0);

        const diariasResult = await db.execute({
            sql: "SELECT COALESCE(SUM(valor), 0) as total FROM contas_diarias WHERE strftime('%Y-%m', data) = ?",
            args: [mesAtual]
        });
        const totalDiarias = diariasResult.rows[0]?.total || 0;

        dashboard.totalGasto = totalFixas + totalSemanais + totalDiarias;
        dashboard.lucroLiquido = dashboard.totalArrecadado - dashboard.totalGasto;

        // Ranking de maiores gastos
        const rankingResult = await db.execute({
            sql: `SELECT nome, valor, 'fixa' as tipo FROM contas_fixas WHERE mes_referencia = ? AND ativo = 1
                  UNION ALL
                  SELECT nome, valor, 'diaria' as tipo FROM contas_diarias WHERE strftime('%Y-%m', data) = ?
                  ORDER BY valor DESC LIMIT 10`,
            args: [mesAtual, mesAtual]
        });
        const rows = rankingResult.rows || [];
        const semanaisDoMes = semanaisRows.filter(s => {
            return s.semana_referente && s.semana_referente.startsWith(anoAtual);
        }).map(s => ({ nome: s.nome, valor: parseFloat(s.valor || 0), tipo: 'semanal' }));
        
        const allRows = [...rows, ...semanaisDoMes].sort((a, b) => (b.valor || 0) - (a.valor || 0)).slice(0, 10);
        dashboard.rankingGastos = allRows;

        // Dados para gráficos (últimos 6 meses)
        const graficoArrecResult = await db.execute({
            sql: `SELECT strftime('%Y-%m', data) as mes, SUM(valor) as total 
                  FROM arrecadacao 
                  WHERE data >= date('now', '-6 months')
                  GROUP BY mes ORDER BY mes`,
            args: []
        });
        dashboard.graficoArrecadacao = graficoArrecResult.rows || [];

        // Gráfico de gastos
        const graficoGastosResult = await db.execute({
            sql: `SELECT 
                  strftime('%Y-%m', data) as mes,
                  (SELECT COALESCE(SUM(valor), 0) FROM contas_fixas WHERE mes_referencia = strftime('%Y-%m', data) AND ativo = 1) +
                  (SELECT COALESCE(SUM(valor), 0) FROM contas_diarias WHERE strftime('%Y-%m', data) = strftime('%Y-%m', data)) as total
                  FROM arrecadacao 
                  WHERE data >= date('now', '-6 months')
                  GROUP BY mes ORDER BY mes`,
            args: []
        });
        dashboard.graficoGastos = graficoGastosResult.rows || [];

        // Contas fixas vencendo (próximo mês)
        const proximoMes = new Date();
        proximoMes.setMonth(proximoMes.getMonth() + 1);
        const proximoMesStr = proximoMes.toISOString().slice(0, 7);

        const contasVencendoResult = await db.execute({
            sql: "SELECT * FROM contas_fixas WHERE mes_referencia = ? AND ativo = 1",
            args: [proximoMesStr]
        });
        dashboard.contasVencendo = contasVencendoResult.rows || [];

        res.json(dashboard);
    } catch (err) {
        console.error('Erro ao buscar dashboard:', err);
        res.status(500).json({ error: err.message });
    }
});

// ========== ROTAS DE BACKUP ==========
// Nota: Com Turso (banco na nuvem), backup não é necessário pois os dados já estão na nuvem
// Esta rota está mantida para compatibilidade, mas retorna uma mensagem informativa
app.get('/api/backup', authenticateToken, (req, res) => {
    res.json({ 
        message: 'Backup não necessário: dados já estão seguros no Turso (banco na nuvem)',
        info: 'O Turso mantém backups automáticos dos seus dados'
    });
});

// ========== ROTAS DE LOGS ==========
app.get('/api/logs', authenticateToken, async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        const result = await db.execute({
            sql: "SELECT * FROM logs ORDER BY created_at DESC LIMIT ?",
            args: [limit]
        });
        const rows = result.rows.map(row => ({
            id: row.id,
            usuario: row.usuario,
            acao: row.acao,
            tabela: row.tabela,
            registro_id: row.registro_id,
            dados_anteriores: row.dados_anteriores,
            dados_novos: row.dados_novos,
            created_at: row.created_at
        }));
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar logs:', err);
        res.status(500).json({ error: err.message });
    }
});

// ========== ROTA DE COMPARAÇÃO DE MESES ==========
app.get('/api/comparar-meses', authenticateToken, async (req, res) => {
    try {
        const { mes1, mes2 } = req.query;
        
        if (!mes1 || !mes2) {
            return res.status(400).json({ error: 'Dois meses devem ser fornecidos' });
        }

        // Função auxiliar para calcular totais de um mês
        async function calcularMes(mes) {
            const resultado = {};
            
            const arrecResult = await db.execute({
                sql: "SELECT COALESCE(SUM(valor), 0) as total FROM arrecadacao WHERE strftime('%Y-%m', data) = ?",
                args: [mes]
            });
            resultado.arrecadacao = arrecResult.rows[0]?.total || 0;

            const fixasResult = await db.execute({
                sql: "SELECT COALESCE(SUM(valor), 0) as total FROM contas_fixas WHERE mes_referencia = ? AND ativo = 1",
                args: [mes]
            });
            resultado.contasFixas = fixasResult.rows[0]?.total || 0;

            const diariasResult = await db.execute({
                sql: "SELECT COALESCE(SUM(valor), 0) as total FROM contas_diarias WHERE strftime('%Y-%m', data) = ?",
                args: [mes]
            });
            resultado.contasDiarias = diariasResult.rows[0]?.total || 0;
            resultado.totalGastos = resultado.contasFixas + resultado.contasDiarias;
            resultado.lucro = resultado.arrecadacao - resultado.totalGastos;
            
            return resultado;
        }

        const res1 = await calcularMes(mes1);
        const res2 = await calcularMes(mes2);

        const comparacao = {
            mes1: res1,
            mes2: res2,
            diferenca: {
                arrecadacao: res2.arrecadacao - res1.arrecadacao,
                gastos: res2.totalGastos - res1.totalGastos,
                lucro: res2.lucro - res1.lucro
            }
        };

        res.json(comparacao);
    } catch (err) {
        console.error('Erro ao comparar meses:', err);
        res.status(500).json({ error: err.message });
    }
});

// Rota raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
// Back4app requer que o servidor escute em 0.0.0.0 (todas as interfaces)
// Adicionar tratamento de erro
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`✅ Escutando em 0.0.0.0:${PORT}`);
    console.log(`✅ Aplicação pronta para receber requisições`);
    console.log('='.repeat(50));
});

server.on('error', (err) => {
    console.error('❌ Erro ao iniciar servidor:', err.message);
    if (err.code === 'EADDRINUSE') {
        console.error(`Porta ${PORT} já está em uso`);
    }
    process.exit(1);
});

// Fechar banco ao encerrar (Turso não precisa de close, mas mantemos para compatibilidade)
process.on('SIGINT', () => {
    console.log('Encerrando aplicação...');
    process.exit(0);
});

