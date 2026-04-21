// ==========================================================================
// Busca — painel colapsável que encontra markers por nome
// ==========================================================================
//
// API:
//   Busca.inicializar(mapa)
//   Busca.registrar(marker, dados)   // dados = {nome, categoria, ...}
//   Busca.construir()                // monta o painel no canto sup. dir.
//
// Funcionalidades:
//   - Match por substring (ignora acento e caixa)
//   - Navegação por teclado (↑ ↓ Enter Esc)
//   - Limite de 5 resultados com contagem dos excedentes
// ==========================================================================

(function () {
  'use strict';

  const SVG_LUPA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="7"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>`;

  const ROTULOS = {
    'cidade-estado': 'Cidade',
    'hidrografia': 'Hidrografia',
    'terreno': 'Terreno',
    'rota': 'Rota',
    'povoado': 'Povoado',
  };

  const LIMITE = 5;

  let mapa = null;
  const indice = [];   // [{ nome, nomeNormalizado, categoria, marker }]

  function inicializar(mapaLeaflet) {
    mapa = mapaLeaflet;
  }

  function registrar(marker, dados) {
    indice.push({
      nome: dados.nome,
      nomeNormalizado: Dados.normalizar(dados.nome),
      categoria: dados.categoria,
      marker: marker,
    });
  }

  function construir() {
    const painel = L.control({ position: 'topright' });
    painel.onAdd = criarPainelDOM;
    painel.addTo(mapa);
  }

  // --- Construção do DOM ---

  function criarPainelDOM() {
    const div = L.DomUtil.create('div', 'painel-busca');
    const estado = { indiceDestacado: -1 };   // estado local do painel

    const toggle = criarToggle();
    const conteudo = document.createElement('div');
    conteudo.className = 'painel-busca-conteudo';

    const linha = document.createElement('div');
    linha.className = 'painel-busca-linha';

    const input = criarInput();
    const fechar = criarBotaoFechar();
    const resultados = document.createElement('div');
    resultados.className = 'painel-busca-resultados';

    linha.append(input, fechar);
    conteudo.append(linha, resultados);
    div.append(toggle, conteudo);

    conectarComportamento({ div, toggle, input, fechar, resultados, estado });

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    return div;
  }

  function criarToggle() {
    const b = document.createElement('button');
    b.className = 'painel-busca-toggle';
    b.title = 'Buscar';
    b.setAttribute('aria-label', 'Abrir busca');
    b.innerHTML = SVG_LUPA;
    return b;
  }

  function criarInput() {
    const i = document.createElement('input');
    i.type = 'text';
    i.className = 'painel-busca-input';
    i.placeholder = 'Buscar lugar...';
    return i;
  }

  function criarBotaoFechar() {
    const b = document.createElement('button');
    b.className = 'painel-busca-fechar';
    b.textContent = '×';
    b.title = 'Fechar';
    b.setAttribute('aria-label', 'Fechar busca');
    return b;
  }

  // --- Comportamento ---

  function conectarComportamento(ctx) {
    const { div, toggle, input, fechar, resultados, estado } = ctx;

    toggle.addEventListener('click', () => {
      div.classList.add('aberto');
      input.focus();
    });

    fechar.addEventListener('click', () => fecharPainel(ctx));

    input.addEventListener('input', () => renderizar(ctx));

    input.addEventListener('keydown', (e) => tratarTeclado(e, ctx));
  }

  function fecharPainel({ div, input, resultados, estado }) {
    input.value = '';
    resultados.innerHTML = '';
    estado.indiceDestacado = -1;
    div.classList.remove('aberto');
  }

  function renderizar(ctx) {
    const { input, resultados, estado } = ctx;
    resultados.innerHTML = '';
    estado.indiceDestacado = -1;

    const termo = input.value.trim();
    if (!termo) return;

    const achados = procurar(termo);
    const mostrados = achados.slice(0, LIMITE);

    mostrados.forEach((item, i) => {
      resultados.appendChild(criarItem(item, i, ctx));
    });

    const restantes = achados.length - mostrados.length;
    if (restantes > 0) {
      const rodape = document.createElement('div');
      rodape.className = 'resultado-mais';
      rodape.textContent = `e mais ${restantes} resultado${restantes > 1 ? 's' : ''}`;
      resultados.appendChild(rodape);
    }
  }

  function criarItem(item, i, ctx) {
    const linha = document.createElement('div');
    linha.className = 'resultado-item';
    linha.dataset.indice = i;

    const icone = document.createElement('span');
    icone.className = 'icone-categoria';
    icone.innerHTML = iconeMiniatura(item.categoria);

    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = item.nome;

    const rotulo = document.createElement('span');
    rotulo.className = 'categoria-label';
    rotulo.textContent = ROTULOS[item.categoria] || item.categoria;

    linha.append(icone, nome, rotulo);
    linha.addEventListener('click', () => selecionar(item, ctx));
    return linha;
  }

  function tratarTeclado(e, ctx) {
    const { input, resultados, estado } = ctx;
    const itens = resultados.querySelectorAll('.resultado-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (itens.length === 0) return;
      estado.indiceDestacado = Math.min(estado.indiceDestacado + 1, itens.length - 1);
      atualizarDestaque(itens, estado.indiceDestacado);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (itens.length === 0) return;
      estado.indiceDestacado = Math.max(estado.indiceDestacado - 1, 0);
      atualizarDestaque(itens, estado.indiceDestacado);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const alvo = estado.indiceDestacado >= 0 ? estado.indiceDestacado : 0;
      const achados = procurar(input.value.trim());
      if (achados[alvo]) selecionar(achados[alvo], ctx);
    } else if (e.key === 'Escape') {
      fecharPainel(ctx);
    }
  }

  function atualizarDestaque(itens, indiceAtivo) {
    itens.forEach((el, i) => el.classList.toggle('destacado', i === indiceAtivo));
  }

  function selecionar(item, ctx) {
    fecharPainel(ctx);
    mapa.setView(item.marker.getLatLng(), -1);
    item.marker.fire('click');
  }

  // --- Busca em si ---

  function procurar(termo) {
    const alvo = Dados.normalizar(termo);
    if (!alvo) return [];
    return indice.filter(item => item.nomeNormalizado.includes(alvo));
  }

  function iconeMiniatura(categoriaId) {
    const fake = { categoria: categoriaId };
    const icone = window.getIcone(fake);
    return icone ? icone.options.html : '';
  }

  window.Busca = {
    inicializar,
    registrar,
    construir,
  };
})();