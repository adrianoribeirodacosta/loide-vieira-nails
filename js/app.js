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

// Máscara automática para telefone brasileiro
function aplicarMascaraTelefone(input) {
    let v = input.value.replace(/\D/g, "");
    v = v.substring(0, 11);
    if (v.length > 10) {
        v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (v.length > 5) {
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else {
        v = v.replace(/^(\d*)/, "($1");
    }
    input.value = v;
}

// Salvar ou atualizar cliente no LocalStorage
function salvarCliente(event) {
    event.preventDefault();

    const id = document.getElementById("cliente-id").value;
    const nome = document.getElementById("cliente-nome").value.trim();
    const telefone = document.getElementById("cliente-telefone").value.trim();
    const recorrencia = document.getElementById("cliente-recorrencia").value;
    
    const servicosPadrao = Array.from(document.querySelectorAll('input[name="cliente-servico"]:checked'))
                              .map(el => el.value);

    let clientes = JSON.parse(localStorage.getItem("clientes_studio")) || [];

    if (id) {
        // Editando cliente existente
        clientes = clientes.map(c => c.id == id ? { id: Number(id), nome, telefone, recorrencia, servicosPadrao } : c);
    } else {
        // Criando novo cliente
        const novoCliente = {
            id: Date.now(),
            nome,
            telefone,
            recorrencia,
            servicosPadrao
        };
        clientes.push(novoCliente);
    }

    localStorage.setItem("clientes_studio", JSON.stringify(clientes));
    
    // Limpar formulário, desmarcar checkboxes e recarregar lista
    document.getElementById("form-cliente").reset();
    document.getElementById("cliente-id").value = "";
    document.querySelectorAll('input[name="cliente-servico"]').forEach(el => el.checked = false);
    carregarClientes();
}

// Renderizar lista de clientes na tela seguindo o padrão visual dos cards
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
            <!-- Linha Superior: Nome (com truncamento) + Badge de Recorrência + Botões -->
            <div class="item-header">
                <div class="item-title-tempo">
                    <strong title="${c.nome}">${c.nome}</strong>
                    ${c.recorrencia && c.recorrencia !== "Nenhuma" ? `<span class="tempo-badge">🔄 ${c.recorrencia}</span>` : ``}
                </div>
                <div class="acoes-card">
                    <button onclick="editarCliente(${c.id})" class="btn-ico" title="Editar">✏️</button>
                    <button onclick="excluirCliente(${c.id})" class="btn-ico" title="Excluir">🗑️</button>
                </div>
            </div>
            
            <!-- Linha Inferior: Telefone e Serviços Padrão -->
            <div class="item-details" style="flex-direction: column; align-items: flex-start; gap: 4px;">
                <span>📱 ${c.telefone}</span>
                ${c.servicosPadrao && c.servicosPadrao.length > 0 ? `<small style="color: #666;">✨ Serviços: ${c.servicosPadrao.join(", ")}</small>` : ``}
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

// Salvar ou atualizar serviço no LocalStorage
function salvarServico(event) {
    event.preventDefault();

    const id = document.getElementById("servico-id").value;
    const nome = document.getElementById("servico-nome").value.trim();
    const tempo = document.getElementById("servico-tempo").value.trim();
    const precoNormal = document.getElementById("servico-preco-normal").value.trim();
    const precoPacote = document.getElementById("servico-preco-pacote").value.trim();

    let servicos = JSON.parse(localStorage.getItem("servicos_studio")) || [];

    if (id) {
        // Editando serviço existente
        servicos = servicos.map(s => s.id == id ? { id, nome, tempo, precoNormal, precoPacote } : s);
    } else {
        // Criando novo serviço
        const novoServico = {
            id: Date.now(),
            nome,
            tempo,
            precoNormal,
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

// Renderizar lista de serviços na tela
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
            <!-- Linha Superior: Tudo junto na mesma linha horizontal -->
            <div class="item-header">
                <div class="item-title-tempo">
                    <strong>${s.nome}</strong>
                    <span class="tempo-badge">⏱️ ${s.tempo} min</span>
                </div>
                <div class="acoes-card">
                    <button onclick="editarServico(${s.id})" class="btn-ico" title="Editar">✏️</button>
                    <button onclick="excluirServico(${s.id})" class="btn-ico" title="Excluir">🗑️</button>
                </div>
            </div>
            
            <!-- Linha Inferior: Preços -->
            <div class="item-details">
                <span>🏷️ Normal: R$ ${s.precoNormal}</span>
                <span class="separator">|</span>
                <span>📦 Pacote: R$ ${s.precoPacote}</span>
            </div>
        </div>
    `).join("");
}

// Preencher formulário para edição de serviço
function editarServico(id) {
    const servicos = JSON.parse(localStorage.getItem("servicos_studio")) || [];
    const servico = servicos.find(s => s.id == id);

    if (servico) {
        document.getElementById("servico-id").value = servico.id;
        document.getElementById("servico-nome").value = servico.nome;
        document.getElementById("servico-tempo").value = servico.tempo;
        document.getElementById("servico-preco-normal").value = servico.precoNormal;
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