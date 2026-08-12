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

// Inicialização do app
document.addEventListener('DOMContentLoaded', () => {
    console.log("Loide Vieira Nails Studio - App Inicializado com Sucesso! 💅🚀");
    carregarClientes();
    carregarCheckboxesServicosCliente();
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

// Carregar serviços salvos ao iniciar a aplicação
document.addEventListener("DOMContentLoaded", () => {
    carregarServicos();
});

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