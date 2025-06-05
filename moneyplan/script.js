// Dados armazenados localmente
let transacoes = JSON.parse(localStorage.getItem('transacoes')) || [];
let orcamentos = JSON.parse(localStorage.getItem('orcamentos')) || [];
let metas = JSON.parse(localStorage.getItem('metas')) || [];
let gruposSociais = JSON.parse(localStorage.getItem('gruposSociais')) || [];

// Utils
function formatarReal(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function salvarNoStorage() {
    localStorage.setItem('transacoes', JSON.stringify(transacoes));
    localStorage.setItem('orcamentos', JSON.stringify(orcamentos));
    localStorage.setItem('metas', JSON.stringify(metas));
    localStorage.setItem('gruposSociais', JSON.stringify(gruposSociais));
}

// Atualiza dashboard financeiro
function atualizarDashboard() {
    let totalReceita = transacoes.filter(t => t.valor > 0).reduce((a, b) => a + b.valor, 0);
    let totalDespesa = transacoes.filter(t => t.valor < 0).reduce((a, b) => a + b.valor, 0);
    let saldoTotal = totalReceita + totalDespesa;
    document.getElementById('totalReceita').textContent = formatarReal(totalReceita);
    document.getElementById('totalDespesa').textContent = formatarReal(totalDespesa);
    document.getElementById('saldoTotal').textContent = formatarReal(saldoTotal);
}

// Renderiza tabela de transações
function renderizarTransacoes() {
    const tbody = document.querySelector('#tabelaTransacoes tbody');
    tbody.innerHTML = '';
    transacoes.forEach((t, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.descricao}</td>
            <td style="color:${t.valor >= 0 ? 'green' : 'red'}">${formatarReal(t.valor)}</td>
            <td>${t.categoria}</td>
            <td>${t.anotacao || ''}</td>
            <td>
                <button onclick="editarTransacao(${i})">Editar</button>
                <button onclick="excluirTransacao(${i})">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Formulário transações
function salvarTransacao(event) {
    event.preventDefault();
    const index = document.getElementById('transacaoIndex').value;
    const descricao = document.getElementById('descricaoTransacao').value;
    const valor = parseFloat(document.getElementById('valorTransacao').value);
    const categoria = document.getElementById('categoriaTransacao').value;
    const anotacao = document.getElementById('anotacaoTransacao').value;

    if (index === '') {
        // Adicionar nova
        transacoes.push({ descricao, valor, categoria, anotacao });
    } else {
        // Editar existente
        transacoes[index] = { descricao, valor, categoria, anotacao };
    }

    salvarNoStorage();
    limparFormTransacao();
    renderizarTransacoes();
    atualizarDashboard();
    atualizarGraficoFluxo();
    validarOrcamentos();
}

function editarTransacao(i) {
    const t = transacoes[i];
    document.getElementById('transacaoIndex').value = i;
    document.getElementById('descricaoTransacao').value = t.descricao;
    document.getElementById('valorTransacao').value = t.valor;
    document.getElementById('categoriaTransacao').value = t.categoria;
    document.getElementById('anotacaoTransacao').value = t.anotacao;
}

function excluirTransacao(i) {
    if (confirm('Confirma exclusão da transação?')) {
        transacoes.splice(i, 1);
        salvarNoStorage();
        renderizarTransacoes();
        atualizarDashboard();
        atualizarGraficoFluxo();
        validarOrcamentos();
    }
}

function limparFormTransacao() {
    document.getElementById('formTransacao').reset();
    document.getElementById('transacaoIndex').value = '';
}

// Orçamentos
function salvarOrcamento(event) {
    event.preventDefault();
    const categoria = document.getElementById('categoriaOrcamento').value;
    const limiteMensal = parseFloat(document.getElementById('limiteMensal').value);
    const limiteAnual = parseFloat(document.getElementById('limiteAnual').value) || 0;

    const indexExistente = orcamentos.findIndex(o => o.categoria === categoria);
    if (indexExistente >= 0) {
        orcamentos[indexExistente] = { categoria, limiteMensal, limiteAnual };
    } else {
        orcamentos.push({ categoria, limiteMensal, limiteAnual });
    }

    salvarNoStorage();
    renderizarOrcamentos();
    validarOrcamentos();
    document.getElementById('formOrcamento').reset();
}

function renderizarOrcamentos() {
    const tbody = document.querySelector('#tabelaOrcamentos tbody');
    tbody.innerHTML = '';
    orcamentos.forEach((o, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${o.categoria}</td>
            <td>${formatarReal(o.limiteMensal)}</td>
            <td>${o.limiteAnual > 0 ? formatarReal(o.limiteAnual) : '-'}</td>
            <td><button onclick="excluirOrcamento(${i})">Excluir</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function excluirOrcamento(i) {
    if (confirm('Confirma exclusão do orçamento?')) {
        orcamentos.splice(i, 1);
        salvarNoStorage();
        renderizarOrcamentos();
    }
}

function validarOrcamentos() {
    const alertas = document.getElementById('alertas');
    alertas.innerHTML = '';

    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();

    orcamentos.forEach(o => {
        let somaMes = transacoes.filter(t =>
            t.categoria === o.categoria &&
            t.valor < 0 &&
            new Date(t.data || Date.now()).getMonth() === mesAtual &&
            new Date(t.data || Date.now()).getFullYear() === anoAtual
        ).reduce((a, b) => a + b.valor, 0);

        let somaAno = transacoes.filter(t =>
            t.categoria === o.categoria &&
            t.valor < 0 &&
            new Date(t.data || Date.now()).getFullYear() === anoAtual
        ).reduce((a, b) => a + b.valor, 0);

        if (somaMes < -o.limiteMensal) {
            const div = document.createElement('div');
            div.style.color = 'red';
            div.textContent = `⚠️ Despesas em ${o.categoria} ultrapassaram o limite mensal (${formatarReal(o.limiteMensal)})`;
            alertas.appendChild(div);
        }

        if (o.limiteAnual > 0 && somaAno < -o.limiteAnual) {
            const div = document.createElement('div');
            div.style.color = 'red';
            div.textContent = `⚠️ Despesas em ${o.categoria} ultrapassaram o limite anual (${formatarReal(o.limiteAnual)})`;
            alertas.appendChild(div);
        }
    });
}

// Gráfico fluxo receitas/despesas
let chartFluxo = null;

function atualizarGraficoFluxo() {
    const ctx = document.getElementById('graficoFluxo').getContext('2d');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let receitasPorMes = new Array(12).fill(0);
    let despesasPorMes = new Array(12).fill(0);

    transacoes.forEach(t => {
        const d = new Date(t.data || Date.now());
        const m = d.getMonth();
        if (t.valor > 0) receitasPorMes[m] += t.valor;
        else despesasPorMes[m] += -t.valor;
    });

    if (chartFluxo) chartFluxo.destroy();
    chartFluxo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [{
                    label: 'Receitas',
                    data: receitasPorMes,
                    backgroundColor: 'green'
                },
                {
                    label: 'Despesas',
                    data: despesasPorMes,
                    backgroundColor: 'red'
                },
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Metas e grupos sociais
function adicionarMeta(event) {
    event.preventDefault();
    const descricao = document.getElementById('descricaoMeta').value.trim();
    const valorAlvo = parseFloat(document.getElementById('valorMeta').value);

    if (!descricao || isNaN(valorAlvo) || valorAlvo <= 0) {
        alert("Preencha todos os campos corretamente.");
        return;
    }

    metas.push({
        descricao,
        valorAlvo,
        progresso: 0
    });

    salvarNoStorage();
    renderizarMetas();
    atualizarProgressoMetas();
    document.getElementById('formMeta').reset();
}

function renderizarMetas() {
    const lista = document.getElementById('listaMetas');
    lista.innerHTML = '';

    if (metas.length === 0) {
        lista.innerHTML = "<p>Nenhuma meta cadastrada.</p>";
        return;
    }

    metas.forEach((m, i) => {
        const percentual = Math.min((m.progresso / m.valorAlvo) * 100, 100).toFixed(1);
        const barra = `
            <div class="barra-progresso">
                <div class="progresso" style="width:${percentual}%">${percentual}%</div>
            </div>
        `;

        const div = document.createElement('div');
        div.classList.add('meta-item');
        div.innerHTML = `
            <strong>${m.descricao}</strong><br/>
            ${formatarReal(m.progresso)} / ${formatarReal(m.valorAlvo)}<br/>
            ${barra}
            <button onclick="contribuirMeta(${i})">Adicionar R$ 50</button>
            <button onclick="excluirMeta(${i})">Excluir</button>
        `;
        lista.appendChild(div);
    });
}

function contribuirMeta(i) {
    metas[i].progresso += 50;
    if (metas[i].progresso > metas[i].valorAlvo) {
        metas[i].progresso = metas[i].valorAlvo;
        alert("Parabéns! Você atingiu sua meta!");
    }

    salvarNoStorage();
    renderizarMetas();
    atualizarProgressoMetas();
}

function excluirMeta(i) {
    if (confirm("Tem certeza que deseja excluir esta meta?")) {
        metas.splice(i, 1);
        salvarNoStorage();
        renderizarMetas();
        atualizarProgressoMetas();
    }
}

function atualizarProgressoMetas() {
    const lista = document.getElementById('listaProgressoMetas');
    lista.innerHTML = "";

    if (metas.length === 0) {
        lista.innerHTML = "<p>Nenhuma meta cadastrada.</p>";
        return;
    }

    metas.forEach(m => {
        const percentual = Math.min((m.progresso / m.valorAlvo) * 100, 100).toFixed(1);
        const barra = `
            <div class="barra-progresso">
                <div class="progresso" style="width:${percentual}%">${percentual}%</div>
            </div>
        `;
        const div = document.createElement("div");
        div.innerHTML = `<strong>${m.descricao}:</strong> ${barra}`;
        lista.appendChild(div);
    });
}

// Grupos Sociais
function criarGrupo(event) {
    event.preventDefault();
    const nome = document.getElementById('nomeGrupo').value;
    const membros = document.getElementById('membrosGrupo').value.split(',').map(s => s.trim()).filter(s => s);
    gruposSociais.push({ nome, membros });
    salvarNoStorage();
    renderizarGrupos();
    atualizarGruposSelect();
    document.getElementById('formGrupo').reset();
}

function renderizarGrupos() {
    const lista = document.getElementById('listaGrupos');
    lista.innerHTML = "";
    gruposSociais.forEach((g, i) => {
        const div = document.createElement('div');
        div.innerHTML = `<strong>${g.nome}</strong>: ${g.membros.join(", ")}`;
        div.style.border = "1px solid #ccc";
        div.style.padding = "8px";
        div.style.marginBottom = "5px";
        div.innerHTML += `<br/><button onclick="excluirGrupo(${i})">Excluir</button>`;
        lista.appendChild(div);
    });
}

function excluirGrupo(i) {
    if (confirm("Tem certeza que deseja excluir este grupo?")) {
        gruposSociais.splice(i, 1);
        salvarNoStorage();
        renderizarGrupos();
        atualizarGruposSelect();
    }
}

function atualizarGruposSelect() {
    const select = document.getElementById('grupoMeta');
    select.innerHTML = '<option value="">Meta Individual</option>';
    gruposSociais.forEach(g => {
        const option = document.createElement('option');
        option.value = g.nome;
        option.textContent = g.nome;
        select.appendChild(option);
    });
}

// Educação Financeira
function abrirVideoEducativo() {
    const video = document.getElementById("videoEducativo");
    const botao = event.target;

    if (video.style.display === "none" || video.style.display === "") {
        video.style.display = "block";
        setTimeout(() => video.classList.add("show"), 10); // Adiciona classe fade
        botao.textContent = "Esconder Vídeo";
    } else {
        video.classList.remove("show");
        setTimeout(() => video.style.display = "none", 300); // Tempo da animação
        botao.textContent = "Assistir vídeo tutorial";
    }
}
// Sincronização bancária simulada
function sincronizarBanco() {
    const status = document.getElementById('statusSync');
    status.textContent = 'Sincronizando...';
    setTimeout(() => {
        status.textContent = 'Sincronização concluída!';
        alert("Transações simuladas importadas com sucesso!");
    }, 1500);
}

// Sugestões personalizadas
function mostrarSugestoes() {
    const sugestoesDiv = document.getElementById('sugestoes');
    const saldo = transacoes.reduce((a, b) => a + b.valor, 0);
    let texto = '';
    if (saldo < 0) {
        texto = '⚠️ Você está com saldo negativo. Avalie reduzir despesas e aumentar receitas.';
    } else if (saldo < 1000) {
        texto = '💰 Seu saldo está baixo. Tente poupar mais para emergências.';
    } else {
        texto = '📈 Ótimo saldo! Considere investir parte do seu dinheiro.';
    }
    sugestoesDiv.textContent = texto;
}

// Inicialização
function init() {
    renderizarTransacoes();
    atualizarDashboard();
    renderizarOrcamentos();
    validarOrcamentos();
    atualizarGraficoFluxo();
    renderizarMetas();
    renderizarGrupos();
    atualizarProgressoMetas();
    mostrarSugestoes();
}

window.onload = init;