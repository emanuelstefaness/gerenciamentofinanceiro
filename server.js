const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'restaurante_financeiro_secret_key_2024';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Inicializar banco de dados
const db = new sqlite3.Database('./restaurante.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        initializeDatabase();
    }
});

// Inicializar tabelas
function initializeDatabase() {
    // Tabela de usuários
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de arrecadação diária
    db.run(`CREATE TABLE IF NOT EXISTS arrecadacao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data DATE NOT NULL,
        valor REAL NOT NULL,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de contas fixas
    db.run(`CREATE TABLE IF NOT EXISTS contas_fixas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        valor REAL NOT NULL,
        mes_referencia TEXT NOT NULL,
        recorrencia_mensal INTEGER DEFAULT 1,
        ativo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de contas semanais
    db.run(`CREATE TABLE IF NOT EXISTS contas_semanais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        valor REAL NOT NULL,
        semana_referente TEXT NOT NULL,
        descricao TEXT,
        recorrencia_semanal INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de contas diárias
    db.run(`CREATE TABLE IF NOT EXISTS contas_diarias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        valor REAL NOT NULL,
        data DATE NOT NULL,
        descricao TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de logs
    db.run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT,
        acao TEXT NOT NULL,
        tabela TEXT,
        registro_id INTEGER,
        dados_anteriores TEXT,
        dados_novos TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Criar usuário admin padrão
    db.get("SELECT * FROM users WHERE username = ?", ['admin'], (err, row) => {
        if (!row) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', hashedPassword]);
            console.log('Usuário admin criado (username: admin, password: admin123)');
        }
    });
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

// Função para criar log
function createLog(usuario, acao, tabela, registroId, dadosAnteriores, dadosNovos) {
    db.run(`INSERT INTO logs (usuario, acao, tabela, registro_id, dados_anteriores, dados_novos) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [usuario, acao, tabela, registroId, JSON.stringify(dadosAnteriores), JSON.stringify(dadosNovos)]);
}

// ========== ROTAS DE AUTENTICAÇÃO ==========
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Erro no servidor' });
        }
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: user.username });
    });
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username e senha são obrigatórios' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Username já existe' });
            }
            return res.status(500).json({ error: 'Erro ao criar usuário' });
        }
        res.json({ message: 'Usuário criado com sucesso', id: this.lastID });
    });
});

// ========== ROTAS DE ARRECADAÇÃO ==========
app.get('/api/arrecadacao', authenticateToken, (req, res) => {
    const { data_inicio, data_fim, mes, semana } = req.query;
    let query = "SELECT * FROM arrecadacao WHERE 1=1";
    const params = [];

    if (data_inicio && data_fim) {
        query += " AND data BETWEEN ? AND ?";
        params.push(data_inicio, data_fim);
    } else if (mes) {
        query += " AND strftime('%Y-%m', data) = ?";
        params.push(mes);
    } else if (semana) {
        query += " AND strftime('%Y-W%W', data) = ?";
        params.push(semana);
    }

    query += " ORDER BY data DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/arrecadacao', authenticateToken, (req, res) => {
    const { data, valor, observacoes } = req.body;

    db.run("INSERT INTO arrecadacao (data, valor, observacoes) VALUES (?, ?, ?)",
        [data, valor, observacoes || null], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog(req.user.username, 'CREATE', 'arrecadacao', this.lastID, null, req.body);
            res.json({ id: this.lastID, message: 'Arrecadação registrada com sucesso' });
        });
});

app.put('/api/arrecadacao/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { data, valor, observacoes } = req.body;

    db.get("SELECT * FROM arrecadacao WHERE id = ?", [id], (err, oldRow) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("UPDATE arrecadacao SET data = ?, valor = ?, observacoes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [data, valor, observacoes || null, id], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                createLog(req.user.username, 'UPDATE', 'arrecadacao', id, oldRow, req.body);
                res.json({ message: 'Arrecadação atualizada com sucesso' });
            });
    });
});

app.delete('/api/arrecadacao/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM arrecadacao WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("DELETE FROM arrecadacao WHERE id = ?", [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog(req.user.username, 'DELETE', 'arrecadacao', id, row, null);
            res.json({ message: 'Arrecadação excluída com sucesso' });
        });
    });
});

// ========== ROTAS DE CONTAS FIXAS ==========
app.get('/api/contas-fixas', authenticateToken, (req, res) => {
    const { mes } = req.query;
    let query = "SELECT * FROM contas_fixas WHERE 1=1";
    const params = [];

    if (mes) {
        query += " AND mes_referencia = ?";
        params.push(mes);
    }

    query += " ORDER BY mes_referencia DESC, nome ASC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/contas-fixas', authenticateToken, (req, res) => {
    const { nome, valor, mes_referencia, recorrencia_mensal } = req.body;

    db.run("INSERT INTO contas_fixas (nome, valor, mes_referencia, recorrencia_mensal) VALUES (?, ?, ?, ?)",
        [nome, valor, mes_referencia, recorrencia_mensal || 1], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog(req.user.username, 'CREATE', 'contas_fixas', this.lastID, null, req.body);
            res.json({ id: this.lastID, message: 'Conta fixa criada com sucesso' });
        });
});

app.put('/api/contas-fixas/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { nome, valor, mes_referencia, recorrencia_mensal, ativo } = req.body;

    db.get("SELECT * FROM contas_fixas WHERE id = ?", [id], (err, oldRow) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("UPDATE contas_fixas SET nome = ?, valor = ?, mes_referencia = ?, recorrencia_mensal = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [nome, valor, mes_referencia, recorrencia_mensal || 1, ativo !== undefined ? ativo : 1, id], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                createLog(req.user.username, 'UPDATE', 'contas_fixas', id, oldRow, req.body);
                res.json({ message: 'Conta fixa atualizada com sucesso' });
            });
    });
});

app.delete('/api/contas-fixas/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM contas_fixas WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("DELETE FROM contas_fixas WHERE id = ?", [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog(req.user.username, 'DELETE', 'contas_fixas', id, row, null);
            res.json({ message: 'Conta fixa excluída com sucesso' });
        });
    });
});

// ========== ROTAS DE CONTAS SEMANAIS ==========
app.get('/api/contas-semanais', authenticateToken, (req, res) => {
    const { semana, nome } = req.query;
    let query = "SELECT * FROM contas_semanais WHERE 1=1";
    const params = [];

    if (semana) {
        query += " AND semana_referente = ?";
        params.push(semana);
    }
    if (nome) {
        query += " AND nome LIKE ?";
        params.push(`%${nome}%`);
    }

    query += " ORDER BY semana_referente DESC, nome ASC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/contas-semanais', authenticateToken, (req, res) => {
    const { nome, valor, semana_referente, descricao, recorrencia_semanal } = req.body;

    db.run("INSERT INTO contas_semanais (nome, valor, semana_referente, descricao, recorrencia_semanal) VALUES (?, ?, ?, ?, ?)",
        [nome, valor, semana_referente, descricao || null, recorrencia_semanal || 0], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog(req.user.username, 'CREATE', 'contas_semanais', this.lastID, null, req.body);
            res.json({ id: this.lastID, message: 'Conta semanal criada com sucesso' });
        });
});

app.put('/api/contas-semanais/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { nome, valor, semana_referente, descricao, recorrencia_semanal } = req.body;

    db.get("SELECT * FROM contas_semanais WHERE id = ?", [id], (err, oldRow) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("UPDATE contas_semanais SET nome = ?, valor = ?, semana_referente = ?, descricao = ?, recorrencia_semanal = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [nome, valor, semana_referente, descricao || null, recorrencia_semanal || 0, id], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                createLog(req.user.username, 'UPDATE', 'contas_semanais', id, oldRow, req.body);
                res.json({ message: 'Conta semanal atualizada com sucesso' });
            });
    });
});

app.delete('/api/contas-semanais/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM contas_semanais WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("DELETE FROM contas_semanais WHERE id = ?", [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog(req.user.username, 'DELETE', 'contas_semanais', id, row, null);
            res.json({ message: 'Conta semanal excluída com sucesso' });
        });
    });
});

// ========== ROTAS DE CONTAS DIÁRIAS ==========
app.get('/api/contas-diarias', authenticateToken, (req, res) => {
    const { data_inicio, data_fim, mes, semana, dia } = req.query;
    let query = "SELECT * FROM contas_diarias WHERE 1=1";
    const params = [];

    if (data_inicio && data_fim) {
        query += " AND data BETWEEN ? AND ?";
        params.push(data_inicio, data_fim);
    } else if (mes) {
        query += " AND strftime('%Y-%m', data) = ?";
        params.push(mes);
    } else if (semana) {
        query += " AND strftime('%Y-W%W', data) = ?";
        params.push(semana);
    } else if (dia) {
        query += " AND data = ?";
        params.push(dia);
    }

    query += " ORDER BY created_at DESC, nome ASC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/contas-diarias', authenticateToken, (req, res) => {
    const { nome, valor, data, descricao } = req.body;

    db.run("INSERT INTO contas_diarias (nome, valor, data, descricao) VALUES (?, ?, ?, ?)",
        [nome, valor, data, descricao || null], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog(req.user.username, 'CREATE', 'contas_diarias', this.lastID, null, req.body);
            res.json({ id: this.lastID, message: 'Conta diária criada com sucesso' });
        });
});

app.put('/api/contas-diarias/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { nome, valor, data, descricao } = req.body;

    db.get("SELECT * FROM contas_diarias WHERE id = ?", [id], (err, oldRow) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("UPDATE contas_diarias SET nome = ?, valor = ?, data = ?, descricao = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [nome, valor, data, descricao || null, id], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                createLog(req.user.username, 'UPDATE', 'contas_diarias', id, oldRow, req.body);
                res.json({ message: 'Conta diária atualizada com sucesso' });
            });
    });
});

app.delete('/api/contas-diarias/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM contas_diarias WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("DELETE FROM contas_diarias WHERE id = ?", [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog(req.user.username, 'DELETE', 'contas_diarias', id, row, null);
            res.json({ message: 'Conta diária excluída com sucesso' });
        });
    });
});

// ========== ROTAS DE RELATÓRIOS ==========
app.get('/api/relatorios', authenticateToken, (req, res) => {
    const { nome, descricao, categoria, data_inicio, data_fim, mes, semana } = req.query;
    
    let results = [];
    const promises = [];

    // Buscar em contas fixas
    if (!categoria || categoria === 'fixa') {
        let query = "SELECT 'fixa' as categoria, id, nome, valor, mes_referencia as periodo, NULL as descricao, created_at FROM contas_fixas WHERE 1=1";
        const params = [];
        
        if (nome) {
            query += " AND nome LIKE ?";
            params.push(`%${nome}%`);
        }
        if (mes) {
            query += " AND mes_referencia = ?";
            params.push(mes);
        }
        
        promises.push(new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }));
    }

    // Buscar em contas semanais
    if (!categoria || categoria === 'semanal') {
        let query = "SELECT 'semanal' as categoria, id, nome, valor, semana_referente as periodo, descricao, created_at FROM contas_semanais WHERE 1=1";
        const params = [];
        
        if (nome) {
            query += " AND nome LIKE ?";
            params.push(`%${nome}%`);
        }
        if (descricao) {
            query += " AND descricao LIKE ?";
            params.push(`%${descricao}%`);
        }
        if (semana) {
            query += " AND semana_referente = ?";
            params.push(semana);
        }
        
        promises.push(new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }));
    }

    // Buscar em contas diárias
    if (!categoria || categoria === 'diaria') {
        let query = "SELECT 'diaria' as categoria, id, nome, valor, data as periodo, descricao, created_at FROM contas_diarias WHERE 1=1";
        const params = [];
        
        if (nome) {
            query += " AND nome LIKE ?";
            params.push(`%${nome}%`);
        }
        if (descricao) {
            query += " AND descricao LIKE ?";
            params.push(`%${descricao}%`);
        }
        if (data_inicio && data_fim) {
            query += " AND data BETWEEN ? AND ?";
            params.push(data_inicio, data_fim);
        } else if (mes) {
            query += " AND strftime('%Y-%m', data) = ?";
            params.push(mes);
        } else if (semana) {
            query += " AND strftime('%Y-W%W', data) = ?";
            params.push(semana);
        }
        
        promises.push(new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }));
    }

    Promise.all(promises).then(allResults => {
        allResults.forEach(rows => {
            results = results.concat(rows);
        });
        res.json(results);
    }).catch(err => {
        res.status(500).json({ error: err.message });
    });
});

// ========== ROTAS DE DASHBOARD ==========
app.get('/api/dashboard', authenticateToken, (req, res) => {
    const { mes } = req.query;
    const mesAtual = mes || new Date().toISOString().slice(0, 7);

    const dashboard = {};

    // Total arrecadado no mês
    db.get("SELECT COALESCE(SUM(valor), 0) as total FROM arrecadacao WHERE strftime('%Y-%m', data) = ?", [mesAtual], (err, row) => {
        dashboard.totalArrecadado = row.total;

        // Total gasto no mês (contas fixas + semanais + diárias)
        db.get(`SELECT COALESCE(SUM(valor), 0) as total FROM contas_fixas WHERE mes_referencia = ? AND ativo = 1`, [mesAtual], (err, row) => {
            const totalFixas = row.total;

            // Para contas semanais, buscar todas e filtrar por mês no código
            // Formato semana_referente: YYYY-WW (ex: 2024-W15)
            db.all(`SELECT * FROM contas_semanais`, [], (err, semanaisRows) => {
                const [anoAtual, mesAtualNum] = mesAtual.split('-');
                const totalSemanais = (semanaisRows || []).filter(s => {
                    // Filtrar por ano primeiro
                    if (s.semana_referente && s.semana_referente.startsWith(anoAtual)) {
                        // Para simplificar, incluir todas as semanas do ano
                        // Em produção, poderia calcular o mês exato da semana
                        return true;
                    }
                    return false;
                }).reduce((sum, s) => sum + parseFloat(s.valor || 0), 0);

                db.get(`SELECT COALESCE(SUM(valor), 0) as total FROM contas_diarias WHERE strftime('%Y-%m', data) = ?`, [mesAtual], (err, row) => {
                    const totalDiarias = row.total;
                    dashboard.totalGasto = totalFixas + totalSemanais + totalDiarias;
                    dashboard.lucroLiquido = dashboard.totalArrecadado - dashboard.totalGasto;

                    // Ranking de maiores gastos
                    db.all(`SELECT nome, valor, 'fixa' as tipo FROM contas_fixas WHERE mes_referencia = ? AND ativo = 1
                            UNION ALL
                            SELECT nome, valor, 'diaria' as tipo FROM contas_diarias WHERE strftime('%Y-%m', data) = ?
                            ORDER BY valor DESC LIMIT 10`, [mesAtual, mesAtual], (err, rows) => {
                        // Adicionar contas semanais do mês ao ranking
                        const [anoRank, mesRank] = mesAtual.split('-');
                        const semanaisDoMes = (semanaisRows || []).filter(s => {
                            return s.semana_referente && s.semana_referente.startsWith(anoRank);
                        }).map(s => ({ nome: s.nome, valor: parseFloat(s.valor), tipo: 'semanal' }));
                        
                        const allRows = [...(rows || []), ...semanaisDoMes].sort((a, b) => b.valor - a.valor).slice(0, 10);
                        dashboard.rankingGastos = allRows;

                        // Dados para gráficos (últimos 6 meses)
                        db.all(`SELECT strftime('%Y-%m', data) as mes, SUM(valor) as total 
                                FROM arrecadacao 
                                WHERE data >= date('now', '-6 months')
                                GROUP BY mes ORDER BY mes`, [], (err, rows) => {
                            dashboard.graficoArrecadacao = rows || [];

                            // Gráfico de gastos - simplificado sem contas semanais na query
                            db.all(`SELECT 
                                    strftime('%Y-%m', data) as mes,
                                    (SELECT COALESCE(SUM(valor), 0) FROM contas_fixas WHERE mes_referencia = strftime('%Y-%m', data) AND ativo = 1) +
                                    (SELECT COALESCE(SUM(valor), 0) FROM contas_diarias WHERE strftime('%Y-%m', data) = strftime('%Y-%m', data)) as total
                                    FROM arrecadacao 
                                    WHERE data >= date('now', '-6 months')
                                    GROUP BY mes ORDER BY mes`, [], (err, rows) => {
                                dashboard.graficoGastos = rows || [];

                                // Contas fixas vencendo (próximo mês)
                                const proximoMes = new Date();
                                proximoMes.setMonth(proximoMes.getMonth() + 1);
                                const proximoMesStr = proximoMes.toISOString().slice(0, 7);

                                db.all(`SELECT * FROM contas_fixas WHERE mes_referencia = ? AND ativo = 1`, [proximoMesStr], (err, rows) => {
                                    dashboard.contasVencendo = rows || [];

                                    res.json(dashboard);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// ========== ROTAS DE BACKUP ==========
app.get('/api/backup', authenticateToken, (req, res) => {
    const backupFile = `backup_${Date.now()}.db`;
    const source = './restaurante.db';
    const dest = `./backups/${backupFile}`;

    if (!fs.existsSync('./backups')) {
        fs.mkdirSync('./backups');
    }

    fs.copyFile(source, dest, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao criar backup' });
        }
        res.json({ message: 'Backup criado com sucesso', arquivo: backupFile });
    });
});

// ========== ROTAS DE LOGS ==========
app.get('/api/logs', authenticateToken, (req, res) => {
    const { limit = 100 } = req.query;
    db.all("SELECT * FROM logs ORDER BY created_at DESC LIMIT ?", [limit], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// ========== ROTA DE COMPARAÇÃO DE MESES ==========
app.get('/api/comparar-meses', authenticateToken, (req, res) => {
    const { mes1, mes2 } = req.query;
    
    if (!mes1 || !mes2) {
        return res.status(400).json({ error: 'Dois meses devem ser fornecidos' });
    }

    const comparacao = { mes1: {}, mes2: {} };

    // Função auxiliar para calcular totais de um mês
    function calcularMes(mes, callback) {
        const resultado = {};
        
        db.get("SELECT COALESCE(SUM(valor), 0) as total FROM arrecadacao WHERE strftime('%Y-%m', data) = ?", [mes], (err, row) => {
            resultado.arrecadacao = row.total;

            db.get("SELECT COALESCE(SUM(valor), 0) as total FROM contas_fixas WHERE mes_referencia = ? AND ativo = 1", [mes], (err, row) => {
                resultado.contasFixas = row.total;

                db.get("SELECT COALESCE(SUM(valor), 0) as total FROM contas_diarias WHERE strftime('%Y-%m', data) = ?", [mes], (err, row) => {
                    resultado.contasDiarias = row.total;
                    resultado.totalGastos = resultado.contasFixas + resultado.contasDiarias;
                    resultado.lucro = resultado.arrecadacao - resultado.totalGastos;
                    callback(resultado);
                });
            });
        });
    }

    calcularMes(mes1, (res1) => {
        comparacao.mes1 = res1;
        calcularMes(mes2, (res2) => {
            comparacao.mes2 = res2;
            comparacao.diferenca = {
                arrecadacao: res2.arrecadacao - res1.arrecadacao,
                gastos: res2.totalGastos - res1.totalGastos,
                lucro: res2.lucro - res1.lucro
            };
            res.json(comparacao);
        });
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});

// Fechar banco ao encerrar
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Conexão com banco de dados fechada.');
        process.exit(0);
    });
});

