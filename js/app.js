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

    // Força a inicialização do template padrão se não houver um salvo
    if (!localStorage.getItem("template_ativo_id")) {
        definirTemplatePadrao(1);
    }

    atualizarVisualTemplates(parseInt(localStorage.getItem("template_ativo_id")));
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
function adicionarMovimentacaoCliente(clientId, tipo, valor, descricao, dataCustomizada = null) {
    let clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
    
    clientes = clientes.map(c => {
        if (c.id == clientId) {
            // Garante que o saldo existe
            c.saldoAtual = c.saldoAtual || 0;

            if (tipo === 'CREDITO') {
                c.saldoAtual += valor;
            } else if (tipo === 'DEBITO') {
                c.saldoAtual -= valor;
            } 

            // Usa a data customizada (do agendamento) se fornecida, senão pega a de hoje do sistema
            const dataLancamento = dataCustomizada || new Date().toISOString().split('T')[0];

            // Cria o novo lançamento
            const novoLancamento = {
                data: dataLancamento, // YYYY-MM-DD
                tipo: tipo, // 'CREDITO', 'DEBITO' ou 'HISTORICO'
                valor: valor,
                descricao: descricao
            };

            // Inicializa o extrato se não existir
            c.extrato = c.extrato || [];

            // Adiciona no início do array
            c.extrato.unshift(novoLancamento);

            // PERFORMANCE: Mantém no máximo os últimos 20 registros salvos
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
    const genero = document.getElementById("cliente-genero").value; // <--- Novo campo
    const aniversarioCompleto = document.getElementById("cliente-aniversario").value; 
    const aniversario = aniversarioCompleto ? aniversarioCompleto.slice(5) : ""; 
    const clientePacote = document.getElementById("cliente-pacote").checked;
    
    const servicosPadrao = Array.from(document.querySelectorAll('input[name="cliente-servico"]:checked'))
                                .map(el => el.value);

    let clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];

    if (id) {
        // Editando cliente existente
        clientes = clientes.map(c => {
            if (c.id == Number(id)) {
                return {
                    ...c,
                    nome,
                    telefone,
                    recorrencia,
                    genero, // <--- Atualiza gênero
                    servicosPadrao,
                    clientePacote,
                    aniversario
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
            genero, // <--- Salva gênero (F ou M)
            servicosPadrao,
            clientePacote,
            aniversario,
            saldoAtual: 0,
            extrato: []
        };
        clientes.push(novoCliente);
    }

    localStorage.setItem("clientes_studio", JSON.stringify(clientes));
    
    // Limpar formulário, redefinir gênero para 'F' e recarregar lista
    document.getElementById("form-cliente").reset();
    document.getElementById("cliente-id").value = "";
    document.getElementById("cliente-genero").value = "F"; // <--- Reseta para o padrão
    document.getElementById("cliente-aniversario").value = "";
    document.getElementById("cliente-pacote").checked = false;
    document.querySelectorAll('input[name="cliente-servico"]').forEach(el => el.checked = false);
    
    // Atualiza o label dinâmico do formulário
    atualizarLabelServicosCliente("F");

    carregarClientes();
    carregarSelectClientesAgenda();
}

// Renderizar lista de clientes na tela
function carregarClientes() {
    const container = document.getElementById("lista-clientes");
    if (!container) return;

    let clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];

    // Captura o valor do campo de busca e converte para minúsculas
    const termoFiltro = document.getElementById("filtro-cliente") ? document.getElementById("filtro-cliente").value.toLowerCase() : "";

    // Filtra a lista com base no nome ou no telefone
    const clientesFiltrados = clientes.filter(c => {
        const nomeMatch = c.nome && c.nome.toLowerCase().includes(termoFiltro);
        const telMatch = c.telefone && c.telefone.toLowerCase().includes(termoFiltro);
        return nomeMatch || telMatch;
    });

    if (clientesFiltrados.length === 0) {
        container.innerHTML = `<p class="text-muted" style="text-align: center; padding: 20px;">Nenhum cliente encontrado.</p>`;
        return;
    }

    // Opcional: Ordena alfabeticamente para facilitar a localização
    clientesFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));

    container.innerHTML = clientesFiltrados.map(c => {
        // Define um gênero padrão 'F' caso o cliente seja antigo e não tenha o campo salvo
        const generoCliente = c.genero || 'F';
        const iconeGenero = generoCliente === 'M' ? '👨' : '👩';

        return `
        <div class="item-card">
            <!-- Linha 1: Nome do Cliente, Ícone de Gênero e Ações -->
            <div class="item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="font-size: 1.1rem;">${iconeGenero} ${c.nome}</strong>
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
                ${ c.aniversario ? `<span class="tempo-badge" style="background-color: #fff3e0; color: #e65100;" title="Data de Aniversário">🎂 ${c.aniversario.split('-').reverse().join('/')}</span>` : '' }
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
    `;
    }).join("");
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
        document.getElementById("cliente-genero").value = cliente.genero || "F"; // <--- Carrega gênero salvo
        document.getElementById("cliente-aniversario").value = cliente.aniversario ? `2024-${cliente.aniversario}` : "";
        document.getElementById("cliente-pacote").checked = !!cliente.clientePacote;
        
        // Atualiza o texto do label dinamicamente com base no gênero carregado
        atualizarLabelServicosCliente(cliente.genero || "F");
        
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

// Ouve a alteração no select de gênero para mudar o texto do label em tempo real
document.addEventListener("DOMContentLoaded", () => {
    const selectGenero = document.getElementById("cliente-genero");
    if (selectGenero) {
        selectGenero.addEventListener("change", (e) => {
            atualizarLabelServicosCliente(e.target.value);
        });
    }
});

function atualizarLabelServicosCliente(genero) {
    const label = document.getElementById("label-servicos-cliente");
    if (label) {
        if (genero === "M") {
            label.textContent = "Serviços Padrão / Combo do Cliente:";
        } else {
            label.textContent = "Serviços Padrão / Combo da Cliente:";
        }
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

// Carregar clientes no select da agenda em ordem alfabética
function carregarSelectClientesAgenda() {
    const select = document.getElementById("agenda-cliente");
    if (!select) return;

    const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
    
    // Ordena as clientes alfabeticamente pelo nome (ignorando maiúsculas/minúsculas e acentos)
    clientes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

    // Mantém a primeira opção padrão e recria as demais ordenadas
    select.innerHTML = '<option value="">Selecione a cliente...</option>';
    
    clientes.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = c.nome;
        select.appendChild(option);
    });

    // Limpa o campo de busca rápida sempre que o select for recarregado
    const inputFiltroRapido = document.getElementById("filtro-rapido-cliente");
    if (inputFiltroRapido) inputFiltroRapido.value = "";
}

// Função para filtrar as opções do select de clientes em tempo real por digitação
function filtrarSelectClientes(termo) {
    const select = document.getElementById("agenda-cliente");
    if (!select) return;

    const termoLower = termo.toLowerCase().trim();
    const options = select.options;

    for (let i = 1; i < options.length; i++) {
        const textoOpcao = options[i].text.toLowerCase();
        // Se o texto da opção inclui o termo digitado, exibe; caso contrário, oculta
        if (textoOpcao.includes(termoLower)) {
            options[i].style.display = "";
        } else {
            options[i].style.display = "none";
        }
    }
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

// Salvar ou Atualizar Agendamento com Confirmação e Limite de 600 Registros
function salvarAgendamento(event) {
    event.preventDefault();

    const selectCliente = document.getElementById("agenda-cliente");
    const clienteId = selectCliente.value;
    const nomeCliente = selectCliente.options[selectCliente.selectedIndex].text;
    
    const data = document.getElementById("agenda-data").value;
    const horario = document.getElementById("agenda-horario").value;
    const idEdicao = document.getElementById("agendamento-id").value; // Pega o ID oculto para saber se é edição

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

    // Formata a data de YYYY-MM-DD para DD/MM/YYYY para melhorar a leitura
    const [ano, mes, dia] = data.split('-');
    const dataFormatada = `${dia}/${mes}/${ano}`;

    // Mensagem dinâmica de confirmação (se é novo ou atualização)
    const acaoTexto = idEdicao ? "atualizar o agendamento" : "confirmar o agendamento";
    const confirmar = confirm(`Deseja realmente ${acaoTexto} de ${nomeCliente} em ${dataFormatada} às ${horario} h no valor total de R$ ${totalAtendimento.toFixed(2).replace('.', ',')}?`);
    if (!confirmar) return;

    let agendamentos = JSON.parse(localStorage.getItem("agendamentos_studio")) || [];
    
    if (idEdicao) {
        // --- MODO EDIÇÃO ---
        const index = agendamentos.findIndex(a => a.id == idEdicao);
        if (index !== -1) {
            agendamentos[index] = {
                ...agendamentos[index], // Preserva ID original e status
                clienteId: Number(clienteId),
                data,
                horario,
                servicos: servicosAtendimento,
                total: totalAtendimento
            };
        }
    } else {
        // --- MODO NOVO CADASTRO ---
        const novoAgendamento = {
            id: Date.now(),
            clienteId: Number(clienteId),
            data,
            horario,
            servicos: servicosAtendimento,
            total: totalAtendimento,
            status: 'Pendente'
        };

        // Trava de segurança: Se já houver 600 ou mais, remove o mais antigo
        if (agendamentos.length >= 600) {
            agendamentos.shift(); 
        }

        agendamentos.push(novoAgendamento);
    }

    localStorage.setItem("agendamentos_studio", JSON.stringify(agendamentos));
    
    // Limpar formulário e resetar o campo oculto de ID e textos do botão
    document.getElementById("form-agendamento").reset();
    document.getElementById("agendamento-id").value = "";
    document.getElementById("container-servicos-agenda").innerHTML = "";
    
    // Reseta visualmente o título e o botão para o modo padrão "Novo Agendamento"
    const formCard = document.querySelector("#form-agendamento").closest(".card");
    const tituloCard = formCard.querySelector("h2");
    if (tituloCard) tituloCard.innerText = "Novo Agendamento";
    
    const btnSubmit = document.querySelector("#form-agendamento button[type='submit']");
    if (btnSubmit) btnSubmit.innerText = "Salvar Agendamento";

    if (typeof atualizarTotalAgenda === 'function') atualizarTotalAgenda();
    carregarAgendamentos();
    
    alert(idEdicao ? "Agendamento atualizado com sucesso!" : "Agendamento cadastrado com sucesso!");
}

function carregarAgendamentos() {
    const container = document.getElementById("lista-agendamentos");
    if (!container) return;
    
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos_studio")) || [];
    const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];

    const avisoFiltro = document.getElementById("aviso-filtro-ativo");

    if (agendamentos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 15px 0;">
                <span style="font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Receita</span>
                <div style="font-size: 1.5rem; font-weight: bold; color: #333; margin-top: 2px;">R$ 0,00</div>
            </div>
            <p class="text-muted" style="margin-top: 15px;">Nenhum agendamento cadastrado ainda.</p>
        `;
        if (avisoFiltro) avisoFiltro.style.display = "none";
        return;
    }

    // Pega o valor do input de filtro de data
    const inputFiltro = document.getElementById("filtro-data-agenda");
    const dataFiltroSelecionada = inputFiltro ? inputFiltro.value : "";

    let agendamentosExibidos = [...agendamentos];

    // Pega a data de hoje respeitando o fuso horário local
    const hojeObj = new Date();
    const anoLocal = hojeObj.getFullYear();
    const mesLocal = String(hojeObj.getMonth() + 1).padStart(2, '0');
    const diaLocal = String(hojeObj.getDate()).padStart(2, '0');
    const dataHojeStr = `${anoLocal}-${mesLocal}-${diaLocal}`;

    if (dataFiltroSelecionada) {
        agendamentosExibidos = agendamentosExibidos.filter(ag => ag.data === dataFiltroSelecionada);
        
        if (avisoFiltro) {
            avisoFiltro.style.display = "flex";
            const dataFmt = dataFiltroSelecionada.split('-').reverse().join('/');
            const spanData = document.getElementById("label-data-filtrada");
            if (spanData) spanData.textContent = dataFmt;
        }
    } else {
        agendamentosExibidos = agendamentosExibidos.filter(ag => ag.data === dataHojeStr);
        if (avisoFiltro) avisoFiltro.style.display = "none";
    }

    // Calcula o valor total (receita) da data exibida, ignorando os agendamentos com status 'Falta'
    const valorTotalDia = agendamentosExibidos.reduce((acc, ag) => {
        if (ag.status === 'Falta') {
            return acc; // Não soma se for falta
        }
        return acc + (ag.total || 0);
    }, 0);
    const valorFormatadoDia = valorTotalDia.toFixed(2).replace('.', ',');

    // Monta o cabeçalho com o bloco de Receita estilo o print
    let htmlCabecalho = `
        <div style="text-align: center; padding: 10px 0 15px 0; border-bottom: 1px solid #eee; margin-bottom: 15px;">
            <span style="font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Receita</span>
            <div style="font-size: 1.6rem; font-weight: bold; color: #222; margin-top: 2px;">R$ ${valorFormatadoDia}</div>
        </div>
    `;

    // Ordena cronologicamente: primeiro por data, depois por horário
    agendamentosExibidos.sort((a, b) => {
        if (a.data !== b.data) {
            return a.data.localeCompare(b.data);
        }
        return a.horario.localeCompare(b.horario);
    });

    if (agendamentosExibidos.length === 0) {
        const msgVazia = dataFiltroSelecionada 
            ? `Nenhum agendamento encontrado para a data ${dataFiltroSelecionada.split('-').reverse().join('/')}.` 
            : "Sem agendamentos para hoje.";
        
        container.innerHTML = htmlCabecalho + `<p class="text-muted" style="text-align: center;">${msgVazia}</p>`;
        return;
    }

    const htmlCards = agendamentosExibidos.map(ag => {
        const clienteObj = clientes.find(c => c.id === ag.clienteId);
        const nomeCliente = clienteObj ? clienteObj.nome : "Cliente não encontrada";
        const telefoneCliente = clienteObj ? clienteObj.telefone : "";
        const dataFormatadaExibicao = ag.data ? ag.data.split('-').reverse().join('/') : "";
        const nomesServicosStr = ag.servicos ? ag.servicos.map(s => s.nome).join(', ') : "";
        
        const isConfirmado = ag.status === 'Confirmado';
        const isFalta = ag.status === 'Falta';
        
        let estiloCard = 'border-left: 4px solid #3b82f6; background-color: #f8fafc;'; 
        let estiloCheckBtn = 'background: #eff6ff; border-radius: 4px;'; 

        if (isConfirmado) {
            estiloCard = 'border-left: 4px solid #22c55e; background-color: #f4fbf7;'; 
            estiloCheckBtn = 'background: #d1fae5; border-radius: 4px;'; 
        } else if (isFalta) {
            estiloCard = 'border-left: 4px solid #ef4444; background-color: #fef2f2;'; 
            estiloCheckBtn = 'background: #fee2e2; border-radius: 4px;'; 
        }

        let iconeAniversario = "";
        if (clienteObj && clienteObj.aniversario && ag.data) {
            if (ag.data.slice(5) === clienteObj.aniversario) {
                iconeAniversario = '<span class="tempo-badge" style="background-color: #fff3e0; color: #e65100; margin-right: 4px;" title="Aniversariante do dia!">🎂</span>';
            }
        }
        
        const svgWhatsAppCard = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#22c55e" style="display: inline-block; vertical-align: middle; margin-top: -1px;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;
        const btnWhatsapp = `<button type="button" class="btn-ico" onclick="dispararWhatsappDireto('${telefoneCliente}', '${nomeCliente.replace(/'/g, "\\'")}', '${ag.data}', '${ag.horario}', '${nomesServicosStr.replace(/'/g, "\\'")}')" title="Enviar WhatsApp de Atendimento">${svgWhatsAppCard}</button>`;
        
        return `
            <div class="item-card" style="${estiloCard}">
                <div>
                    <div class="item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <strong style="font-size: 1rem;" title="${nomeCliente}">${nomeCliente}</strong>
                        <span class="tempo-badge" style="background-color: #fff3e5; color: #b8860b;">📅 ${dataFormatadaExibicao} às ${ag.horario}</span>
                    </div>
                    <div class="item-badges" style="font-size: 0.85rem; color: #555; margin-bottom: 6px;">
                        Serviços: ${ag.servicos.map(s => `${s.nome} (R$ ${s.preco.toFixed(2).replace('.', ',')})`).join(', ')}
                    </div>
                    <div class="item-details" style="border-top: 1px solid #eee; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; color: #2e7d32;">Total: R$ ${ag.total.toFixed(2).replace('.', ',')}</span>
                        <div class="acoes-card" style="display: flex; gap: 4px; align-items: center;">
                            ${btnWhatsapp}
                            ${iconeAniversario}
                            <button type="button" class="btn-ico" onclick="abrirModalAcao(${ag.id}, '${nomeCliente.replace(/'/g, "\\'")}', '${nomesServicosStr.replace(/'/g, "\\'")}')" title="Gerenciar Atendimento" style="${estiloCheckBtn}">✅</button>
                            <button type="button" class="btn-ico" onclick="abrirEdicaoAgendamento(${ag.id})" title="Editar Agendamento">✏️</button>
                            <button type="button" class="btn-ico" onclick="excluirAgendamento(${ag.id})" title="Excluir">🗑️</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    container.innerHTML = htmlCabecalho + htmlCards;
}

// Função auxiliar para limpar o filtro rapidamente
function limparFiltroAgenda() {
    const inputFiltro = document.getElementById("filtro-data-agenda");
    if (inputFiltro) inputFiltro.value = "";
    carregarAgendamentos();
}

function abrirEdicaoAgendamento(id) {
    let agendamentos = JSON.parse(localStorage.getItem("agendamentos_studio")) || [];
    const agendamento = agendamentos.find(a => a.id === id);
    if (!agendamento) return;

    // 1. Seta o ID oculto para o salvamento reconhecer que é uma edição
    document.getElementById("agendamento-id").value = agendamento.id;

    // 2. Preenche cliente, data e horário
    document.getElementById("agenda-cliente").value = agendamento.clienteId;
    document.getElementById("agenda-data").value = agendamento.data;
    document.getElementById("agenda-horario").value = agendamento.horario;

    // 3. Limpa o container de serviços
    const container = document.getElementById("container-servicos-agenda");
    container.innerHTML = "";

    // 4. Recria as linhas de serviço já injetando o nome E o preço salvo corretamente
    agendamento.servicos.forEach(serv => {
        // Chama a função base para criar a linha visual no HTML
        if (typeof adicionarServicoExtraAgenda === 'function') {
            adicionarServicoExtraAgenda();
            
            const linhas = container.querySelectorAll('.item-servico-agenda');
            const ultimaLinha = linhas[linhas.length - 1];
            
            if (ultimaLinha) {
                const selectServico = ultimaLinha.querySelector('.select-servico-item');
                const inputPreco = ultimaLinha.querySelector('.input-preco-item');
                
                if (selectServico) selectServico.value = serv.nome;
                // Atribui diretamente o preço salvo e garante que reflicta no campo
                if (inputPreco) inputPreco.value = serv.preco.toFixed(2);
            }
        }
    });

    // 5. Atualiza o total visual do formulário
    if (typeof atualizarTotalAgenda === 'function') {
        atualizarTotalAgenda();
    } else {
        const labelTotal = document.getElementById("label-total-agenda");
        if (labelTotal) labelTotal.innerText = `R$ ${agendamento.total.toFixed(2).replace('.', ',')}`;
    }

    // 6. Feedback visual: altera título e botão para "Editar / Atualizar"
    const formCard = document.querySelector("#form-agendamento").closest(".card");
    const tituloCard = formCard.querySelector("h2");
    if (tituloCard) tituloCard.innerText = "Editar Agendamento";

    const btnSubmit = document.querySelector("#form-agendamento button[type='submit']");
    if (btnSubmit) btnSubmit.innerText = "Atualizar Agendamento";

    // 7. Rola a tela suavemente para cima
    formCard.scrollIntoView({ behavior: 'smooth' });
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

function concluirAgendamento(id) {
    let agendamentos = JSON.parse(localStorage.getItem("agendamentos_studio")) || [];
    let clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
    
    const agendamento = agendamentos.find(a => a.id === id);
    if (!agendamento) return;

    const cliente = clientes.find(c => c.id == agendamento.clienteId);
    
    // Tratamento dinâmico de gênero
    const genero = cliente ? (cliente.genero || 'F') : 'F';
    const artigoCliente = genero === 'M' ? 'o cliente' : 'a cliente';
    const termoClienteGen = genero === 'M' ? 'do cliente' : 'da cliente';
    
    const ehPacote = cliente ? (cliente.clientePacote === true || cliente.tipoCliente === 'pacote' || cliente.pacote === true) : false;
    
    const msg = ehPacote 
        ? `Este é um pacote ${termoClienteGen}. O valor será abatido do saldo.` 
        : `Este é atendimento para ${artigoCliente} que paga na hora. O serviço será registrado apenas no histórico.`;

    if (!confirm(`Confirmar execução de: ${agendamento.servicos.map(s => s.nome).join(', ')}?\n\n${msg}`)) return;

    // Formatação da descrição
    const dataFormatada = agendamento.data ? agendamento.data.split('-').reverse().join('/') : '';
    const desc = `Serviço realizado em ${dataFormatada} - ${agendamento.servicos.map(s => s.nome).join(', ')}`;
    const tipoMov = ehPacote ? 'DEBITO' : 'HISTORICO';

    if (typeof adicionarMovimentacaoCliente === 'function') {
        try {
            adicionarMovimentacaoCliente(agendamento.clienteId, tipoMov, agendamento.total, desc);
        } catch (e) {
            console.warn("Erro ao chamar adicionarMovimentacaoCliente:", e);
        }
    } else {
        console.error("Função adicionarMovimentacaoCliente não encontrada!");
    }

    agendamentos = agendamentos.filter(a => a.id !== id);
    localStorage.setItem("agendamentos_studio", JSON.stringify(agendamentos));
    
    verificarRecorrenciaEAgendar(agendamento);

    alert("Atendimento concluído e registrado com sucesso!");
    
    if (typeof carregarAgendamentos === 'function') carregarAgendamentos();
    if (typeof carregarClientes === 'function') carregarClientes();
}

function renderizarPainelAlertasWhatsApp() {
    const { hoje, amanha } = obterAgendamentosAlertas();
    const clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];

    // Função auxiliar para buscar o telefone do cliente pelo nome ou ID
    function buscarTelefone(nomeCliente) {
        const cliente = clientes.find(c => c.nome === nomeCliente);
        return cliente ? cliente.telefone : "";
    }

    // Aqui você injeta esses dados no HTML da sua interface de lembretes/alertas
    console.log("Agendamentos para hoje:", hoje);
    console.log("Agendamentos para amanhã:", amanha);
}

// Função adaptada para gerar o link do WhatsApp usando o template salvo da cliente
function gerarLinkWhatsapp(telefone, nomeCliente, data, horario, servicos) {
    const tellimpo = telefone ? telefone.replace(/\D/g, '') : '';
    
    // Pega rigorosamente o template salvo no localStorage
    let templateSalvo = localStorage.getItem("template_ativo_texto");
    
    // Se por acaso estiver vazio, usa um fallback seguro
    if (!templateSalvo) {
        templateSalvo = "Oi ${cliente}! Passando pra lembrar que dia ${data} às ${horario}, você tem horário comigo. 😊\nServiços: ${servicos}";
    }

    // Substitui as variáveis com segurança
    const mensagem = templateSalvo
        .replace(/\$\{cliente\}/g, nomeCliente || "Cliente")
        .replace(/\$\{data\}/g, data || "")
        .replace(/\$\{horario\}/g, horario || "")
        .replace(/\$\{servicos\}/g, servicos || "");

    return `https://api.whatsapp.com/send?phone=55${tellimpo}&text=${encodeURIComponent(mensagem)}`;
}

// Função genérica unificada para abrir o WhatsApp de qualquer agendamento
function dispararWhatsappDireto(telefone, nome, dataIso, horario, servicosStr) {
    if (!telefone) {
        alert("Esta cliente não possui um número de telefone cadastrado.");
        return;
    }
    const dataFmt = dataIso ? dataIso.split('-').reverse().join('/') : '';
    
    // Reaproveita exatamente a mesma função que a tela de avisos usa!
    const urlWp = gerarLinkWhatsapp(telefone, nome, dataFmt, horario, servicosStr);
    window.open(urlWp, '_blank');
}

// Função para definir e salvar o template padrão escolhido
function definirTemplatePadrao(idTemplate) {
    let textoTemplate = "";

    if (idTemplate === 1) {
        textoTemplate = `Oi \${cliente}! Passando pra lembrar que dia \${data} às \${horario}, você tem horário comigo. 😊\n• Chegue 10 minutos antes do horário para uma melhor experiência.\n• Em caso de cancelamento, deve ser avisado com no mínimo 24h de antecedência.\n\nServiços: \${servicos}\n\nJá estou preparando tudo pra você. Até lá! ✨`;
    } else if (idTemplate === 2) {
        textoTemplate = `Olá \${cliente}! Seu horário está confirmado para \${horario}.\nOs serviços agendados são: \${servicos}\n\nPor favor, não se atrase, pois é reservado um tempo único para cada cliente!\nAtenciosamente, Loide Vieira Nails Studio`;
    }

    // Salva a escolha e o texto no localStorage
    localStorage.setItem("template_ativo_id", idTemplate);
    localStorage.setItem("template_ativo_texto", textoTemplate);

    // Atualiza a interface visual dos cards de templates
    atualizarVisualTemplates(idTemplate);
}

// Função auxiliar para atualizar o visual de qual card está ativo na tela de templates
function atualizarVisualTemplates(idAtivo) {
    const card1 = document.getElementById("card-template-1");
    const card2 = document.getElementById("card-template-2");
    const badge1 = document.getElementById("badge-tpl-1");
    const badge2 = document.getElementById("badge-tpl-2");

    if (!card1 || !card2) return;

    if (idAtivo === 1) {
        card1.style.border = "2px solid var(--primary-color, #b8860b)";
        card1.style.background = "#fffdf5";
        badge1.style.display = "inline-block";

        card2.style.border = "1px solid #ddd";
        card2.style.background = "#fff";
        badge2.style.display = "none";
    } else {
        card2.style.border = "2px solid var(--primary-color, #b8860b)";
        card2.style.background = "#fffdf5";
        badge2.style.display = "inline-block";

        card1.style.border = "1px solid #ddd";
        card1.style.background = "#fff";
        badge1.style.display = "none";
    }
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
        
        const linkWp = telLimpo ? gerarLinkWhatsapp(telLimpo, nomeClienteExibicao, ag.data.split('-').reverse().join('/'), ag.horario, servicosStr) : '#';
        
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

/* --- FUNÇÕES DO MINI MODAL DE AGENDAMENTO --- */

function abrirModalAcao(id, nomeCliente, servicos) {
    document.getElementById("modal-agendamento-id").value = id;
    document.getElementById("modal-titulo-cliente").textContent = nomeCliente;
    document.getElementById("modal-sub-servicos").textContent = "Serviços: " + servicos;

    // Esconde o bloco de reagendamento ao abrir
    const blocoReagendamento = document.getElementById("bloco-reagendamento");
    if (blocoReagendamento) blocoReagendamento.style.display = "none";

    // Limpa os inputs de nova data/hora
    document.getElementById("novo-agendamento-data").value = "";
    document.getElementById("novo-agendamento-horario").value = "";

    // Exibe o modal
    document.getElementById("modal-acao-agendamento").style.display = "flex";
}

function fecharModalAcao() {
    document.getElementById("modal-acao-agendamento").style.display = "none";
}

function abrirCamposReagendamento() {
    const bloco = document.getElementById("bloco-reagendamento");
    if (bloco) {
        bloco.style.display = bloco.style.display === "block" ? "none" : "block";
    }
}

function executarAcaoAgendamento(tipoAcao) {
    const id = Number(document.getElementById("modal-agendamento-id").value);
    let agendamentos = JSON.parse(localStorage.getItem("agendamentos_studio")) || [];
    const agendamentoIndex = agendamentos.findIndex(a => a.id === id);

    if (agendamentoIndex === -1) {
        alert("Agendamento não encontrado.");
        fecharModalAcao();
        return;
    }

    const agendamento = agendamentos[agendamentoIndex];

    if (tipoAcao === 'realizado') {
        // 1. Marca como confirmado (borda/fundo verde) para manter no histórico do storage
        agendamentos[agendamentoIndex].status = 'Confirmado';
        localStorage.setItem("agendamentos_studio", JSON.stringify(agendamentos));
        
        fecharModalAcao();

        // 2. Executa a lógica de pacotes / histórico do cliente
        let clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
        const cliente = clientes.find(c => c.id === agendamento.clienteId);
        
        const genero = cliente ? (cliente.genero || 'F') : 'F';
        const termoClienteGen = genero === 'M' ? 'do cliente' : 'da cliente';
        const ehPacote = cliente ? cliente.clientePacote : false;

        // Pega a data YYYY-MM-DD direto do agendamento e converte de forma segura para DD/MM/AAAA
        const partesData = agendamento.data.split('-');
        const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;
        
        const desc = `Serviço realizado em ${dataFormatada} - ${agendamento.servicos.map(s => s.nome).join(', ')}`;
        
        const tipoMov = ehPacote ? 'DEBITO' : 'HISTORICO';

        if (typeof adicionarMovimentacaoCliente === 'function') {
            adicionarMovimentacaoCliente(agendamento.clienteId, tipoMov, agendamento.total, desc, agendamento.data);
        }

        // 3. Verifica a recorrência para sugerir o próximo agendamento
        verificarRecorrenciaEAgendar(agendamento);

        alert(ehPacote ? `Atendimento realizado! Valor debitado do pacote ${termoClienteGen}.` : `Atendimento realizado e registrado no histórico ${termoClienteGen}.`);
        
        carregarAgendamentos();
        carregarClientes();
        return;
    }

    if (tipoAcao === 'faltou') {
        let clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
        const cliente = clientes.find(c => c.id === agendamento.clienteId);
        
        const genero = cliente ? (cliente.genero || 'F') : 'F';
        const artigoCliente = genero === 'M' ? 'o cliente' : 'a cliente';
        const termoClienteGen = genero === 'M' ? 'do cliente' : 'da cliente';

        if (!confirm(`Deseja registrar que ${artigoCliente} faltou sem aviso? O agendamento ficará marcado no histórico da agenda.`)) return;
        
        const ehPacote = cliente ? cliente.clientePacote : false;

        const partesData = agendamento.data.split('-');
        const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;
        const desc = `Falta sem aviso em ${dataFormatada} - ${agendamento.servicos.map(s => s.nome).join(', ')}`;
        
        const tipoMov = ehPacote ? 'DEBITO' : 'HISTORICO';

        if (typeof adicionarMovimentacaoCliente === 'function') {
            adicionarMovimentacaoCliente(agendamento.clienteId, tipoMov, agendamento.total, desc, agendamento.data);
        }

        // Mantém o agendamento no storage, mas atualiza o status para 'Falta' (borda vermelha)
        agendamentos[agendamentoIndex].status = 'Falta';
        localStorage.setItem("agendamentos_studio", JSON.stringify(agendamentos));
        
        fecharModalAcao();

        verificarRecorrenciaEAgendar(agendamento);

        alert(ehPacote ? `Falta registrada, valor debitado do pacote ${termoClienteGen} e horário marcado como ocioso!` : `Falta registrada no histórico ${termoClienteGen} e horário marcado como ocioso.`);
        carregarAgendamentos();
        carregarClientes();
        return;
    }

    if (tipoAcao === 'reagendar') {
        const novaData = document.getElementById("novo-agendamento-data").value;
        const novoHorario = document.getElementById("novo-agendamento-horario").value;

        if (!novaData || !novoHorario) {
            alert("Por favor, selecione a nova data e o novo horário para o reagendamento.");
            return;
        }

        if (!confirm(`Confirmar reagendamento para o dia ${novaData.split('-').reverse().join('/')} às ${novoHorario}?`)) return;

        // Atualiza os dados do agendamento existente e marca como confirmado (borda verde)
        agendamentos[agendamentoIndex].data = novaData;
        agendamentos[agendamentoIndex].horario = novoHorario;
        agendamentos[agendamentoIndex].status = 'Pendente';

        localStorage.setItem("agendamentos_studio", JSON.stringify(agendamentos));

        fecharModalAcao();
        alert("Agendamento reagendado com sucesso!");
        carregarAgendamentos();
        return;
    }
}

// Alterna visualmente o status de confirmação do agendamento na lista do dia
function alternarStatusAgendamento(id) {
    let agendamentos = JSON.parse(localStorage.getItem("agendamentos_studio")) || [];
    const index = agendamentos.findIndex(a => a.id == id);
    
    if (index !== -1) {
        const statusAtual = agendamentos[index].status || 'Pendente';
        agendamentos[index].status = statusAtual === 'Confirmado' ? 'Pendente' : 'Confirmado';
        
        localStorage.setItem("agendamentos_studio", JSON.stringify(agendamentos));
        carregarAgendamentos();
    }
}

// Função auxiliar para calcular a nova data com base na recorrência
function calcularProximaDataRecorrencia(dataAtualStr, regra) {
    const [ano, mes, dia] = dataAtualStr.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    const regraLower = regra ? regra.toLowerCase().trim() : '';

    if (regraLower.includes('semanal') && !regraLower.includes('quinzenal')) {
        dataObj.setDate(dataObj.getDate() + 7);
    } else if (regraLower.includes('quinzenal')) {
        dataObj.setDate(dataObj.getDate() + 14);
    } else if (regraLower.includes('mensal')) {
        dataObj.setMonth(dataObj.getMonth() + 1);
    } else {
        return null; 
    }

    const novoAno = dataObj.getFullYear();
    const novoMes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const novoDia = String(dataObj.getDate()).padStart(2, '0');

    return `${novoAno}-${novoMes}-${novoDia}`;
}

// Função para verificar e sugerir o próximo agendamento recorrente
function verificarRecorrenciaEAgendar(agendamento) {
    let clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];
    const cliente = clientes.find(c => c.id === agendamento.clienteId);

    // Valida se o cliente existe e se tem regra de recorrência preenchida
    if (!cliente || !cliente.recorrencia || cliente.recorrencia.trim() === "") {
        return;
    }

    const proximaDataIso = calcularProximaDataRecorrencia(agendamento.data, cliente.recorrencia);
    if (!proximaDataIso) return;

    const [ano, mes, dia] = proximaDataIso.split('-');
    const proximaDataFormatada = `${dia}/${mes}/${ano}`;
    
    // Tratamento dinâmico de gênero para o texto do alerta
    const generoCliente = cliente.genero || 'F';
    const termoCliente = generoCliente === 'M' ? 'do cliente' : 'da cliente';

    const confirmarRecorrencia = confirm(`De acordo com o cadastro ${termoCliente}, a regra de recorrência consta como "${cliente.recorrencia}". Deseja deixar marcado para o próximo dia ${proximaDataFormatada} às ${agendamento.horario} h?`);

    if (confirmarRecorrencia) {
        let agendamentos = JSON.parse(localStorage.getItem("agendamentos_studio")) || [];

        const novoAgendamentoRecorrente = {
            id: Date.now(),
            clienteId: agendamento.clienteId,
            data: proximaDataIso,
            horario: agendamento.horario,
            servicos: [...agendamento.servicos], 
            total: agendamento.total,
            status: 'Pendente'
        };

        // Trava de segurança de 600 registros
        if (agendamentos.length >= 600) {
            agendamentos.shift();
        }

        agendamentos.push(novoAgendamentoRecorrente);
        localStorage.setItem("agendamentos_studio", JSON.stringify(agendamentos));
        alert("Próximo agendamento recorrente criado com sucesso!");
    }
}

// =======================================================
//                  BACKUP E SEGURANÇA
//========================================================

// EXPORTAR BACKUP

function exportarBackup() {
    try {
        // Coleta todas as chaves do localStorage do projeto
        const dadosBackup = {
            agendamentos_studio: JSON.parse(localStorage.getItem("agendamentos_studio")) || [],
            clientes_studio: JSON.parse(localStorage.getItem("clientes_studio")) || [],
            servicos_studio: JSON.parse(localStorage.getItem("servicos_studio")) || [],
            template_ativo_id: localStorage.getItem("template_ativo_id") || "",
            template_ativo_text: localStorage.getItem("template_ativo_text") || "",
            dataBackup: new Date().toISOString()
        };

        const jsonString = JSON.stringify(dadosBackup, null, 2);
        const dataHoje = new Date().toISOString().split('T')[0];
        const nomeArquivo = `backup_studio_${dataHoje}.json`;

        const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });

        // Se o navegador suportar compartilhamento de arquivos E for dispositivo móvel
        const arquivo = new File([blob], nomeArquivo, { type: "application/json" });
        
        if (navigator.canShare && navigator.canShare({ files: [arquivo] }) && /Mobi|Android/i.test(navigator.userAgent)) {
            navigator.share({
                files: [arquivo],
                title: 'Backup Loide Studio',
                text: 'Cópia de segurança dos dados do sistema.'
            }).catch((error) => {
                if (error.name !== 'AbortError') {
                    console.log("Compartilhamento ignorado, alternando para download direto.");
                    executarDownloadFallback(blob, nomeArquivo);
                }
            });
        } else {
            // Executa o download padrão seguro (funciona em PC, Android e evita erros de permissão)
            executarDownloadFallback(blob, nomeArquivo);
        }

    } catch (e) {
        console.error("Erro ao exportar backup:", e);
        alert("Ocorreu um erro ao gerar o backup. Tente novamente.");
    }
}

// Função auxiliar de suporte para o download direto
function executarDownloadFallback(blob, nomeArquivo) {
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = nomeArquivo;
    
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    
    setTimeout(() => {
        document.body.removeChild(downloadAnchor);
        window.URL.revokeObjectURL(url);
    }, 100);

    alert("Backup exportado com sucesso! Guarde esse arquivo em um local seguro.");
}

// FIM DE EXPORTAR BACKUP

function importarBackup(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    if (!confirm("Atenção: A importação irá substituir todos os dados atuais pelos dados do backup. Deseja continuar?")) {
        event.target.value = ""; // Limpa o input
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const conteudo = JSON.parse(e.target.result);

            // Validação simples para garantir que o arquivo é do nosso sistema
            if (!conteudo.agendamentos_studio || !conteudo.clientes_studio) {
                alert("O arquivo selecionado parece ser inválido ou corrompido.");
                return;
            }

            // Restaura cada chave no localStorage
            localStorage.setItem("agendamentos_studio", JSON.stringify(conteudo.agendamentos_studio));
            localStorage.setItem("clientes_studio", JSON.stringify(conteudo.clientes_studio));
            localStorage.setItem("servicos_studio", JSON.stringify(conteudo.servicos_studio));
            
            if (conteudo.template_ativo_id) {
                localStorage.setItem("template_ativo_id", conteudo.template_ativo_id);
            }
            if (conteudo.template_ativo_text) {
                localStorage.setItem("template_ativo_text", conteudo.template_ativo_text);
            }

            alert("Backup restaurado com sucesso! O aplicativo será recarregado.");
            
            // Recarrega a página para atualizar todas as telas com os novos dados
            window.location.reload();

        } catch (erro) {
            console.error("Erro ao ler o arquivo de backup:", erro);
            alert("Erro ao processar o arquivo JSON. Certifique-se de que é um arquivo de backup válido.");
        }
    };

    reader.readAsText(arquivo);
}

// FIM DE IMPORTAR BACKUP

// Função auxiliar para gerar Hash SHA-256
async function gerarHash(texto) {
    const encoder = new TextEncoder();
    const dados = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dados);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Inicialização: Verifica sessão e garante credenciais padrão se não existirem
document.addEventListener("DOMContentLoaded", async () => {
    const logadoNaSessao = sessionStorage.getItem("studio_logado");
    if (logadoNaSessao === "true") {
        document.getElementById("modal-login").style.display = "none";
    }

    // Padrão inicial: usuário "admin" e senha "admin" (com hash)
    if (!localStorage.getItem("studio_usuario")) {
        localStorage.setItem("studio_usuario", "admin");
    }
    if (!localStorage.getItem("studio_senha_hash")) {
        const hashAdminPadrao = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
        localStorage.setItem("studio_senha_hash", hashAdminPadrao);
    }
    
    // Preenche o campo de usuário automaticamente no modal para facilitar
    const usuarioSalvo = localStorage.getItem("studio_usuario");
    if(document.getElementById("input-usuario-acesso")) {
        document.getElementById("input-usuario-acesso").value = usuarioSalvo;
    }
    if(document.getElementById("novo-usuario")) {
        document.getElementById("novo-usuario").value = usuarioSalvo;
    }
});

// Função para validar o login (Usuário + Senha)
async function realizarLogin(event) {
    event.preventDefault();
    const usuarioDigitado = document.getElementById("input-usuario-acesso").value.trim();
    const senhaDigitada = document.getElementById("input-senha-acesso").value;
    
    const usuarioSalvo = localStorage.getItem("studio_usuario") || "admin";
    const hashSalvo = localStorage.getItem("studio_senha_hash");
    
    const hashDigitado = await gerarHash(senhaDigitada);

    if (usuarioDigitado === usuarioSalvo && hashDigitado === hashSalvo) {
        sessionStorage.setItem("studio_logado", "true");
        document.getElementById("modal-login").style.display = "none";
        document.getElementById("input-senha-acesso").value = "";
    } else {
        alert("Usuário ou senha incorretos! Tente novamente.");
    }
}

// Abrir/Fechar modal de alteração
function abrirModalAlterarSenha() {
    // Atualiza o input com o usuário atual antes de abrir
    document.getElementById("novo-usuario").value = localStorage.getItem("studio_usuario") || "admin";
    document.getElementById("modal-alterar-senha").style.display = "flex";
}

function fecharModalAlterarSenha() {
    document.getElementById("modal-alterar-senha").style.display = "none";
    document.getElementById("senha-atual").value = "";
    document.getElementById("senha-nova").value = "";
    document.getElementById("senha-confirma").value = "";
}

// Salvar novos dados (Usuário e/ou Senha)
async function salvarNovasCredenciais(event) {
    event.preventDefault();
    const atualDigitada = document.getElementById("senha-atual").value;
    const novoUsuario = document.getElementById("novo-usuario").value.trim();
    const novaSenha = document.getElementById("senha-nova").value;
    const confirmaSenha = document.getElementById("senha-confirma").value;

    const hashAtualDigitado = await gerarHash(atualDigitada);
    const hashSalvo = localStorage.getItem("studio_senha_hash");

    if (hashAtualDigitado !== hashSalvo) {
        alert("A senha atual está incorreta.");
        return;
    }

    if (novaSenha !== confirmaSenha) {
        alert("A nova senha e a confirmação não coincidem.");
        return;
    }

    // Salva o novo usuário e o novo hash da senha
    const novoHash = await gerarHash(novaSenha);
    localStorage.setItem("studio_usuario", novoUsuario);
    localStorage.setItem("studio_senha_hash", novoHash);
    
    alert("Credenciais alteradas com sucesso!");
    fecharModalAlterarSenha();
    
    // Atualiza o campo de login automaticamente
    document.getElementById("input-usuario-acesso").value = novoUsuario;
}

// Emergência caso esqueça o acesso
function esqueciMinhaSenha() {
    const confirmacao = prompt("Para restaurar as credenciais padrão ('admin' / 'admin'), digite a Frase de Recuperação Mestra:");
    const fraseMestra = "studio-recuperar-2026"; 

    if (confirmacao === fraseMestra) {
        localStorage.setItem("studio_usuario", "admin");
        const hashAdminPadrao = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
        localStorage.setItem("studio_senha_hash", hashAdminPadrao);
        
        sessionStorage.removeItem("studio_logado");
        alert("Acesso restaurado para: Usuário 'admin' e Senha 'admin'. Faça o login novamente.");
        location.reload();
    } else if (confirmacao !== null) {
        alert("Frase de recuperação incorreta.");
    }
}