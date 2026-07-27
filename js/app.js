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
});