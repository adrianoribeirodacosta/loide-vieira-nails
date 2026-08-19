// Função de navegação por abas
function switchTab(tabId, buttonElement) {
    // Esconde todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove a classe active de todos os botões do menu
    document.querySelectorAll('nav.bottom-nav button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostra a aba clicada e ativa o botão correspondente
    document.getElementById('tab-' + tabId).classList.add('active');
    buttonElement.classList.add('active');
}

// --- INICIALIZAÇÃO ÚNICA DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Loide Vieira Nails Studio - App Inicializado com Sucesso! 💅🚀");
    
    // Módulo de Clientes
    carregarClientes();
    carregarCheckboxesServicosCliente();

    // Módulo de Serviços
    carregarServicos();

    // Módulo de Agenda (Adicionados agora)
    carregarSelectClientesAgenda();
    carregarAgendamentos();
});

// --- MÓDULO DE CLIENTES (RF001, RF002, RF003) ---

// Carregar checkboxes de serviços dinamicamente no formulário de cliente
function carregarCheckboxesServicosCliente() {
    const container = document.getElementById("cliente-servicos-checkboxes");
    if (!container) return;

    const servicos = JSON.parse(localStorage.getItem("servicos_studio")) || [];

    if (servicos.length === 0) {
        container.innerHTML = `<small style="color: #888;">Nenhum serviço cadastrado ainda. Cadastre na aba Serviços.</small>`;
        return;
    }

    container.innerHTML = servicos.map(s => `
        <label style="font-weight: normal; text-transform: none; color: #333; display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" name="cliente-servico" value="${s.nome}"> ${s.nome} (${s.tempo} min)
        </label>
    `).join("");
}

// Máscara automática para telefone brasileiro (trata DDI +55 e números com 10 ou 11 dígitos)
function aplicarMascaraTelefone(input) {
    let v = input.value.replace(/\D/g, "");
    
    // Se vier com o DDI 55 na frente, remove para focar no número nacional
    if (v.startsWith("55") && v.length > 11) {
        v = v.substring(2);
    }
    
    // Formatação dinâmica baseada na quantidade real de dígitos (suporta 10 ou 11)
    if (v.length > 10) {
        // Celular com 9º dígito: (XX) XXXXX-XXXX
        v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (v.length > 6) {
        // Telefone fixo ou em digitação: (XX) XXXX-XXXX
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else if (v.length > 0) {
        v = v.replace(/^(\d*)/, "($1");
    }
    
    input.value = v;
}

// Adiciona um lançamento no extrato do cliente com limite de histórico
function adicionarMovimentacaoCliente(clienteId, tipo, valor, descricao) {
    let clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
    
    clientes = clientes.map(c => {
        if (c.id == clienteId) {
            // Garante que o saldo existe
            c.saldoAtual = c.saldoAtual || 0;
            
            if (tipo === 'CREDITO') {
                c.saldoAtual += valor;
            } else if (tipo === 'DEBITO') {
                c.saldoAtual -= valor;
            }

            // Cria o novo lançamento
            const novoLancamento = {
                data: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                tipo: tipo, // 'CREDITO' ou 'DEBITO'
                valor: valor,
                descricao: descricao
            };

            // Inicializa o extrato se não existir
            c.extrato = c.extrato || [];
            
            // Adiciona no início do array
            c.extrato.unshift(novoLancamento);

            // PERFORMANCE: Mantém no máximo os últimos 20 registros salvos para não inchar o JSON
            if (c.extrato.length > 20) {
                c.extrato = c.extrato.slice(0, 20);
            }
        }
        return c;
    });

    localStorage.setItem("clientes_studio", JSON.stringify(clientes));
}

function renderizarExtrato(cliente) {
    const extratoRecente = (cliente.extrato || []).slice(0, 10); // Pega apenas os 10 mais recentes
    
    return extratoRecente.map(item => `
        <div class="extrato-item">
            <span>${item.data} - ${item.descricao}</span>
            <strong class="${item.tipo === 'CREDITO' ? 'text-success' : 'text-danger'}">
                ${item.tipo === 'CREDITO' ? '+' : '-'} R$ ${item.valor}
            </strong>
        </div>
    `).join("");
}

// Função para adicionar crédito usando o prompt nativo
function adicionarCreditoPrompt(clienteId) {
    let valorStr = prompt("Digite o valor do crédito a ser adicionado (Ex: 100.00 ou 100):");
    
    if (valorStr === null) return; // Cancelado pela usuária
    
    // Substitui vírgula por ponto para aceitar o formato brasileiro caso ela digite "100,00"
    valorStr = valorStr.replace(',', '.');
    const valor = parseFloat(valorStr);

    if (isNaN(valor) || valor <= 0) {
        alert("Por favor, digite um valor válido.");
        return;
    }

    const descricao = prompt("Digite uma descrição (Ex: Pagamento de pacote antecipado):") || "Crédito antecipado";

    // Chama a função robusta que criamos antes
    adicionarMovimentacaoCliente(clienteId, 'CREDITO', valor, descricao);
    
    // Recarrega a listagem de clientes na tela
    carregarClientes();
    alert("Crédito adicionado com sucesso!");
}

// Função simples para exibir o extrato (pode usar alert formatado ou um modal leve)
function verExtrato(clienteId) {
    const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
    const cliente = clientes.find(c => c.id == clienteId);

    if (!cliente || !cliente.extrato || cliente.extrato.length === 0) {
        alert("Nenhum registro de extrato para este cliente ainda.");
        return;
    }

    // Pega os 10 mais recentes
    const extratoRecente = cliente.extrato.slice(0, 10);
    
    let mensagem = `Extrato de ${cliente.nome}\nSaldo Atual: R$ ${(cliente.saldoAtual || 0).toFixed(2).replace('.', ',')}\n\nÚltimas movimentações:\n-----------------------------------\n`;
    
    extratoRecente.forEach(item => {
        const sinal = item.tipo === 'CREDITO' ? '+' : '-';
        mensagem += `${item.data} | ${item.descricao}\n   -> ${sinal} R$ ${item.valor.toFixed(2).replace('.', ',')} (${item.tipo})\n\n`;
    });

    alert(mensagem);
}

// Salvar ou atualizar cliente no LocalStorage
function salvarCliente(event) {
    event.preventDefault();

    const id = document.getElementById("cliente-id").value;
    const nome = document.getElementById("cliente-nome").value.trim();
    const telefone = document.getElementById("cliente-telefone").value.trim();
    const recorrencia = document.getElementById("cliente-recorrencia").value;
    const clientePacote = document.getElementById("cliente-pacote").checked;
    
    const servicosPadrao = Array.from(document.querySelectorAll('input[name="cliente-servico"]:checked'))
                              .map(el => el.value);

    let clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];

    if (id) {
        // Editando cliente existente
        clientes = clientes.map(c => {
            if (c.id == Number(id)) {
                return {
                    ...c, // Mantém tudo o que já existe (incluindo saldoAtual, extrato, etc.)
                    nome,
                    telefone,
                    recorrencia,
                    servicosPadrao,
                    clientePacote
                    // Aqui entraremos com o campo de pacote em instantes
                };
            }
            return c;
        });
    } else {
        // Criando novo cliente
        const novoCliente = {
            id: Date.now(),
            nome,
            telefone,
            recorrencia,
            servicosPadrao,
            clientePacote,
            saldoAtual: 0, // Inicializa zerado para novos
            extrato: []    // Histórico vazio para novos
        };
        clientes.push(novoCliente);
    }

    localStorage.setItem("clientes_studio", JSON.stringify(clientes));
    
    // Limpar formulário, desmarcar checkboxes e recarregar lista
    document.getElementById("form-cliente").reset();
    document.getElementById("cliente-id").value = "";
    document.getElementById("cliente-pacote").checked = false; // <--- Adicionar esta linha
    document.querySelectorAll('input[name="cliente-servico"]').forEach(el => el.checked = false);
    carregarClientes();
}

// Renderizar lista de clientes na tela
function carregarClientes() {
    const container = document.getElementById("lista-clientes");
    if (!container) return;

    const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];

    if (clientes.length === 0) {
        container.innerHTML = `<p class="text-muted">Nenhum cliente cadastrado ainda.</p>`;
        return;
    }

    container.innerHTML = clientes.map(c => `
        <div class="item-card">
            <!-- Linha 1: Nome do Cliente e Ações -->
            <div class="item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="font-size: 1.1rem;">${c.nome}</strong>
                <div class="acoes-card" style="display: flex; gap: 4px;">
                    <button onclick="adicionarCreditoPrompt(${c.id})" class="btn-ico" title="Adicionar Crédito">💵</button>
                    <button onclick="verExtrato(${c.id})" class="btn-ico" title="Ver Extrato">📋</button>
                    <button onclick="editarCliente(${c.id})" class="btn-ico" title="Editar">✏️</button>
                    <button onclick="excluirCliente(${c.id})" class="btn-ico" title="Excluir">🗑️</button>
                </div>
            </div>
            
            <!-- Linha 2: Telefone e Recorrência -->
            <div class="item-badges" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
                <span class="tempo-badge">📞 ${c.telefone}</span>
                <span class="tempo-badge" style="background-color: #e3f2fd; color: #0d47a1;">🔄 ${c.recorrencia || 'Nenhuma'}</span>
                ${ c.clientePacote ? '<span class="tempo-badge" style="background-color: #e8f5e9; color: #2e7d32;">📦 Cliente de Pacote</span>' : '' }    
            </div>

            <!-- Linha dos Serviços Padrão / Combo -->
            <div class="item-badges" style="display: flex; gap: 6px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
                <span style="font-size: 0.85rem; color: #666; font-weight: 500;">Serviços:</span>
                ${ 
                    c.servicosPadrao && c.servicosPadrao.length > 0 
                    ? c.servicosPadrao.map(s => `<span class="tempo-badge" style="background-color: #f3e5f5; color: #4a148c;">✨ ${s}</span>`).join('') 
                    : '<span style="font-size: 0.85rem; color: #999; font-style: italic;">Nenhum serviço padrão</span>' 
                }
            </div>

            <!-- Linha 3: Saldo Atual em Destaque -->
            <div class="item-details" style="border-top: 1px solid #eee; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; color: ${(c.saldoAtual || 0) > 0 ? '#2e7d32' : '#555'};">
                    💰 Saldo em Conta: R$ ${(c.saldoAtual || 0).toFixed(2).replace('.', ',')}
                </span>
            </div>
        </div>
    `).join("");
}

// Preencher formulário para edição
function editarCliente(id) {
    const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
    const cliente = clientes.find(c => c.id == id);

    if (cliente) {
        document.getElementById("cliente-id").value = cliente.id;
        document.getElementById("cliente-nome").value = cliente.nome;
        document.getElementById("cliente-telefone").value = cliente.telefone;
        document.getElementById("cliente-recorrencia").value = cliente.recorrencia || "Nenhuma";
        document.getElementById("cliente-pacote").checked = !!cliente.clientePacote;
        
        // Garantir que os checkboxes estejam carregados e marcar os salvos
        carregarCheckboxesServicosCliente();
        setTimeout(() => {
            document.querySelectorAll('input[name="cliente-servico"]').forEach(el => {
                el.checked = cliente.servicosPadrao && cliente.servicosPadrao.includes(el.value);
            });
        }, 50);
        
        document.getElementById("form-cliente").scrollIntoView({ behavior: 'smooth' });
    }
}

// Excluir cliente com confirmação de segurança
function excluirCliente(id) {
    if (confirm("Deseja realmente excluir este cliente?")) {
        let clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
        clientes = clientes.filter(c => c.id != id);
        localStorage.setItem("clientes_studio", JSON.stringify(clientes));
        carregarClientes();
    }
}

// RF001 - Importar da agenda nativa do celular (Web Contacts API)
async function importarContatoNativo() {
    // Limpa os campos previamente para evitar dados residuais de importações anteriores
    document.getElementById("cliente-nome").value = "";
    document.getElementById("cliente-telefone").value = "";

    if ('contacts' in navigator && 'Navigator' in window && 'select' in window.ContactsManager.prototype) {
        try {
            const props = ['name', 'tel'];
            const opts = { multiple: false };
            const resultado = await navigator.contacts.select(props, opts);
            
            if (resultado && resultado.length > 0) {
                const contato = resultado[0];
                
                // Preenche o nome se existir
                if (contato.name && contato.name.length > 0) {
                    document.getElementById("cliente-nome").value = contato.name[0];
                }
                
                // Varredura inteligente de telefones (evita falhar se o principal não estiver na posição 0) 
                if (contato.tel && contato.tel.length > 0) {
                    let telefoneEncontrado = "";
                    
                    // Percorre todos os telefones salvos no contato até achar um válido
                    for (let t of contato.tel) {
                        if (t && t.trim() !== "") {
                            telefoneEncontrado = t;
                            break; // Encontrou o primeiro válido, pode parar
                        }
                    }

                    if (telefoneEncontrado) {
                        const inputTel = document.getElementById("cliente-telefone");
                        inputTel.value = telefoneEncontrado;
                        aplicarMascaraTelefone(inputTel);
                    }
                }
            }
        } catch (ex) {
            console.log("Importação cancelada ou não suportada neste navegador.", ex);
        }
    } else {
        alert("A importação automática de contatos não é suportada por este navegador (ex: Safari no iOS). Utilize o cadastro manual.");
    }
}

// --- MÓDULO DE SERVIÇOS (RF002 e RF006) ---

// Máscara simples para formato de moeda brasileira (R$)
function aplicarMascaraMoeda(input) {
    let v = input.value.replace(/\D/g, "");
    v = (v / 100).toFixed(2) + "";
    v = v.replace(".", ",");
    v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    input.value = v === "0,00" ? "" : v;
}

// Função para converter string monetária "R$" (ex: "40,00" ou "1.240,50") em float JS
function moedaParaFloat(valorStr) {
    if (!valorStr) return 0;
    // Remove pontos de milhar e substitui vírgula decimal por ponto
    let limpo = valorStr.replace(/\./g, "").replace(",", ".");
    return parseFloat(limpo) || 0;
}

// Função para formatar float em string monetária padrão BR
function floatParaMoeda(valorFloat) {
    return valorFloat.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function calcularPrecoPacote() {
    const inputNormal = document.getElementById('servico-preco-normal').value;
    const inputPercentual = parseFloat(document.getElementById('percentualDesconto').value) || 0;
    
    const valorNormal = moedaParaFloat(inputNormal);
    
    if (valorNormal > 0 && inputPercentual > 0) {
        // Cálculo: valor normal menos a porcentagem de desconto
        const sugestao = valorNormal - (valorNormal * (inputPercentual / 100));
        
        // Atualiza o campo de pacote formatado
        document.getElementById('servico-preco-pacote').value = floatParaMoeda(sugestao);
    }
}

// Salvar ou atualizar serviço no LocalStorage (incluindo o percentual)
function salvarServico(event) {
    event.preventDefault();

    const id = document.getElementById("servico-id").value;
    const nome = document.getElementById("servico-nome").value.trim();
    const tempo = document.getElementById("servico-tempo").value.trim();
    const precoNormal = document.getElementById("servico-preco-normal").value.trim();
    const percentualDesconto = document.getElementById("percentualDesconto").value.trim();
    const precoPacote = document.getElementById("servico-preco-pacote").value.trim();

    let servicos = JSON.parse(localStorage.getItem("servicos_studio")) || [];

    if (id) {
        // Editando serviço existente
        servicos = servicos.map(s => s.id == id ? { id, nome, tempo, precoNormal, percentualDesconto, precoPacote } : s);
    } else {
        // Criando novo serviço
        const novoServico = {
            id: Date.now(),
            nome,
            tempo,
            precoNormal,
            percentualDesconto,
            precoPacote
        };
        servicos.push(novoServico);
    }

    localStorage.setItem("servicos_studio", JSON.stringify(servicos));
    
    // Limpar formulário e recarregar lista
    document.getElementById("form-servico").reset();
    document.getElementById("servico-id").value = "";
    carregarServicos();
}

// Renderizar lista de serviços na tela (exibindo o percentual se houver)
function carregarServicos() {
    const container = document.getElementById("lista-servicos");
    if (!container) return;

    const servicos = JSON.parse(localStorage.getItem("servicos_studio")) || [];

    if (servicos.length === 0) {
        container.innerHTML = `<p class="text-muted">Nenhum serviço cadastrado ainda.</p>`;
        return;
    }

    container.innerHTML = servicos.map(s => `
        <div class="item-card">
            <!-- Linha 1: Nome do Serviço e Ações -->
            <div class="item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="font-size: 1.1rem;">${s.nome}</strong>
                <div class="acoes-card">
                    <button onclick="editarServico(${s.id})" class="btn-ico" title="Editar">✏️</button>
                    <button onclick="excluirServico(${s.id})" class="btn-ico" title="Excluir">🗑️</button>
                </div>
            </div>
            
            <!-- Linha 2: Tempo e Badge de Desconto -->
            <div class="item-badges" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
                <span class="tempo-badge">⏱️ ${s.tempo} min</span>
                ${s.percentualDesconto ? `<span class="tempo-badge" style="background-color: #e3f2fd; color: #0d47a1;">📉 ${s.percentualDesconto}% desc no pacote</span>` : ''}
            </div>

            <!-- Linha 3: Preços -->
            <div class="item-details" style="border-top: 1px solid #eee; padding-top: 6px;">
                <span>🏷️ Normal: R$ ${s.precoNormal}</span>
                <span class="separator">|</span>
                <span>📦 Pacote: R$ ${s.precoPacote}</span>
            </div>
        </div>
    `).join("");
}

// Preencher formulário para edição de serviço (resgatando o percentual)
function editarServico(id) {
    const servicos = JSON.parse(localStorage.getItem("servicos_studio")) || [];
    const servico = servicos.find(s => s.id == id);

    if (servico) {
        document.getElementById("servico-id").value = servico.id;
        document.getElementById("servico-nome").value = servico.nome;
        document.getElementById("servico-tempo").value = servico.tempo;
        document.getElementById("servico-preco-normal").value = servico.precoNormal;
        document.getElementById("percentualDesconto").value = servico.percentualDesconto || "";
        document.getElementById("servico-preco-pacote").value = servico.precoPacote;
        
        // Rolar para o topo do formulário de serviços
        document.getElementById("form-servico").scrollIntoView({ behavior: 'smooth' });
    }
}

// Excluir serviço
function excluirServico(id) {
    if (confirm("Deseja realmente excluir este serviço?")) {
        let servicos = JSON.parse(localStorage.getItem("servicos_studio")) || [];
        servicos = servicos.filter(s => s.id != id);
        localStorage.setItem("servicos_studio", JSON.stringify(servicos));
        carregarServicos();
    }
}

// --- MÓDULO DE AGENDA E ATENDIMENTOS ---

// Carregar clientes no select da agenda
function carregarSelectClientesAgenda() {
    const select = document.getElementById("agenda-cliente");
    if (!select) return;

    const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
    
    // Mantém a primeira opção padrão e recria as demais
    select.innerHTML = '<option value="">Selecione a cliente...</option>';
    
    clientes.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = c.nome;
        select.appendChild(option);
    });
}

// Executado ao alterar a cliente na agenda
function aoMudarClienteAgenda() {
    const clienteId = document.getElementById("agenda-cliente").value;
    const containerServicos = document.getElementById("container-servicos-agenda");
    containerServicos.innerHTML = ""; // Zera os serviços anteriores

    if (!clienteId) {
        atualizarTotalAgenda();
        return;
    }

    const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
    const cliente = clientes.find(c => c.id == clienteId);

    if (!cliente) return;

    // Se a cliente possui serviços padrão cadastrados, insere-os passando o nome exato
    if (cliente.servicosPadrao && cliente.servicosPadrao.length > 0) {
        cliente.servicosPadrao.forEach(nomeServico => {
            adicionarLinhaServicoAgenda(nomeServico, cliente.clientePacote);
        });
    }

    atualizarTotalAgenda();
}

// Adicionar linha de serviço dinamicamente no agendamento
function adicionarServicoRef(nomePredefinido = "", ehPacoteCliente = false) {
    adicionarLinhaServicoAgenda(nomePredefinido, ehPacoteCliente);
    atualizarTotalAgenda();
}

function adicionarServicoExtraAgenda() {
    const clienteId = document.getElementById("agenda-cliente").value;
    let ehPacote = false;

    if (clienteId) {
        const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
        const cliente = clientes.find(c => c.id == clienteId);
        if (cliente) ehPacote = cliente.clientePacote;
    }

    adicionarLinhaServicoAgenda("", ehPacote);
    atualizarTotalAgenda();
}

function adicionarLinhaServicoAgenda(nomeSelecionado = "", ehPacote = false) {
    const container = document.getElementById("container-servicos-agenda");
    const servicosCadastrados = JSON.parse(localStorage.getItem("servicos_studio")) || [];

    let precoInicial = 0;
    
    // Só calcula preço inicial se um serviço específico foi passado (ex: serviço padrão da cliente)
    if (nomeSelecionado) {
        const servObj = servicosCadastrados.find(s => s.nome === nomeSelecionado);
        if (servObj) {
            const valorBruto = ehPacote ? servObj.precoPacote : servObj.precoNormal;
            const valorStr = String(valorBruto || "0").replace(',', '.');
            precoInicial = Number(valorStr) || 0;
        }
    } 
    // Se não passou nome (botão "Adicionar Outro Serviço"), entra limpo com valor 0.00

    const div = document.createElement("div");
    div.className = "item-servico-agenda";
    div.style.cssText = "display: grid; grid-template-columns: 1fr 75px auto; gap: 6px; align-items: center; background: #fafafc; padding: 8px; border-radius: 8px; border: 0.5px solid var(--border-color); width: 100%; box-sizing: border-box;";
    
    div.innerHTML = `
        <select class="select-servico-item" onchange="atualizarPrecoServicoItem(this)" style="width: 100%; min-width: 0; padding: 10px 8px; font-size: 0.9rem; text-overflow: ellipsis;">
            <option value="">Selecione o serviço...</option>
            ${servicosCadastrados.map(s => `
                <option value="${s.nome}" ${s.nome === nomeSelecionado ? 'selected' : ''}>${s.nome}</option>
            `).join('')}
        </select>
        <input type="number" step="0.01" class="input-preco-item" value="${precoInicial.toFixed(2)}" oninput="atualizarTotalAgenda()" style="width: 100%; text-align: right; padding: 10px 6px; font-size: 0.9rem; box-sizing: border-box;">
        <button type="button" onclick="removerLinhaServico(this)" class="btn-ico" title="Remover" style="color: #d9534f; font-size: 1.1rem; background: none; border: none; cursor: pointer; padding: 4px;">🗑️</button>
    `;

    container.appendChild(div);
    atualizarTotalAgenda();
}

// Atualizar preço automaticamente ao trocar o select do serviço na linha
function atualizarPrecoServicoItem(selectElement) {
    const nomeServico = selectElement.value;
    // Acha o container da linha atual (o card do item)
    const linhaItem = selectElement.closest(".item-servico-agenda");
    const inputPreco = linhaItem.querySelector(".input-preco-item");

    if (!nomeServico) {
        inputPreco.value = "0.00";
        atualizarTotalAgenda();
        return;
    }

    const servicosCadastrados = JSON.parse(localStorage.getItem("servicos_studio")) || [];
    const servObj = servicosCadastrados.find(s => s.nome === nomeServico);

    if (servObj) {
        // Verifica se a cliente atual é pacote (você pode ajustar conforme a lógica de pacote da sua agenda)
        const clienteId = document.getElementById("agenda-cliente").value;
        const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
        const cliente = clientes.find(c => c.id == clienteId);
        const ehPacote = cliente ? cliente.clientePacote : false;

        const valorBruto = ehPacote ? servObj.precoPacote : servObj.precoNormal;
        const valorStr = String(valorBruto || "0").replace(',', '.');
        const preco = Number(valorStr) || 0;

        inputPreco.value = preco.toFixed(2);
    } else {
        inputPreco.value = "0.00";
    }

    atualizarTotalAgenda();
}

function removerLinhaServico(botao) {
    botao.closest('.item-servico-agenda').remove();
    atualizarTotalAgenda();
}

// Calcular total em tempo real
function atualizarTotalAgenda() {
    const inputsPreco = document.querySelectorAll('.input-preco-item');
    let total = 0;

    inputsPreco.forEach(input => {
        const valor = parseFloat(input.value) || 0;
        total += valor;
    });

    const labelTotal = document.getElementById("label-total-agenda");
    if (labelTotal) {
        labelTotal.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    }
}

// Salvar Agendamento com Confirmação e Limite de 200 Registros
function salvarAgendamento(event) {
    event.preventDefault();

    const clienteId = document.getElementById("agenda-cliente").value;
    const data = document.getElementById("agenda-data").value;
    const horario = document.getElementById("agenda-horario").value;

    if (!clienteId || !data || !horario) {
        alert("Por favor, preencha a cliente, data e horário.");
        return;
    }

    const linhasServicos = document.querySelectorAll('.item-servico-agenda');
    if (linhasServicos.length === 0) {
        alert("Adicione pelo menos um serviço ao atendimento.");
        return;
    }

    let servicosAtendimento = [];
    let totalAtendimento = 0;

    linhasServicos.forEach(linha => {
        const nomeServico = linha.querySelector('.select-servico-item').value;
        const precoServico = parseFloat(linha.querySelector('.input-preco-item').value) || 0;

        if (nomeServico) {
            servicosAtendimento.push({ nome: nomeServico, preco: precoServico });
            totalAtendimento += precoServico;
        }
    });

    if (servicosAtendimento.length === 0) {
        alert("Selecione um serviço válido para o agendamento.");
        return;
    }

    // Confirmação para evitar salvamento acidental
    const confirmar = confirm(`Deseja realmente confirmar este agendamento no valor total de R$ ${totalAtendimento.toFixed(2).replace('.', ',')}?`);
    if (!confirmar) return;

    let agendamentos = JSON.parse(localStorage.getItem("agendamentos_studio")) || [];
    
    const novoAgendamento = {
        id: Date.now(),
        clienteId: Number(clienteId),
        data,
        horario,
        servicos: servicosAtendimento,
        total: totalAtendimento,
        status: 'Pendente' // Para controle futuro de cronômetro/conclusão
    };

    // Trava de segurança: Se já houver 200 ou mais, remove o mais antigo (o primeiro da lista)
    if (agendamentos.length >= 200) {
        agendamentos.shift(); 
    }

    agendamentos.push(novoAgendamento);
    localStorage.setItem("agendamentos_studio", JSON.stringify(agendamentos));

    alert("Agendamento salvo com sucesso!");
    
    // Limpar formulário
    document.getElementById("form-agendamento").reset();
    document.getElementById("container-servicos-agenda").innerHTML = "";
    atualizarTotalAgenda();
    carregarAgendamentos();
}

// Função placeholder para listar agendamentos salvos (evita erro se chamada)
function carregarAgendamentos() {
    const container = document.getElementById("lista-agendamentos");
    if (!container) return;
    
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos_studio")) || [];
    const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];

    if (agendamentos.length === 0) {
        container.innerHTML = `<p class="text-muted">Nenhum agendamento cadastrado ainda.</p>`;
        return;
    }

    // 1. Definimos o corte de 2 dias atrás para manter a tela limpa e rápida
    const hoje = new Date();
    const doisDiasAtras = new Date();
    doisDiasAtras.setDate(hoje.getDate() - 2);

    // 2. Filtramos os recentes e invertemos (último cadastrado no topo)
    const agendamentosExibidos = agendamentos
        .filter(ag => {
            const dataAg = new Date(ag.data);
            return dataAg >= doisDiasAtras;
        })
        .reverse();

    if (agendamentosExibidos.length === 0) {
        container.innerHTML = `<p class="text-muted">Sem agendamentos recentes (últimos 2 dias).</p>`;
        return;
    }

    container.innerHTML = agendamentosExibidos.map(ag => {
        const clienteObj = clientes.find(c => c.id === ag.clienteId);
        const nomeCliente = clienteObj ? clienteObj.nome : "Cliente não encontrada";
        
        return `
            <div class="item-card">
                <div class="item-header">
                    <strong>${nomeCliente}</strong>
                    <span class="tempo-badge" style="background-color: #fff3e5; color: #b8860b;">📅 ${ag.data} às ${ag.horario}</span>
                </div>
                <div class="item-badges" style="font-size: 0.85rem; color: #555;">
                    Serviços: ${ag.servicos.map(s => `${s.nome} (R$ ${s.preco.toFixed(2).replace('.', ',')})`).join(', ')}
                </div>
                <div class="item-details" style="border-top: 1px solid #eee; padding-top: 6px; justify-content: space-between;">
                    <span style="font-weight: bold; color: #2e7d32;">Total: R$ ${ag.total.toFixed(2).replace('.', ',')}</span>
                    <button onclick="excluirAgendamento(${ag.id})" class="btn-ico" title="Excluir">🗑️</button>
                </div>
            </div>
        `;
    }).join("");
}

function excluirAgendamento(id) {
    if (!confirm("Deseja excluir este agendamento?")) return;
    let agendamentos = JSON.parse(localStorage.getItem("agendamentos_studio")) || [];
    agendamentos = agendamentos.filter(a => a.id !== id);
    localStorage.setItem("agendamentos_studio", JSON.stringify(agendamentos));
    carregarAgendamentos();
}

function obterAgendamentosAlertas() {
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos_studio")) || [];
    
    // Pega a data de hoje no formato YYYY-MM-DD
    const hoje = new Date().toISOString().split('T')[0];
    
    // Pega a data de amanhã
    const dataAmanha = new Date();
    dataAmanha.setDate(dataAmanha.getDate() + 1);
    const amanha = dataAmanha.toISOString().split('T')[0];

    // Filtra quem é para hoje ou para amanhã
    const alertasDoDia = agendamentos.filter(a => a.data === hoje);
    const alertasAmanha = agendamentos.filter(a => a.data === amanha);

    return { hoje: alertasDoDia, amanha: alertasAmanha };
}

function renderizarPainelAlertasWhatsApp() {
    const { hoje, amanha } = obterAgendamentosAlertas();
    const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];

    // Função auxiliar para buscar o telefone do cliente pelo nome ou ID
    function buscarTelefone(nomeCliente) {
        const cliente = clientes.find(c => c.nome === nomeCliente);
        return cliente ? cliente.telefone : "";
    }

    // Exemplo de como montar a mensagem com link direto do WhatsApp (wa.me)
    function gerarLinkWhatsApp(telefone, nomeCliente, data, horario, servicos) {
        // Remove tudo que não for número do telefone
        const telLimpo = telefone.replace(/\D/g, '');
        const mensagem = `Olá ${nomeCliente}, passando para lembrar do nosso agendamento amanhã (${data}) às ${horario} para o(s) serviço(s): ${servicos}. Te espero no estúdio! ✨`;
        
        return `https://api.whatsapp.com/send?phone=55${telLimpo}&text=${encodeURIComponent(mensagem)}`;
    }

    // Aqui você injeta esses dados no HTML da sua interface de lembretes/alertas
    console.log("Agendamentos para hoje:", hoje);
    console.log("Agendamentos para amanhã:", amanha);
}

// Abre/fecha o menu lateral
function toggleMenuLateral() {
    const menu = document.getElementById('menu-lateral');
    const painel = document.getElementById('painel-gaveta');
    
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Trava a rolagem do fundo
        setTimeout(() => {
            menu.style.opacity = '1';
            painel.style.transform = 'translateX(0)';
        }, 10);
    } else {
        menu.style.opacity = '0';
        painel.style.transform = 'translateX(100%)';
        setTimeout(() => {
            menu.style.display = 'none';
            document.body.style.overflow = ''; // Restaura a rolagem do fundo
        }, 300);
    }
}

// Função para gerenciar a troca de abas (ajuste para o seu padrão atual de abas)
function mudarAba(nomeAba) {
    // 1. Esconde todas as abas e ativa a escolhida
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const abaAlvo = document.getElementById('tab-' + nomeAba);
    if (abaAlvo) {
        abaAlvo.classList.add('active');
    }

    // 2. Sincroniza visualmente os botões do menu inferior (rodapé)
    document.querySelectorAll('nav.bottom-nav button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(nomeAba)) {
            btn.classList.add('active');
        }
    });

    // 3. Volta o scroll do container pro topo ao trocar de aba
    const container = document.querySelector('.container');
    if (container) {
        container.scrollTop = 0;
    }
}

// Renderiza a lista na tela de avisos usando o padrão CSS oficial do studio
function mostrarAgendaWhatsApp(tipo) {
    const container = document.getElementById("lista-whatsapp-container");
    const btnHoje = document.getElementById("btn-hoje");
    const btnAmanha = document.getElementById("btn-amanha");
    
    if (!container || !btnHoje || !btnAmanha) return;

    if (tipo === 'hoje') {
        btnHoje.className = "btn-primary";
        btnAmanha.className = "btn-secondary";
    } else {
        btnAmanha.className = "btn-primary";
        btnHoje.className = "btn-secondary";
    }

    const agendamentos = JSON.parse(localStorage.getItem("agendamentos_studio")) || [];
    const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
    
    function formatarDataLocal(dataObj) {
        const ano = dataObj.getFullYear();
        const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
        const dia = String(dataObj.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    }

    const hojeObj = new Date();
    const hojeStr = formatarDataLocal(hojeObj);
    
    const amanhaObj = new Date();
    amanhaObj.setDate(hojeObj.getDate() + 1);
    const amanhaStr = formatarDataLocal(amanhaObj);

    const dataAlvo = tipo === 'hoje' ? hojeStr : amanhaStr;
    const tituloSecao = tipo === 'hoje' ? 'hoje' : 'amanhã';
    const tituloExibicao = tipo === 'hoje' ? 'de Hoje' : 'para Amanhã';

    const listaFiltrada = agendamentos.filter(a => a.data === dataAlvo);

    if (listaFiltrada.length === 0) {
        container.innerHTML = `<p class="text-muted">Nenhum agendamento ${tituloExibicao.toLowerCase()}.</p>`;
        return;
    }

    // Ícone SVG preenchido em branco para destacar perfeitamente sobre o fundo verde do botão
    const svgWhatsApp = `<svg viewBox="0 0 24 24" width="26" height="26" fill="#ffffff" style="flex-shrink: 0;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;

    let htmlItens = listaFiltrada.map(ag => {
        const clienteObj = clientes.find(c => c.id === ag.clienteId || c.nome === ag.cliente);
        const telefone = clienteObj ? clienteObj.telefone : "";
        const telLimpo = telefone.replace(/\D/g, '');
        
        let telefoneFormatado = telefone;
        if (telLimpo.length >= 10) {
            const ddd = telLimpo.substring(0, 2);
            const parte1 = telLimpo.length === 11 ? telLimpo.substring(2, 7) : telLimpo.substring(2, 6);
            const parte2 = telLimpo.length === 11 ? telLimpo.substring(7) : telLimpo.substring(6);
            telefoneFormatado = `(${ddd}) ${parte1}-${parte2}`;
        }
        
        const servicosStr = Array.isArray(ag.servicos) 
            ? ag.servicos.map(s => s.nome || s).join(', ') 
            : (ag.servicos || 'Serviço');
        
        const nomeClienteExibicao = clienteObj ? clienteObj.nome : (ag.cliente || 'Cliente');
        
        const mensagem = `Olá ${nomeClienteExibicao}, passando para lembrar do nosso agendamento ${tituloSecao} (${ag.data.split('-').reverse().join('/')}) às ${ag.horario} para: ${servicosStr}. Te espero no estúdio! ✨`;
        const linkWp = telLimpo ? `https://api.whatsapp.com/send?phone=55${telLimpo}&text=${encodeURIComponent(mensagem)}` : '#';

        return `
            <div class="item-card">
                <div class="item-header">
                    <strong>${nomeClienteExibicao}</strong>
                    <span class="tempo-badge">🕒 ${ag.horario} | 📅 ${ag.data.split('-').reverse().join('/')}</span>
                </div>
                <div style="font-size: 0.85rem; color: #555;">Serviços: ${servicosStr}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 0.5px solid var(--border-color); padding-top: 8px; margin-top: 4px;">
                    <span style="font-weight: bold; color: #2e7d32; font-size: 0.9rem;">Total: R$ ${ag.total ? ag.total.toFixed(2).replace('.', ',') : '0,00'}</span>
                </div>
                ${telLimpo ? `
                    <a href="${linkWp}" target="_blank" style="display: flex; align-items: center; justify-content: flex-start; gap: 14px; background: #22c55e; color: white; padding: 10px 18px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 0.9rem; margin-top: 8px; box-shadow: 0 2px 6px rgba(34, 197, 94, 0.18);">
                        ${svgWhatsApp}
                        <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.2;">
                            <span>Enviar WhatsApp</span>
                            <span style="font-size: 0.8rem; font-weight: normal; opacity: 0.95;">${telefoneFormatado}</span>
                        </div>
                    </a>
                ` : `
                    <span style="color: #d9534f; font-size: 0.8rem; font-weight: 500; margin-top: 6px;">⚠️ Cliente sem telefone cadastrado</span>
                `}
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <h2 style="font-size: 1rem; margin: 16px 0 12px 0;">Registros ${tituloExibicao}</h2>
        <div class="lista-container">
            ${htmlItens}
        </div>
    `;    
}