/* ═══════════════════════════════════════════════════
   ShopFlow Dashboard — Lógica Principal (app.js)
   Sessão 2: Relógio, estrutura e eventos base
   ═══════════════════════════════════════════════════ */
 
// ── Estado global do dashboard ──────────────────────
// Objecto central que guarda os dados do dashboard.
// Vai crescer em cada sessão.
const ShopFlow = {
  versao: '2.0',
  loja: {
      nome: 'ShopFlow',
      cidade: 'Porto',
      moeda: 'EUR'
  },
  dados: {
      produtos: [],         // Preenchido na Sessão 3
      categoriaActiva: 'todos',
      totalVendas: 0,       // Actualizado na Sessão 4
      totalReceita: 0,      // Actualizado na Sessão 4
      temperatura: null,    // Preenchido na Sessão 7
      humidade: null        // Preenchido na Sessão 7
  },
  ligacoes: {
      websocket: null,      // Criado na Sessão 4
      mqtt: null            // Criado na Sessão 7
  }
};

// ── Utilitários ──────────────────────────────────────

/**
* Formata um número como valor monetário em EUR
* @param {number} valor - O valor a formatar
* @returns {string} - Ex: '1.234,56 EUR'
*/
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
  }).format(valor);
}

/**
* Formata uma data no padrão português
* @param {Date} data - O objecto Date a formatar
* @returns {string} - Ex: 'segunda-feira, 11 de março de 2026'
*/
function formatarData(data) {
  return data.toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
  });
}

// ── Relógio em tempo real ────────────────────────────

function actualizarRelogio() {
  const agora = new Date();

  // Formatar hora com dois dígitos (ex: 09:05:03)
  const horas   = String(agora.getHours()).padStart(2, '0');
  const minutos = String(agora.getMinutes()).padStart(2, '0');
  const segundos = String(agora.getSeconds()).padStart(2, '0');
  const horaFormatada = `${horas}:${minutos}:${segundos}`;

  // Actualizar o elemento do relógio no HTML
  const elemRelogio = document.getElementById('relogio');
  if (elemRelogio) elemRelogio.textContent = horaFormatada;

  // Actualizar a data (só precisa de mudar uma vez por dia,
  // mas actualizamos aqui para simplificar)
  const elemData = document.getElementById('data-hoje');
  if (elemData) elemData.textContent = formatarData(agora);
}

// Iniciar o relógio: actualizar imediatamente e depois
// a cada 1000 milissegundos (1 segundo)
actualizarRelogio();
setInterval(actualizarRelogio, 1000);

// ── Painel de Stock ───────────────────────────────────

/**
* Carrega os produtos a partir do ficheiro JSON.
* Usa async/await para esperar pela resposta sem bloquear a página.
*/
async function carregarProdutos() {
  const lista = document.getElementById('lista-produtos');
  lista.innerHTML = '<p class="sf-placeholder">A carregar produtos...</p>';

  try {
      const resposta = await fetch('data/produtos.json');

      // Verificar se o pedido foi bem sucedido (código HTTP 200)
      if (!resposta.ok) {
          throw new Error(`Erro HTTP: ${resposta.status}`);
      }

      const dados = await resposta.json();
      ShopFlow.dados.produtos = dados.produtos;

      console.log(`Carregados ${dados.produtos.length} produtos`);
      renderizarProdutos(ShopFlow.dados.produtos);

  } catch (erro) {
      console.error('Erro ao carregar produtos:', erro);
      lista.innerHTML = `<p class="sf-placeholder">
          Erro ao carregar produtos. Verifique a consola.</p>`;
  }
}

/**
* Filtra os produtos pela categoria seleccionada.
* @param {string} categoria - 'todos' ou o nome da categoria
* @returns {Array} - Array de produtos filtrados
*/
function filtrarProdutos(categoria) {
  if (categoria === 'todos') {
      return ShopFlow.dados.produtos;
  }
  return ShopFlow.dados.produtos.filter(p => p.categoria === categoria);
}

/**
* Determina o estado do stock de um produto.
* @param {number} stock - Quantidade em stock
* @returns {Object} - { classe, texto } para usar no HTML
*/
function estadoStock(stock) {
  if (stock === 0)  return { classe: 'esgotado', texto: 'Esgotado' };
  if (stock <= 5)   return { classe: 'baixo',    texto: `Apenas ${stock}` };
  return               { classe: 'ok',       texto: `${stock} unid.` };
}


/**
* Renderiza os cartões de produto no DOM.
* @param {Array} produtos - Array de objectos produto
*/
function renderizarProdutos(produtos) {
  const lista = document.getElementById('lista-produtos');
  const badge = document.getElementById('badge-stock');

  // Actualizar o contador no cabeçalho do painel
  badge.textContent = `${produtos.length} produto${produtos.length !== 1 ? 's' : ''}`;

  // Caso não haja produtos na categoria
  if (produtos.length === 0) {
      lista.innerHTML = `<div class="sf-sem-produtos">
          Nenhum produto na categoria "${ShopFlow.dados.categoriaActiva}".
      </div>`;
      return;
  }

  // Construir o HTML de todos os cartões de uma vez
  const html = produtos.map(produto => {
      const estado = estadoStock(produto.stock);
      const classeCartao = produto.stock === 0 ? 'sf-produto-cartao sf-produto-cartao--esgotado'
                                               : 'sf-produto-cartao';
      const precoFormatado = formatarMoeda(produto.preco);

      return `
          <div class="${classeCartao}" data-id="${produto.id}">
              <div class="sf-produto-info">
                  <div class="sf-produto-nome">${produto.nome}</div>
                  <div class="sf-produto-categoria">${produto.categoria}</div>
              </div>
              <div class="sf-produto-direita">
                  <span class="sf-produto-preco">${precoFormatado}</span>
                  <span class="sf-produto-stock sf-produto-stock--${estado.classe}">
                      ${estado.texto}
                  </span>
              </div>
          </div>
      `;
  }).join('');

  lista.innerHTML = html;
}


// ── Gestão de eventos — Filtros de stock ─────────────
// Os botões de filtro são criados aqui.
// A lógica de filtro real será adicionada na Sessão 3.

// ── Gestão de eventos — Filtros de stock ─────────────
document.querySelectorAll('.sf-btn').forEach(botao => {
  botao.addEventListener('click', (evento) => {
      const categoria = evento.target.dataset.categoria;

      // Actualizar estado visual dos botões
      document.querySelectorAll('.sf-btn').forEach(b => {
          b.classList.remove('sf-btn--activo');
      });
      evento.target.classList.add('sf-btn--activo');

      // Guardar categoria activa no estado global
      ShopFlow.dados.categoriaActiva = categoria;

      // Filtrar e renderizar os produtos
      const produtosFiltrados = filtrarProdutos(categoria);
      renderizarProdutos(produtosFiltrados);
  });
});


// ── Inicialização ─────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  console.log(`ShopFlow Dashboard v${ShopFlow.versao} iniciado`);
  console.log('Sessão 2: Estrutura base criada com sucesso');
  console.log('Próximos passos:');
  console.log('  Sessão 3: Carregar produtos a partir de produtos.json');
  console.log('  Sessão 4: Ligar WebSocket para vendas em tempo real');

  // Activar o primeiro botão de filtro
  const primeiroBotao = document.querySelector('.sf-btn');
  if (primeiroBotao) primeiroBotao.classList.add('sf-btn--activo');

  // NOVO: Carregar os produtos a partir do JSON
  carregarProdutos();
});