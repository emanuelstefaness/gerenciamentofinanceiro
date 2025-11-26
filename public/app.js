// Configuração da API
const API_BASE = (window.location.origin || 'http://localhost:3000') + '/api';
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('username');
let charts = {};

// Detectar se é mobile
function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Verificar autenticação ao carregar
window.addEventListener('DOMContentLoaded', () => {
    if (token) {
        showMainApp();
    } else {
        showLogin();
    }
    
    // Configurar tema
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeButton(theme);
    
    setupEventListeners();
    
    // Se for mobile, mostrar interface simplificada
    if (isMobile() && token) {
        showMobileQuickAdd();
    }
});

// Detectar mudança de tamanho da tela
window.addEventListener('resize', () => {
    if (isMobile() && token && document.getElementById('mainApp').style.display !== 'none') {
        showMobileQuickAdd();
    } else if (!isMobile()) {
        document.getElementById('mobileQuickAdd').style.display = 'none';
        document.getElementById('mobileMenu').style.display = 'none';
    }
});

// Event Listeners
function setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Navegação
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            showPage(page);
        });
    });
    
    // Toggle Theme
    document.getElementById('toggleTheme').addEventListener('click', toggleTheme);
    
    // Forms
    document.getElementById('arrecadacaoForm').addEventListener('submit', handleArrecadacaoSubmit);
    document.getElementById('contaFixaForm').addEventListener('submit', handleContaFixaSubmit);
    document.getElementById('contaSemanalForm').addEventListener('submit', handleContaSemanalSubmit);
    document.getElementById('contaDiariaForm').addEventListener('submit', handleContaDiariaSubmit);
    
    // Mobile Quick Form
    const mobileQuickForm = document.getElementById('mobileQuickForm');
    if (mobileQuickForm) {
        mobileQuickForm.addEventListener('submit', handleMobileQuickSubmit);
    }
    
    // Mobile Menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('show');
            mobileMenu.style.display = 'block';
        });
    }
    
    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', () => {
            mobileMenu.classList.remove('show');
            setTimeout(() => mobileMenu.style.display = 'none', 300);
        });
    }
    
    // Mobile Menu Items
    document.querySelectorAll('.mobile-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            if (page === 'mobile-quick') {
                showMobileQuickAdd();
            } else {
                hideMobileQuickAdd();
                showPage(page);
            }
            // Atualizar item ativo
            document.querySelectorAll('.mobile-menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            mobileMenu.classList.remove('show');
            setTimeout(() => mobileMenu.style.display = 'none', 300);
        });
    });
    
    // Mobile Logout
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', handleLogout);
    }
    
    // Dashboard month selector
    document.getElementById('dashboardMonth').addEventListener('change', loadDashboard);
}

// Autenticação
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.token;
            currentUser = data.username;
            localStorage.setItem('token', token);
            localStorage.setItem('username', currentUser);
            showMainApp();
        } else {
            errorMsg.textContent = data.error || 'Erro ao fazer login';
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        errorMsg.textContent = 'Erro de conexão';
        errorMsg.style.display = 'block';
    }
}

function handleLogout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    showLogin();
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    document.getElementById('currentUser').querySelector('span').textContent = currentUser;
    
    // Se for mobile, mostrar interface simplificada primeiro
    if (isMobile()) {
        showMobileQuickAdd();
    } else {
        showPage('dashboard');
    }
}

// Mostrar interface mobile simplificada
function showMobileQuickAdd() {
    document.getElementById('mobileQuickAdd').style.display = 'block';
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.mobile-menu-item').forEach(item => {
        if (item.getAttribute('data-page') === 'mobile-quick') {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    loadMobileRecentGastos();
    // Focar no primeiro campo
    setTimeout(() => {
        const nomeInput = document.getElementById('mobileNome');
        if (nomeInput) nomeInput.focus();
    }, 100);
}

// Esconder interface mobile
function hideMobileQuickAdd() {
    document.getElementById('mobileQuickAdd').style.display = 'none';
}

// Navegação
function showPage(pageName) {
    // Se for mobile e não for a página mobile-quick, esconder interface mobile
    if (isMobile() && pageName !== 'mobile-quick') {
        hideMobileQuickAdd();
    }
    
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.mobile-menu-item').forEach(item => item.classList.remove('active'));
    
    if (pageName !== 'mobile-quick') {
        document.getElementById(pageName).classList.add('active');
        const navItem = document.querySelector(`[data-page="${pageName}"]`);
        if (navItem) navItem.classList.add('active');
    }
    
    // Carregar dados da página
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'arrecadacao':
            loadArrecadacao();
            break;
        case 'gastos':
            loadGastos();
            break;
        case 'contas-fixas':
            loadContasFixas();
            break;
        case 'contas-semanais':
            loadContasSemanais();
            break;
        case 'contas-diarias':
            loadContasDiarias();
            break;
        case 'relatorios':
            // Não carregar automaticamente
            break;
        case 'configuracoes':
            loadLogs();
            break;
    }
}

// Tema
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButton(newTheme);
}

function updateThemeButton(theme) {
    const btn = document.getElementById('toggleTheme');
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// Função auxiliar para fazer requisições autenticadas
async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });
    
    if (response.status === 401) {
        handleLogout();
        throw new Error('Não autenticado');
    }
    
    return response;
}

// Dashboard
async function loadDashboard() {
    const mes = document.getElementById('dashboardMonth').value || new Date().toISOString().slice(0, 7);
    
    try {
        const response = await apiRequest(`/dashboard?mes=${mes}`);
        const data = await response.json();
        
        document.getElementById('totalArrecadado').textContent = formatCurrency(data.totalArrecadado);
        document.getElementById('totalGasto').textContent = formatCurrency(data.totalGasto);
        document.getElementById('lucroLiquido').textContent = formatCurrency(data.lucroLiquido);
        
        // Atualizar classe do lucro
        const lucroEl = document.getElementById('lucroLiquido');
        lucroEl.classList.remove('negative');
        if (data.lucroLiquido < 0) {
            lucroEl.classList.add('negative');
        }
        
        // Gráfico de arrecadação
        updateChart('chartArrecadacao', {
            labels: data.graficoArrecadacao.map(d => d.mes),
            data: data.graficoArrecadacao.map(d => parseFloat(d.total)),
            label: 'Arrecadação',
            color: '#10b981'
        });
        
        // Gráfico de gastos
        updateChart('chartGastos', {
            labels: data.graficoGastos.map(d => d.mes),
            data: data.graficoGastos.map(d => parseFloat(d.total)),
            label: 'Gastos',
            color: '#ef4444'
        });
        
        // Ranking
        const rankingTbody = document.querySelector('#rankingTable tbody');
        rankingTbody.innerHTML = data.rankingGastos.map(item => `
            <tr>
                <td>${item.nome}</td>
                <td>${formatCurrency(item.valor)}</td>
                <td>${item.tipo}</td>
            </tr>
        `).join('');
        
        // Contas vencendo
        const contasTbody = document.querySelector('#contasVencendoTable tbody');
        if (data.contasVencendo.length === 0) {
            contasTbody.innerHTML = '<tr><td colspan="3">Nenhuma conta vencendo</td></tr>';
        } else {
            contasTbody.innerHTML = data.contasVencendo.map(item => `
                <tr>
                    <td>${item.nome}</td>
                    <td>${formatCurrency(item.valor)}</td>
                    <td>${item.mes_referencia}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

// Gráficos
function updateChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: config.labels,
            datasets: [{
                label: config.label,
                data: config.data,
                borderColor: config.color,
                backgroundColor: config.color + '20',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// Arrecadação
async function loadArrecadacao() {
    try {
        const response = await apiRequest('/arrecadacao');
        const data = await response.json();
        
        const tbody = document.querySelector('#arrecadacaoTable tbody');
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${formatDate(item.data)}</td>
                <td>${formatCurrency(item.valor)}</td>
                <td>${item.observacoes || '-'}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editArrecadacao(${item.id})">Editar</button>
                    <button class="btn btn-danger" onclick="deleteArrecadacao(${item.id})">Excluir</button>
                </td>
            </tr>
        `).join('');
        
        const total = data.reduce((sum, item) => sum + parseFloat(item.valor), 0);
        document.getElementById('totalArrecadacaoList').textContent = formatCurrency(total);
        
        // Gráfico
        updateChart('chartArrecadacaoDetalhado', {
            labels: data.map(d => formatDate(d.data)),
            data: data.map(d => parseFloat(d.valor)),
            label: 'Arrecadação Diária',
            color: '#10b981'
        });
    } catch (error) {
        console.error('Erro ao carregar arrecadação:', error);
    }
}

function openArrecadacaoModal(id = null) {
    const modal = document.getElementById('arrecadacaoModal');
    const form = document.getElementById('arrecadacaoForm');
    form.reset();
    document.getElementById('arrecadacaoId').value = id || '';
    
    if (id) {
        // Carregar dados para edição
        apiRequest(`/arrecadacao`).then(r => r.json()).then(data => {
            const item = data.find(i => i.id === id);
            if (item) {
                document.getElementById('arrecadacaoData').value = item.data;
                document.getElementById('arrecadacaoValor').value = item.valor;
                document.getElementById('arrecadacaoObservacoes').value = item.observacoes || '';
            }
        });
    } else {
        document.getElementById('arrecadacaoData').value = new Date().toISOString().slice(0, 10);
    }
    
    modal.style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function handleArrecadacaoSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('arrecadacaoId').value;
    const data = {
        data: document.getElementById('arrecadacaoData').value,
        valor: parseFloat(document.getElementById('arrecadacaoValor').value),
        observacoes: document.getElementById('arrecadacaoObservacoes').value
    };
    
    try {
        const url = id ? `/arrecadacao/${id}` : '/arrecadacao';
        const method = id ? 'PUT' : 'POST';
        
        const response = await apiRequest(url, {
            method,
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeModal('arrecadacaoModal');
            loadArrecadacao();
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboard();
            }
        }
    } catch (error) {
        console.error('Erro ao salvar arrecadação:', error);
        alert('Erro ao salvar arrecadação');
    }
}

async function editArrecadacao(id) {
    openArrecadacaoModal(id);
}

async function deleteArrecadacao(id) {
    if (!confirm('Tem certeza que deseja excluir esta arrecadação?')) return;
    
    try {
        const response = await apiRequest(`/arrecadacao/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadArrecadacao();
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboard();
            }
        }
    } catch (error) {
        console.error('Erro ao excluir arrecadação:', error);
        alert('Erro ao excluir arrecadação');
    }
}

function filterArrecadacao() {
    const dataInicio = document.getElementById('arrecadacaoDataInicio').value;
    const dataFim = document.getElementById('arrecadacaoDataFim').value;
    const mes = document.getElementById('arrecadacaoMes').value;
    
    let url = '/arrecadacao?';
    if (dataInicio && dataFim) {
        url += `data_inicio=${dataInicio}&data_fim=${dataFim}`;
    } else if (mes) {
        url += `mes=${mes}`;
    }
    
    apiRequest(url).then(r => r.json()).then(data => {
        const tbody = document.querySelector('#arrecadacaoTable tbody');
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${formatDate(item.data)}</td>
                <td>${formatCurrency(item.valor)}</td>
                <td>${item.observacoes || '-'}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editArrecadacao(${item.id})">Editar</button>
                    <button class="btn btn-danger" onclick="deleteArrecadacao(${item.id})">Excluir</button>
                </td>
            </tr>
        `).join('');
        
        const total = data.reduce((sum, item) => sum + parseFloat(item.valor), 0);
        document.getElementById('totalArrecadacaoList').textContent = formatCurrency(total);
    });
}

function clearArrecadacaoFilters() {
    document.getElementById('arrecadacaoDataInicio').value = '';
    document.getElementById('arrecadacaoDataFim').value = '';
    document.getElementById('arrecadacaoMes').value = '';
    loadArrecadacao();
}

// Gastos
async function loadGastos() {
    const mes = new Date().toISOString().slice(0, 7);
    
    try {
        // Contas fixas
        const fixasResponse = await apiRequest(`/contas-fixas?mes=${mes}`);
        const fixas = await fixasResponse.json();
        const totalFixas = fixas.reduce((sum, item) => sum + parseFloat(item.valor), 0);
        document.getElementById('totalFixas').textContent = formatCurrency(totalFixas);
        
        // Contas semanais
        const semanaisResponse = await apiRequest(`/contas-semanais`);
        const semanais = await semanaisResponse.json();
        const totalSemanais = semanais.filter(s => {
            const semanaMes = new Date(s.semana_referente + '-01').toISOString().slice(0, 7);
            return semanaMes === mes;
        }).reduce((sum, item) => sum + parseFloat(item.valor), 0);
        document.getElementById('totalSemanais').textContent = formatCurrency(totalSemanais);
        
        // Contas diárias
        const diariasResponse = await apiRequest(`/contas-diarias?mes=${mes}`);
        const diarias = await diariasResponse.json();
        const totalDiarias = diarias.reduce((sum, item) => sum + parseFloat(item.valor), 0);
        document.getElementById('totalDiarias').textContent = formatCurrency(totalDiarias);
    } catch (error) {
        console.error('Erro ao carregar gastos:', error);
    }
}

// Contas Fixas
async function loadContasFixas() {
    const mes = document.getElementById('fixasMes').value || new Date().toISOString().slice(0, 7);
    
    try {
        const response = await apiRequest(`/contas-fixas?mes=${mes}`);
        const data = await response.json();
        
        const tbody = document.querySelector('#fixasTable tbody');
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.nome}</td>
                <td>${formatCurrency(item.valor)}</td>
                <td>${item.mes_referencia}</td>
                <td>${item.recorrencia_mensal ? 'Sim' : 'Não'}</td>
                <td>${item.ativo ? 'Ativa' : 'Inativa'}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editContaFixa(${item.id})">Editar</button>
                    <button class="btn btn-danger" onclick="deleteContaFixa(${item.id})">Excluir</button>
                </td>
            </tr>
        `).join('');
        
        const total = data.filter(item => item.ativo).reduce((sum, item) => sum + parseFloat(item.valor), 0);
        document.getElementById('totalFixasList').textContent = formatCurrency(total);
    } catch (error) {
        console.error('Erro ao carregar contas fixas:', error);
    }
}

document.getElementById('fixasMes').addEventListener('change', loadContasFixas);

function openContaFixaModal(id = null) {
    const modal = document.getElementById('contaFixaModal');
    const form = document.getElementById('contaFixaForm');
    form.reset();
    document.getElementById('contaFixaId').value = id || '';
    
    if (id) {
        apiRequest(`/contas-fixas`).then(r => r.json()).then(data => {
            const item = data.find(i => i.id === id);
            if (item) {
                document.getElementById('contaFixaNome').value = item.nome;
                document.getElementById('contaFixaValor').value = item.valor;
                document.getElementById('contaFixaMes').value = item.mes_referencia;
                document.getElementById('contaFixaRecorrencia').value = item.recorrencia_mensal;
            }
        });
    } else {
        document.getElementById('contaFixaMes').value = new Date().toISOString().slice(0, 7);
    }
    
    modal.style.display = 'block';
}

async function handleContaFixaSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('contaFixaId').value;
    const data = {
        nome: document.getElementById('contaFixaNome').value,
        valor: parseFloat(document.getElementById('contaFixaValor').value),
        mes_referencia: document.getElementById('contaFixaMes').value,
        recorrencia_mensal: parseInt(document.getElementById('contaFixaRecorrencia').value)
    };
    
    try {
        const url = id ? `/contas-fixas/${id}` : '/contas-fixas';
        const method = id ? 'PUT' : 'POST';
        
        const response = await apiRequest(url, {
            method,
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeModal('contaFixaModal');
            loadContasFixas();
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboard();
            }
        }
    } catch (error) {
        console.error('Erro ao salvar conta fixa:', error);
        alert('Erro ao salvar conta fixa');
    }
}

async function editContaFixa(id) {
    openContaFixaModal(id);
}

async function deleteContaFixa(id) {
    if (!confirm('Tem certeza que deseja excluir esta conta fixa?')) return;
    
    try {
        const response = await apiRequest(`/contas-fixas/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadContasFixas();
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboard();
            }
        }
    } catch (error) {
        console.error('Erro ao excluir conta fixa:', error);
        alert('Erro ao excluir conta fixa');
    }
}

// Contas Semanais
async function loadContasSemanais() {
    try {
        const response = await apiRequest('/contas-semanais');
        const data = await response.json();
        
        const tbody = document.querySelector('#semanaisTable tbody');
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.nome}</td>
                <td>${formatCurrency(item.valor)}</td>
                <td>${item.semana_referente}</td>
                <td>${item.descricao || '-'}</td>
                <td>${item.recorrencia_semanal ? 'Sim' : 'Não'}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editContaSemanal(${item.id})">Editar</button>
                    <button class="btn btn-danger" onclick="deleteContaSemanal(${item.id})">Excluir</button>
                </td>
            </tr>
        `).join('');
        
        const total = data.reduce((sum, item) => sum + parseFloat(item.valor), 0);
        document.getElementById('totalSemanaisList').textContent = formatCurrency(total);
    } catch (error) {
        console.error('Erro ao carregar contas semanais:', error);
    }
}

function openContaSemanalModal(id = null) {
    const modal = document.getElementById('contaSemanalModal');
    const form = document.getElementById('contaSemanalForm');
    form.reset();
    document.getElementById('contaSemanalId').value = id || '';
    
    if (id) {
        apiRequest(`/contas-semanais`).then(r => r.json()).then(data => {
            const item = data.find(i => i.id === id);
            if (item) {
                document.getElementById('contaSemanalNome').value = item.nome;
                document.getElementById('contaSemanalValor').value = item.valor;
                document.getElementById('contaSemanalSemana').value = item.semana_referente;
                document.getElementById('contaSemanalDescricao').value = item.descricao || '';
                document.getElementById('contaSemanalRecorrencia').value = item.recorrencia_semanal;
            }
        });
    }
    
    modal.style.display = 'block';
}

async function handleContaSemanalSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('contaSemanalId').value;
    const data = {
        nome: document.getElementById('contaSemanalNome').value,
        valor: parseFloat(document.getElementById('contaSemanalValor').value),
        semana_referente: document.getElementById('contaSemanalSemana').value,
        descricao: document.getElementById('contaSemanalDescricao').value,
        recorrencia_semanal: parseInt(document.getElementById('contaSemanalRecorrencia').value)
    };
    
    try {
        const url = id ? `/contas-semanais/${id}` : '/contas-semanais';
        const method = id ? 'PUT' : 'POST';
        
        const response = await apiRequest(url, {
            method,
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeModal('contaSemanalModal');
            loadContasSemanais();
        }
    } catch (error) {
        console.error('Erro ao salvar conta semanal:', error);
        alert('Erro ao salvar conta semanal');
    }
}

async function editContaSemanal(id) {
    openContaSemanalModal(id);
}

async function deleteContaSemanal(id) {
    if (!confirm('Tem certeza que deseja excluir esta conta semanal?')) return;
    
    try {
        const response = await apiRequest(`/contas-semanais/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadContasSemanais();
        }
    } catch (error) {
        console.error('Erro ao excluir conta semanal:', error);
        alert('Erro ao excluir conta semanal');
    }
}

function filterSemanais() {
    const semana = document.getElementById('semanaisSemana').value;
    const nome = document.getElementById('semanaisNome').value;
    
    let url = '/contas-semanais?';
    if (semana) url += `semana=${semana}&`;
    if (nome) url += `nome=${nome}`;
    
    apiRequest(url).then(r => r.json()).then(data => {
        const tbody = document.querySelector('#semanaisTable tbody');
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.nome}</td>
                <td>${formatCurrency(item.valor)}</td>
                <td>${item.semana_referente}</td>
                <td>${item.descricao || '-'}</td>
                <td>${item.recorrencia_semanal ? 'Sim' : 'Não'}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editContaSemanal(${item.id})">Editar</button>
                    <button class="btn btn-danger" onclick="deleteContaSemanal(${item.id})">Excluir</button>
                </td>
            </tr>
        `).join('');
        
        const total = data.reduce((sum, item) => sum + parseFloat(item.valor), 0);
        document.getElementById('totalSemanaisList').textContent = formatCurrency(total);
    });
}

// Contas Diárias
async function loadContasDiarias() {
    try {
        const response = await apiRequest('/contas-diarias');
        const data = await response.json();
        
        const tbody = document.querySelector('#diariasTable tbody');
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.nome}</td>
                <td>${formatCurrency(item.valor)}</td>
                <td>${formatDate(item.data)}</td>
                <td>${item.descricao || '-'}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editContaDiaria(${item.id})">Editar</button>
                    <button class="btn btn-danger" onclick="deleteContaDiaria(${item.id})">Excluir</button>
                </td>
            </tr>
        `).join('');
        
        const total = data.reduce((sum, item) => sum + parseFloat(item.valor), 0);
        document.getElementById('totalDiariasList').textContent = formatCurrency(total);
    } catch (error) {
        console.error('Erro ao carregar contas diárias:', error);
    }
}

function openContaDiariaModal(id = null) {
    const modal = document.getElementById('contaDiariaModal');
    const form = document.getElementById('contaDiariaForm');
    form.reset();
    document.getElementById('contaDiariaId').value = id || '';
    
    if (id) {
        apiRequest(`/contas-diarias`).then(r => r.json()).then(data => {
            const item = data.find(i => i.id === id);
            if (item) {
                document.getElementById('contaDiariaNome').value = item.nome;
                document.getElementById('contaDiariaValor').value = item.valor;
                document.getElementById('contaDiariaData').value = item.data;
                document.getElementById('contaDiariaDescricao').value = item.descricao || '';
            }
        });
    } else {
        document.getElementById('contaDiariaData').value = new Date().toISOString().slice(0, 10);
    }
    
    modal.style.display = 'block';
}

async function handleContaDiariaSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('contaDiariaId').value;
    const data = {
        nome: document.getElementById('contaDiariaNome').value,
        valor: parseFloat(document.getElementById('contaDiariaValor').value),
        data: document.getElementById('contaDiariaData').value,
        descricao: document.getElementById('contaDiariaDescricao').value
    };
    
    try {
        const url = id ? `/contas-diarias/${id}` : '/contas-diarias';
        const method = id ? 'PUT' : 'POST';
        
        const response = await apiRequest(url, {
            method,
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeModal('contaDiariaModal');
            loadContasDiarias();
        }
    } catch (error) {
        console.error('Erro ao salvar conta diária:', error);
        alert('Erro ao salvar conta diária');
    }
}

async function editContaDiaria(id) {
    openContaDiariaModal(id);
}

async function deleteContaDiaria(id) {
    if (!confirm('Tem certeza que deseja excluir esta conta diária?')) return;
    
    try {
        const response = await apiRequest(`/contas-diarias/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadContasDiarias();
        }
    } catch (error) {
        console.error('Erro ao excluir conta diária:', error);
        alert('Erro ao excluir conta diária');
    }
}

function filterDiarias() {
    const dataInicio = document.getElementById('diariasDataInicio').value;
    const dataFim = document.getElementById('diariasDataFim').value;
    const mes = document.getElementById('diariasMes').value;
    
    let url = '/contas-diarias?';
    if (dataInicio && dataFim) {
        url += `data_inicio=${dataInicio}&data_fim=${dataFim}`;
    } else if (mes) {
        url += `mes=${mes}`;
    }
    
    apiRequest(url).then(r => r.json()).then(data => {
        const tbody = document.querySelector('#diariasTable tbody');
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.nome}</td>
                <td>${formatCurrency(item.valor)}</td>
                <td>${formatDate(item.data)}</td>
                <td>${item.descricao || '-'}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editContaDiaria(${item.id})">Editar</button>
                    <button class="btn btn-danger" onclick="deleteContaDiaria(${item.id})">Excluir</button>
                </td>
            </tr>
        `).join('');
        
        const total = data.reduce((sum, item) => sum + parseFloat(item.valor), 0);
        document.getElementById('totalDiariasList').textContent = formatCurrency(total);
    });
}

// Relatórios Completos
let relatorioData = null;
let relatorioDetalhes = [];

async function buscarRelatorio() {
    const nome = document.getElementById('relatorioNome').value;
    const descricao = document.getElementById('relatorioDescricao').value;
    const categoria = document.getElementById('relatorioCategoria').value;
    const dataInicio = document.getElementById('relatorioDataInicio').value;
    const dataFim = document.getElementById('relatorioDataFim').value;
    const mes = document.getElementById('relatorioMes').value;
    const agruparSimilares = document.getElementById('relatorioAgruparSimilares').checked;
    
    let url = '/relatorios?';
    if (nome) url += `nome=${encodeURIComponent(nome)}&`;
    if (descricao) url += `descricao=${encodeURIComponent(descricao)}&`;
    if (categoria) url += `categoria=${categoria}&`;
    if (dataInicio && dataFim) {
        url += `data_inicio=${dataInicio}&data_fim=${dataFim}&`;
    } else if (mes) {
        url += `mes=${mes}&`;
    }
    if (agruparSimilares) url += `agrupar_similares=true&`;
    
    try {
        const response = await apiRequest(url);
        relatorioData = await response.json();
        relatorioDetalhes = relatorioData.detalhes || [];
        
        // Exibir resumo financeiro
        exibirResumoFinanceiro(relatorioData);
        
        // Exibir gastos agrupados se houver
        if (relatorioData.gastos_agrupados && relatorioData.gastos_agrupados.length > 0) {
            exibirGastosAgrupados(relatorioData.gastos_agrupados);
        }
        
        // Exibir top gastos
        if (relatorioData.top_gastos && relatorioData.top_gastos.length > 0) {
            exibirTopGastos(relatorioData.top_gastos);
        }
        
        // Exibir análise diária se houver
        if (relatorioData.analise_diaria && relatorioData.analise_diaria.length > 0) {
            exibirAnaliseDiaria(relatorioData.analise_diaria);
        }
        
        // Exibir estatísticas
        if (relatorioData.estatisticas) {
            exibirEstatisticas(relatorioData.estatisticas);
        }
        
        // Exibir detalhes completos
        exibirDetalhesCompletos(relatorioDetalhes);
        
    } catch (error) {
        console.error('Erro ao buscar relatório:', error);
        alert('Erro ao buscar relatório: ' + (error.message || 'Erro desconhecido'));
    }
}

function exibirResumoFinanceiro(data) {
    const resumo = data.resumo;
    const resumoDiv = document.getElementById('relatorioResumo');
    resumoDiv.style.display = 'block';
    
    document.getElementById('resumoArrecadado').textContent = formatCurrency(resumo.arrecadado);
    document.getElementById('resumoGastos').textContent = formatCurrency(resumo.gastos);
    
    const lucroCard = document.getElementById('resumoLucroCard');
    const lucroTitulo = document.getElementById('resumoLucroTitulo');
    const lucroValor = document.getElementById('resumoLucro');
    
    if (resumo.status === 'lucro') {
        lucroCard.className = 'resumo-card lucro';
        lucroTitulo.textContent = '📈 Lucro Líquido';
        lucroValor.textContent = formatCurrency(resumo.lucro_prejuizo);
        lucroValor.classList.remove('negative');
    } else {
        lucroCard.className = 'resumo-card prejuizo';
        lucroTitulo.textContent = '⚠️ Prejuízo';
        lucroValor.textContent = formatCurrency(Math.abs(resumo.lucro_prejuizo));
        lucroValor.classList.add('negative');
    }
    
    document.getElementById('resumoMargem').textContent = `Margem: ${resumo.margem}%`;
    
    // Gastos por categoria
    const gastosCat = data.gastos_por_categoria;
    const totalGastos = gastosCat.fixa + gastosCat.semanal + gastosCat.diaria;
    const maxGasto = Math.max(gastosCat.fixa, gastosCat.semanal, gastosCat.diaria);
    
    document.getElementById('valorFixas').textContent = formatCurrency(gastosCat.fixa);
    document.getElementById('valorSemanais').textContent = formatCurrency(gastosCat.semanal);
    document.getElementById('valorDiarias').textContent = formatCurrency(gastosCat.diaria);
    
    document.getElementById('barFixas').style.width = maxGasto > 0 ? (gastosCat.fixa / maxGasto * 100) + '%' : '0%';
    document.getElementById('barSemanais').style.width = maxGasto > 0 ? (gastosCat.semanal / maxGasto * 100) + '%' : '0%';
    document.getElementById('barDiarias').style.width = maxGasto > 0 ? (gastosCat.diaria / maxGasto * 100) + '%' : '0%';
}

function exibirGastosAgrupados(agrupados) {
    const div = document.getElementById('relatorioAgrupados');
    div.style.display = 'block';
    
    const tbody = document.querySelector('#agrupadosTable tbody');
    tbody.innerHTML = agrupados.map((grupo, index) => `
        <tr>
            <td><strong>${grupo.nome}</strong></td>
            <td>${grupo.quantidade}x</td>
            <td><strong>${formatCurrency(grupo.total)}</strong></td>
            <td>${formatCurrency(grupo.media)}</td>
            <td>
                <button class="btn btn-secondary" onclick="verDetalhesGrupo(${index})">Ver Detalhes</button>
            </td>
        </tr>
    `).join('');
    
    // Armazenar grupos para detalhes
    window.gastosAgrupadosDetalhes = agrupados;
}

function verDetalhesGrupo(index) {
    const grupo = window.gastosAgrupadosDetalhes[index];
    if (!grupo) return;
    
    let detalhes = 'Detalhes do grupo "' + grupo.nome + '":\n\n';
    grupo.itens.forEach((item, i) => {
        detalhes += `${i + 1}. ${item.nome} - ${formatCurrency(item.valor)} (${item.periodo})\n`;
    });
    detalhes += `\nTotal: ${formatCurrency(grupo.total)}`;
    detalhes += `\nQuantidade: ${grupo.quantidade}`;
    detalhes += `\nMédia: ${formatCurrency(grupo.media)}`;
    
    alert(detalhes);
}

function exibirTopGastos(topGastos) {
    const div = document.getElementById('relatorioTopGastos');
    div.style.display = 'block';
    
    const tbody = document.querySelector('#topGastosTable tbody');
    tbody.innerHTML = topGastos.map((gasto, index) => `
        <tr>
            <td>${index + 1}º</td>
            <td>${gasto.nome}</td>
            <td><strong>${formatCurrency(gasto.valor)}</strong></td>
            <td>${gasto.categoria}</td>
        </tr>
    `).join('');
}

function exibirAnaliseDiaria(analiseDiaria) {
    const div = document.getElementById('relatorioAnaliseDiaria');
    div.style.display = 'block';
    
    const labels = analiseDiaria.map(a => a.data.slice(8));
    const arrecadado = analiseDiaria.map(a => parseFloat(a.arrecadado));
    const gastos = analiseDiaria.map(a => parseFloat(a.gastos));
    const lucro = analiseDiaria.map(a => parseFloat(a.lucro));
    
    if (charts['analiseDiaria']) {
        charts['analiseDiaria'].destroy();
    }
    
    const ctx = document.getElementById('chartAnaliseDiaria').getContext('2d');
    charts['analiseDiaria'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Arrecadado',
                    data: arrecadado,
                    borderColor: '#10b981',
                    backgroundColor: '#10b98120',
                    tension: 0.4
                },
                {
                    label: 'Gastos',
                    data: gastos,
                    borderColor: '#ef4444',
                    backgroundColor: '#ef444420',
                    tension: 0.4
                },
                {
                    label: 'Lucro/Prejuízo',
                    data: lucro,
                    borderColor: '#4f46e5',
                    backgroundColor: '#4f46e520',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

function exibirEstatisticas(stats) {
    const div = document.getElementById('relatorioEstatisticas');
    div.style.display = 'block';
    
    document.getElementById('statTransacoes').textContent = stats.total_transacoes;
    document.getElementById('statArrecadacoes').textContent = stats.total_arrecadacoes;
    document.getElementById('statGastos').textContent = stats.total_gastos;
    document.getElementById('statMediaArrecadacao').textContent = formatCurrency(stats.media_diaria_arrecadacao);
    document.getElementById('statMediaGastos').textContent = formatCurrency(stats.media_diaria_gastos);
}

function exibirDetalhesCompletos(detalhes) {
    const tbody = document.querySelector('#relatoriosTable tbody');
    tbody.innerHTML = detalhes.map(item => `
        <tr>
            <td>${item.tipo === 'arrecadacao' ? '💰 Receita' : '💸 Gasto'}</td>
            <td>${item.categoria}</td>
            <td>${item.nome}</td>
            <td class="${item.tipo === 'gasto' ? 'negative' : ''}">${formatCurrency(item.valor)}</td>
            <td>${item.periodo}</td>
            <td>${item.descricao || '-'}</td>
            <td>${item.data ? formatDate(item.data) : formatDateTime(item.created_at)}</td>
        </tr>
    `).join('');
    
    const totalGastos = detalhes.filter(d => d.tipo === 'gasto').reduce((sum, d) => sum + d.valor, 0);
    const totalArrecadado = detalhes.filter(d => d.tipo === 'arrecadacao').reduce((sum, d) => sum + d.valor, 0);
    
    document.getElementById('relatorioTotalGastos').textContent = formatCurrency(totalGastos);
    document.getElementById('relatorioTotalArrecadado').textContent = formatCurrency(totalArrecadado);
}

function limparRelatorio() {
    document.getElementById('relatorioNome').value = '';
    document.getElementById('relatorioDescricao').value = '';
    document.getElementById('relatorioCategoria').value = '';
    document.getElementById('relatorioDataInicio').value = '';
    document.getElementById('relatorioDataFim').value = '';
    document.getElementById('relatorioMes').value = '';
    document.getElementById('relatorioAgruparSimilares').checked = false;
    
    document.querySelector('#relatoriosTable tbody').innerHTML = '';
    document.getElementById('relatorioResumo').style.display = 'none';
    document.getElementById('relatorioAgrupados').style.display = 'none';
    document.getElementById('relatorioTopGastos').style.display = 'none';
    document.getElementById('relatorioAnaliseDiaria').style.display = 'none';
    document.getElementById('relatorioEstatisticas').style.display = 'none';
    
    relatorioData = null;
    relatorioDetalhes = [];
}

// Exportações
function exportarPDF() {
    if (!relatorioData || !relatorioDetalhes || relatorioDetalhes.length === 0) {
        alert('Nenhum dado para exportar. Faça uma busca primeiro.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório Financeiro Completo', 14, 20);
    
    // Resumo
    doc.setFontSize(14);
    doc.text('RESUMO FINANCEIRO', 14, 35);
    doc.setFontSize(12);
    doc.text(`Período: ${relatorioData.periodo.inicio} a ${relatorioData.periodo.fim}`, 14, 42);
    doc.text(`Arrecadado: ${formatCurrency(relatorioData.resumo.arrecadado)}`, 14, 49);
    doc.text(`Gastos: ${formatCurrency(relatorioData.resumo.gastos)}`, 14, 56);
    doc.text(`Lucro/Prejuízo: ${formatCurrency(relatorioData.resumo.lucro_prejuizo)}`, 14, 63);
    doc.text(`Margem: ${relatorioData.resumo.margem}%`, 14, 70);
    
    let y = 80;
    
    // Gastos agrupados se houver
    if (relatorioData.gastos_agrupados && relatorioData.gastos_agrupados.length > 0) {
        if (y > 250) {
            doc.addPage();
            y = 20;
        }
        doc.setFontSize(14);
        doc.text('GASTOS AGRUPADOS', 14, y);
        y += 10;
        doc.setFontSize(10);
        relatorioData.gastos_agrupados.forEach(grupo => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            doc.text(`${grupo.nome}: ${formatCurrency(grupo.total)} (${grupo.quantidade}x)`, 14, y);
            y += 7;
        });
        y += 5;
    }
    
    // Detalhes
    if (y > 250) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(14);
    doc.text('DETALHES COMPLETOS', 14, y);
    y += 10;
    doc.setFontSize(10);
    
    relatorioDetalhes.forEach((item, index) => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        
        doc.text(`${index + 1}. ${item.tipo === 'arrecadacao' ? 'RECEITA' : 'GASTO'} - ${item.categoria}`, 14, y);
        y += 6;
        doc.text(`   ${item.nome}: ${formatCurrency(item.valor)} | ${item.periodo}`, 14, y);
        y += 6;
        if (item.descricao) {
            doc.text(`   Descrição: ${item.descricao}`, 14, y);
            y += 6;
        }
        y += 3;
    });
    
    doc.save('relatorio-financeiro-completo.pdf');
}

function exportarExcel() {
    if (!relatorioData || !relatorioDetalhes || relatorioDetalhes.length === 0) {
        alert('Nenhum dado para exportar. Faça uma busca primeiro.');
        return;
    }
    
    const wb = XLSX.utils.book_new();
    
    // Aba 1: Resumo
    const resumoData = [
        ['RESUMO FINANCEIRO'],
        ['Período', `${relatorioData.periodo.inicio} a ${relatorioData.periodo.fim}`],
        ['Arrecadado', relatorioData.resumo.arrecadado],
        ['Gastos', relatorioData.resumo.gastos],
        ['Lucro/Prejuízo', relatorioData.resumo.lucro_prejuizo],
        ['Margem (%)', relatorioData.resumo.margem]
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
    
    // Aba 2: Gastos Agrupados
    if (relatorioData.gastos_agrupados && relatorioData.gastos_agrupados.length > 0) {
        const agrupadosData = relatorioData.gastos_agrupados.map(g => ({
            'Nome': g.nome,
            'Quantidade': g.quantidade,
            'Total': g.total,
            'Média': g.media
        }));
        const wsAgrupados = XLSX.utils.json_to_sheet(agrupadosData);
        XLSX.utils.book_append_sheet(wb, wsAgrupados, 'Gastos Agrupados');
    }
    
    // Aba 3: Detalhes
    const detalhesData = relatorioDetalhes.map(item => ({
        'Tipo': item.tipo === 'arrecadacao' ? 'Receita' : 'Gasto',
        'Categoria': item.categoria,
        'Nome': item.nome,
        'Valor': item.valor,
        'Período': item.periodo,
        'Descrição': item.descricao || '',
        'Data': item.data || formatDateTime(item.created_at)
    }));
    const wsDetalhes = XLSX.utils.json_to_sheet(detalhesData);
    XLSX.utils.book_append_sheet(wb, wsDetalhes, 'Detalhes');
    
    XLSX.writeFile(wb, 'relatorio-financeiro-completo.xlsx');
}

function exportarCSV() {
    if (!relatorioData || !relatorioDetalhes || relatorioDetalhes.length === 0) {
        alert('Nenhum dado para exportar. Faça uma busca primeiro.');
        return;
    }
    
    const headers = ['Tipo', 'Categoria', 'Nome', 'Valor', 'Período', 'Descrição', 'Data'];
    const rows = relatorioDetalhes.map(item => [
        item.tipo === 'arrecadacao' ? 'Receita' : 'Gasto',
        item.categoria,
        item.nome,
        item.valor,
        item.periodo,
        item.descricao || '',
        item.data || formatDateTime(item.created_at)
    ]);
    
    const totalGastos = relatorioDetalhes.filter(d => d.tipo === 'gasto').reduce((sum, d) => sum + d.valor, 0);
    const totalArrecadado = relatorioDetalhes.filter(d => d.tipo === 'arrecadacao').reduce((sum, d) => sum + d.valor, 0);
    rows.push(['', 'TOTAL GASTOS', '', totalGastos, '', '', '']);
    rows.push(['', 'TOTAL ARRECADADO', '', totalArrecadado, '', '', '']);
    rows.push(['', 'LUCRO/PREJUÍZO', '', relatorioData.resumo.lucro_prejuizo, '', '', '']);
    
    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell)}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio-financeiro-completo.csv';
    link.click();
}

// Configurações
async function criarBackup() {
    try {
        const response = await apiRequest('/backup');
        const data = await response.json();
        document.getElementById('backupMessage').textContent = `Backup criado: ${data.arquivo}`;
    } catch (error) {
        console.error('Erro ao criar backup:', error);
        alert('Erro ao criar backup');
    }
}

async function loadLogs() {
    try {
        const response = await apiRequest('/logs?limit=100');
        const data = await response.json();
        
        const tbody = document.querySelector('#logsTable tbody');
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${formatDateTime(item.created_at)}</td>
                <td>${item.usuario || '-'}</td>
                <td>${item.acao}</td>
                <td>${item.tabela || '-'}</td>
                <td>${item.registro_id || '-'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
    }
}

async function compararMeses() {
    const mes1 = document.getElementById('compararMes1').value;
    const mes2 = document.getElementById('compararMes2').value;
    
    if (!mes1 || !mes2) {
        alert('Selecione os dois meses para comparar');
        return;
    }
    
    try {
        const response = await apiRequest(`/comparar-meses?mes1=${mes1}&mes2=${mes2}`);
        const data = await response.json();
        
        const resultado = document.getElementById('comparacaoResultado');
        resultado.innerHTML = `
            <h3>Comparação: ${mes1} vs ${mes2}</h3>
            <div class="comparacao-item">
                <strong>Arrecadação:</strong>
                <span>${formatCurrency(data.mes1.arrecadacao)} → ${formatCurrency(data.mes2.arrecadacao)} 
                (${data.diferenca.arrecadacao >= 0 ? '+' : ''}${formatCurrency(data.diferenca.arrecadacao)})</span>
            </div>
            <div class="comparacao-item">
                <strong>Gastos:</strong>
                <span>${formatCurrency(data.mes1.totalGastos)} → ${formatCurrency(data.mes2.totalGastos)} 
                (${data.diferenca.gastos >= 0 ? '+' : ''}${formatCurrency(data.diferenca.gastos)})</span>
            </div>
            <div class="comparacao-item">
                <strong>Lucro:</strong>
                <span>${formatCurrency(data.mes1.lucro)} → ${formatCurrency(data.mes2.lucro)} 
                (${data.diferenca.lucro >= 0 ? '+' : ''}${formatCurrency(data.diferenca.lucro)})</span>
            </div>
        `;
    } catch (error) {
        console.error('Erro ao comparar meses:', error);
        alert('Erro ao comparar meses');
    }
}

// Utilitários
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
}

// ========== FUNÇÕES MOBILE ==========

// Handler do formulário mobile simplificado
async function handleMobileQuickSubmit(e) {
    e.preventDefault();
    
    const nome = document.getElementById('mobileNome').value.trim();
    const valor = parseFloat(document.getElementById('mobileValor').value);
    const descricao = document.getElementById('mobileDescricao').value.trim();
    
    if (!nome || !valor || valor <= 0) {
        alert('Por favor, preencha o nome e o valor corretamente');
        document.getElementById('mobileNome').focus();
        return;
    }
    
    // Desabilitar botão durante o envio
    const submitBtn = e.target.querySelector('.mobile-submit-btn') || e.target;
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Salvando...</span>';
    
    const data = {
        nome: nome,
        valor: valor,
        data: new Date().toISOString().slice(0, 10),
        descricao: descricao || null
    };
    
    try {
        const response = await apiRequest('/contas-diarias', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            // Mostrar mensagem de sucesso
            const form = document.getElementById('mobileQuickForm');
            const success = document.getElementById('mobileSuccess');
            const successMsg = document.getElementById('mobileSuccessMsg');
            
            form.style.display = 'none';
            success.style.display = 'block';
            successMsg.textContent = `${nome} - ${formatCurrency(valor)}`;
            
            // Recarregar lista de gastos recentes
            loadMobileRecentGastos();
            
            // Scroll para o topo
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Erro ao salvar gasto:', error);
        alert('Erro ao salvar gasto. Verifique sua conexão e tente novamente.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Resetar formulário mobile
function resetMobileForm() {
    document.getElementById('mobileQuickForm').reset();
    document.getElementById('mobileQuickForm').style.display = 'block';
    document.getElementById('mobileSuccess').style.display = 'none';
    
    // Reabilitar botão
    const submitBtn = document.querySelector('.mobile-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-icon">✓</span><span class="btn-text">Salvar Gasto</span>';
    }
    
    // Focar no primeiro campo
    setTimeout(() => {
        document.getElementById('mobileNome').focus();
    }, 100);
    
    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Carregar gastos recentes do dia
async function loadMobileRecentGastos() {
    try {
        const hoje = new Date().toISOString().slice(0, 10);
        const response = await apiRequest(`/contas-diarias?dia=${hoje}`);
        const data = await response.json();
        
        // Filtrar apenas os de hoje
        const hojeData = data.filter(item => item.data === hoje);
        
        // Ordenar por mais recente
        hojeData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Mostrar apenas os últimos 5
        const recentList = document.getElementById('mobileRecentList');
        if (hojeData.length === 0) {
            recentList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">Nenhum gasto lançado hoje</p>';
        } else {
            recentList.innerHTML = hojeData.slice(0, 5).map(item => `
                <div class="mobile-recent-item">
                    <div class="mobile-recent-item-info">
                        <div class="mobile-recent-item-name">${item.nome}</div>
                        ${item.descricao ? `<div class="mobile-recent-item-desc">${item.descricao}</div>` : ''}
                    </div>
                    <div class="mobile-recent-item-value">${formatCurrency(item.valor)}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar gastos recentes:', error);
    }
}

// ========== FUNÇÕES DE IA ==========

// Gerar análise com IA

// Fechar modal ao clicar fora
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

