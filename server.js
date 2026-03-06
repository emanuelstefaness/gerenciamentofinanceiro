const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
// Back4app define PORT automaticamente, usar 8080 como fallback
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// ---------- Banco de dados: Supabase (PostgreSQL), Turso ou SQLite local ----------
const databaseUrl = process.env.DATABASE_URL || '';
const useSupabase = /^postgres(ql)?:\/\//i.test(databaseUrl);
const useTurso = !useSupabase && process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN;
let db;

// Converte SQL SQLite para PostgreSQL (placeholders e strftime)
function sqlToPg(sql) {
    let s = sql.replace(/strftime\('%Y-%m',\s*([a-z_.]+)\)/gi, "to_char($1::date, 'YYYY-MM')");
    s = s.replace(/strftime\('%Y-W%W',\s*([a-z_.]+)\)/gi, "(to_char($1::date, 'IYYY') || '-W' || to_char($1::date, 'IW'))");
    let n = 0;
    return s.replace(/\?/g, () => '$' + (++n));
}

if (useSupabase) {
    const { Pool } = require('pg');
    const pgPool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });
    console.log('✅ Usando Supabase (PostgreSQL persistente na nuvem)');

    db = {
        run(sql, a, b) {
            const params = typeof a === 'function' ? [] : a;
            const callback = typeof a === 'function' ? a : b;
            let runSql = sqlToPg(sql);
            const isInsert = sql.trim().toUpperCase().startsWith('INSERT') && callback;
            if (isInsert && !runSql.toUpperCase().includes('RETURNING')) runSql = runSql.replace(/;\s*$/, '') + ' RETURNING id';
            pgPool.query(runSql, params).then((result) => {
                const lastID = (result.rows[0] && (result.rows[0].id != null)) ? Number(result.rows[0].id) : 0;
                if (callback) callback.call({ lastID }, null);
            }).catch((err) => {
                if (callback) callback(err);
            });
        },
        get(sql, a, b) {
            const params = typeof a === 'function' ? [] : a;
            const callback = typeof a === 'function' ? a : b;
            pgPool.query(sqlToPg(sql), params).then((result) => {
                if (callback) callback(null, result.rows[0] || undefined);
            }).catch((err) => {
                if (callback) callback(err);
            });
        },
        all(sql, a, b) {
            const params = typeof a === 'function' ? [] : a;
            const callback = typeof a === 'function' ? a : b;
            pgPool.query(sqlToPg(sql), params).then((result) => {
                if (callback) callback(null, result.rows || []);
            }).catch((err) => {
                if (callback) callback(err);
            });
        },
        serialize(callback) {
            callback();
        },
        close(callback) {
            pgPool.end().then(() => { if (callback) callback(); }).catch(() => { if (callback) callback(); });
        }
    };
    initializeDatabasePostgres(pgPool);
} else if (useTurso) {
    const { createClient } = require('@libsql/client');
    const tursoClient = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
    });
    console.log('✅ Usando Turso (banco persistente na nuvem)');

    db = {
        run(sql, a, b) {
            const params = typeof a === 'function' ? [] : a;
            const callback = typeof a === 'function' ? a : b;
            tursoClient.execute({ sql, args: params }).then((result) => {
                const lastID = result.lastInsertRowid != null ? Number(result.lastInsertRowid) : 0;
                if (callback) callback.call({ lastID }, null);
            }).catch((err) => {
                if (callback) callback(err);
            });
        },
        get(sql, a, b) {
            const params = typeof a === 'function' ? [] : a;
            const callback = typeof a === 'function' ? a : b;
            tursoClient.execute({ sql, args: params }).then((result) => {
                if (callback) callback(null, result.rows[0] || undefined);
            }).catch((err) => {
                if (callback) callback(err);
            });
        },
        all(sql, a, b) {
            const params = typeof a === 'function' ? [] : a;
            const callback = typeof a === 'function' ? a : b;
            tursoClient.execute({ sql, args: params }).then((result) => {
                if (callback) callback(null, result.rows || []);
            }).catch((err) => {
                if (callback) callback(err);
            });
        },
        serialize(callback) {
            callback();
        },
        close(callback) {
            if (tursoClient.close) tursoClient.close();
            if (callback) callback();
        }
    };
    initializeDatabase();
} else {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'restaurante.db');
    console.log('Tentando conectar ao banco de dados em:', dbPath);
    console.log('Diretório atual:', __dirname);
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ ERRO ao conectar ao banco de dados:', err.message);
            console.error('Caminho tentado:', dbPath);
        } else {
            console.log('✅ Conectado ao banco de dados SQLite em:', dbPath);
            initializeDatabase();
        }
    });
}

// Inicializar tabelas no PostgreSQL (Supabase)
function initializeDatabasePostgres(pool) {
    const run = (sql) => pool.query(sql).then(() => {}).catch((err) => console.error('Erro SQL:', err.message));
    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS arrecadacao (
            id SERIAL PRIMARY KEY,
            data DATE NOT NULL,
            valor REAL NOT NULL,
            observacoes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS contas_fixas (
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL,
            valor REAL NOT NULL,
            mes_referencia TEXT NOT NULL,
            recorrencia_mensal INTEGER DEFAULT 1,
            ativo INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS contas_semanais (
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL,
            valor REAL NOT NULL,
            semana_referente TEXT NOT NULL,
            descricao TEXT,
            recorrencia_semanal INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS contas_diarias (
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL,
            valor REAL NOT NULL,
            data DATE NOT NULL,
            descricao TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS logs (
            id SERIAL PRIMARY KEY,
            usuario TEXT,
            acao TEXT NOT NULL,
            tabela TEXT,
            registro_id INTEGER,
            dados_anteriores TEXT,
            dados_novos TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];
    console.log('Iniciando criação das tabelas (PostgreSQL)...');
    tables.reduce((p, sql) => p.then(() => run(sql)), Promise.resolve()).then(() => {
        console.log('✅ Tabelas PostgreSQL criadas/verificadas');
    });
}

// Inicializar tabelas (SQLite / Turso)
function initializeDatabase() {
    console.log('Iniciando criação das tabelas...');
    
    // Criar todas as tabelas de forma sequencial para garantir ordem
    db.serialize(() => {
        // Tabela de usuários (PRIMEIRA - mais importante)
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela users:', err.message);
            } else {
                console.log('✅ Tabela users criada/verificada');
            }
        });

        // Tabela de arrecadação diária
        db.run(`CREATE TABLE IF NOT EXISTS arrecadacao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data DATE NOT NULL,
            valor REAL NOT NULL,
            observacoes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela arrecadacao:', err.message);
            } else {
                console.log('✅ Tabela arrecadacao criada/verificada');
            }
        });

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
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela contas_fixas:', err.message);
            } else {
                console.log('✅ Tabela contas_fixas criada/verificada');
            }
        });

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
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela contas_semanais:', err.message);
            } else {
                console.log('✅ Tabela contas_semanais criada/verificada');
            }
        });

        // Tabela de contas diárias
        db.run(`CREATE TABLE IF NOT EXISTS contas_diarias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            valor REAL NOT NULL,
            data DATE NOT NULL,
            descricao TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela contas_diarias:', err.message);
            } else {
                console.log('✅ Tabela contas_diarias criada/verificada');
            }
        });

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
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela logs:', err.message);
            } else {
                console.log('✅ Tabela logs criada/verificada');
            }
        });

    });
    
    console.log('✅ Inicialização do banco de dados concluída');
}

// Função para criar log
function createLog(usuario, acao, tabela, registroId, dadosAnteriores, dadosNovos) {
    db.run(`INSERT INTO logs (usuario, acao, tabela, registro_id, dados_anteriores, dados_novos) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [usuario, acao, tabela, registroId, JSON.stringify(dadosAnteriores), JSON.stringify(dadosNovos)]);
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

// ========== ROTAS DE ARRECADAÇÃO ==========
app.get('/api/arrecadacao', (req, res) => {
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

app.post('/api/arrecadacao', (req, res) => {
    const { data, valor, observacoes } = req.body;

    db.run("INSERT INTO arrecadacao (data, valor, observacoes) VALUES (?, ?, ?)",
        [data, valor, observacoes || null], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog('sistema', 'CREATE', 'arrecadacao', this.lastID, null, req.body);
            res.json({ id: this.lastID, message: 'Arrecadação registrada com sucesso' });
        });
});

app.put('/api/arrecadacao/:id', (req, res) => {
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
                createLog('sistema', 'UPDATE', 'arrecadacao', id, oldRow, req.body);
                res.json({ message: 'Arrecadação atualizada com sucesso' });
            });
    });
});

app.delete('/api/arrecadacao/:id', (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM arrecadacao WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("DELETE FROM arrecadacao WHERE id = ?", [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog('sistema', 'DELETE', 'arrecadacao', id, row, null);
            res.json({ message: 'Arrecadação excluída com sucesso' });
        });
    });
});

// ========== ROTAS DE CONTAS FIXAS ==========
app.get('/api/contas-fixas', (req, res) => {
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

app.post('/api/contas-fixas', (req, res) => {
    const { nome, valor, mes_referencia, recorrencia_mensal } = req.body;

    db.run("INSERT INTO contas_fixas (nome, valor, mes_referencia, recorrencia_mensal) VALUES (?, ?, ?, ?)",
        [nome, valor, mes_referencia, recorrencia_mensal || 1], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog('sistema', 'CREATE', 'contas_fixas', this.lastID, null, req.body);
            res.json({ id: this.lastID, message: 'Conta fixa criada com sucesso' });
        });
});

app.put('/api/contas-fixas/:id', (req, res) => {
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
                createLog('sistema', 'UPDATE', 'contas_fixas', id, oldRow, req.body);
                res.json({ message: 'Conta fixa atualizada com sucesso' });
            });
    });
});

app.delete('/api/contas-fixas/:id', (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM contas_fixas WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("DELETE FROM contas_fixas WHERE id = ?", [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog('sistema', 'DELETE', 'contas_fixas', id, row, null);
            res.json({ message: 'Conta fixa excluída com sucesso' });
        });
    });
});

// ========== ROTAS DE CONTAS SEMANAIS ==========
app.get('/api/contas-semanais', (req, res) => {
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

app.post('/api/contas-semanais', (req, res) => {
    const { nome, valor, semana_referente, descricao, recorrencia_semanal } = req.body;

    db.run("INSERT INTO contas_semanais (nome, valor, semana_referente, descricao, recorrencia_semanal) VALUES (?, ?, ?, ?, ?)",
        [nome, valor, semana_referente, descricao || null, recorrencia_semanal || 0], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog('sistema', 'CREATE', 'contas_semanais', this.lastID, null, req.body);
            res.json({ id: this.lastID, message: 'Conta semanal criada com sucesso' });
        });
});

app.put('/api/contas-semanais/:id', (req, res) => {
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
                createLog('sistema', 'UPDATE', 'contas_semanais', id, oldRow, req.body);
                res.json({ message: 'Conta semanal atualizada com sucesso' });
            });
    });
});

app.delete('/api/contas-semanais/:id', (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM contas_semanais WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("DELETE FROM contas_semanais WHERE id = ?", [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog('sistema', 'DELETE', 'contas_semanais', id, row, null);
            res.json({ message: 'Conta semanal excluída com sucesso' });
        });
    });
});

// ========== ROTAS DE CONTAS DIÁRIAS ==========
app.get('/api/contas-diarias', (req, res) => {
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

app.post('/api/contas-diarias', (req, res) => {
    const { nome, valor, data, descricao } = req.body;

    db.run("INSERT INTO contas_diarias (nome, valor, data, descricao) VALUES (?, ?, ?, ?)",
        [nome, valor, data, descricao || null], function(err) {
            if (err) {
                console.error('Erro INSERT contas_diarias:', err.message);
                return res.status(500).json({ error: err.message });
            }
            if (useSupabase) console.log('Conta diária criada no Supabase, id:', this.lastID);
            createLog('sistema', 'CREATE', 'contas_diarias', this.lastID, null, req.body);
            res.json({ id: this.lastID, message: 'Conta diária criada com sucesso' });
        });
});

app.put('/api/contas-diarias/:id', (req, res) => {
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
                createLog('sistema', 'UPDATE', 'contas_diarias', id, oldRow, req.body);
                res.json({ message: 'Conta diária atualizada com sucesso' });
            });
    });
});

app.delete('/api/contas-diarias/:id', (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM contas_diarias WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("DELETE FROM contas_diarias WHERE id = ?", [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            createLog('sistema', 'DELETE', 'contas_diarias', id, row, null);
            res.json({ message: 'Conta diária excluída com sucesso' });
        });
    });
});

// ========== ROTAS DE RELATÓRIOS COMPLETOS ==========
app.get('/api/relatorios', async (req, res) => {
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
            arrecadacao: new Promise((resolve) => {
                let query = "SELECT * FROM arrecadacao WHERE data BETWEEN ? AND ?";
                const params = [periodoInicio, periodoFim];
                db.all(query, params, (err, rows) => {
                    resolve(rows || []);
                });
            }),
            fixas: new Promise((resolve) => {
                let query = "SELECT * FROM contas_fixas WHERE 1=1";
                const params = [];
                if (mes) {
                    query += " AND mes_referencia = ?";
                    params.push(mes);
                }
                if (nome) {
                    query += " AND nome LIKE ?";
                    params.push(`%${nome}%`);
                }
                if (!categoria || categoria === 'fixa') {
                    db.all(query, params, (err, rows) => {
                        resolve(rows || []);
                    });
                } else {
                    resolve([]);
                }
            }),
            semanais: new Promise((resolve) => {
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
                if (descricao) {
                    query += " AND descricao LIKE ?";
                    params.push(`%${descricao}%`);
                }
                if (!categoria || categoria === 'semanal') {
                    db.all(query, params, (err, rows) => {
                        resolve(rows || []);
                    });
                } else {
                    resolve([]);
                }
            }),
            diarias: new Promise((resolve) => {
                let query = "SELECT * FROM contas_diarias WHERE data BETWEEN ? AND ?";
                const params = [periodoInicio, periodoFim];
                if (nome) {
                    query += " AND nome LIKE ?";
                    params.push(`%${nome}%`);
                }
                if (descricao) {
                    query += " AND descricao LIKE ?";
                    params.push(`%${descricao}%`);
                }
                if (!categoria || categoria === 'diaria') {
                    db.all(query, params, (err, rows) => {
                        resolve(rows || []);
                    });
                } else {
                    resolve([]);
                }
            })
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
                valor: parseFloat(item.valor),
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
                valor: parseFloat(item.valor),
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
                valor: parseFloat(item.valor),
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
                valor: parseFloat(item.valor),
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
app.get('/api/dashboard', (req, res) => {
    const { mes } = req.query;
    const mesAtual = mes || new Date().toISOString().slice(0, 7);

    const dashboard = {};

    // Total arrecadado no mês
    db.get("SELECT COALESCE(SUM(valor), 0) as total FROM arrecadacao WHERE strftime('%Y-%m', data) = ?", [mesAtual], (err, row) => {
        if (err) {
            console.error('Erro dashboard arrecadacao:', err.message);
            return res.status(500).json({ error: 'Erro ao carregar dashboard', detalhe: err.message });
        }
        dashboard.totalArrecadado = (row && row.total != null) ? parseFloat(row.total) : 0;

        // Total gasto no mês (contas fixas + semanais + diárias)
        db.get(`SELECT COALESCE(SUM(valor), 0) as total FROM contas_fixas WHERE mes_referencia = ? AND ativo = 1`, [mesAtual], (err, row) => {
            if (err) {
                console.error('Erro dashboard fixas:', err.message);
                return res.status(500).json({ error: 'Erro ao carregar dashboard', detalhe: err.message });
            }
            const totalFixas = (row && row.total != null) ? parseFloat(row.total) : 0;

            // Para contas semanais, buscar todas e filtrar por mês no código
            // Formato semana_referente: YYYY-WW (ex: 2024-W15)
            db.all(`SELECT * FROM contas_semanais`, [], (err, semanaisRows) => {
                if (err) {
                    console.error('Erro dashboard semanais:', err.message);
                    return res.status(500).json({ error: 'Erro ao carregar dashboard', detalhe: err.message });
                }
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
                    if (err) {
                        console.error('Erro dashboard diarias:', err.message);
                        return res.status(500).json({ error: 'Erro ao carregar dashboard', detalhe: err.message });
                    }
                    const totalDiarias = (row && row.total != null) ? parseFloat(row.total) : 0;
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
app.get('/api/backup', (req, res) => {
    if (useTurso || useSupabase) {
        return res.json({
            message: 'Backup em arquivo não disponível com banco na nuvem. Os dados já estão persistidos.',
            cloud: true
        });
    }
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
app.get('/api/logs', (req, res) => {
    const { limit = 100 } = req.query;
    db.all("SELECT * FROM logs ORDER BY created_at DESC LIMIT ?", [limit], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// ========== ROTA DE COMPARAÇÃO DE MESES ==========
app.get('/api/comparar-meses', (req, res) => {
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

// Na Vercel não inicia o servidor; ela usa o export abaixo
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log('='.repeat(50));
        console.log(`✅ Servidor rodando na porta ${PORT}`);
        console.log(`✅ Acesse: http://localhost:${PORT}`);
        console.log('='.repeat(50));
    });
    process.on('SIGINT', () => {
        if (db && db.close) {
            db.close((err) => {
                if (err) console.error(err.message);
                console.log('Conexão com banco de dados fechada.');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });
}

module.exports = app;

