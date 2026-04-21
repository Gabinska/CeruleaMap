// ==========================================================================
// Filtros — painel colapsável pra ligar/desligar categorias de marker
// ==========================================================================
//
// API:
//   Filtros.inicializar(mapa)
//   Filtros.registrar(categoria, grupo)   // categoria = {id, nome}, grupo = L.layerGroup
//   Filtros.construir()                   // monta o painel no canto sup. esq.
// ==========================================================================

(function () {
  'use strict';

  const SVG_FUNIL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 4h18v2l-7 8v6l-4 2v-8L3 6V4z"/>
  </svg>`;

  let mapa = null;
  const registrados = [];   // [{ categoria, grupo }] na ordem de registro

  function inicializar(mapaLeaflet) {
    mapa = mapaLeaflet;
  }

  function registrar(categoria, grupo) {
    registrados.push({ categoria, grupo });
  }

  function construir() {
    const painel = L.control({ position: 'topleft' });
    painel.onAdd = criarPainelDOM;
    painel.addTo(mapa);
  }

  function criarPainelDOM() {
    const div = L.DomUtil.create('div', 'painel-filtros');

    div.appendChild(criarBotaoAbrir(div));
    div.appendChild(criarConteudo(div));

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    return div;
  }

  function criarBotaoAbrir(div) {
    const toggle = document.createElement('button');
    toggle.className = 'painel-filtros-toggle';
    toggle.title = 'Filtros';
    toggle.setAttribute('aria-label', 'Abrir filtros');
    toggle.innerHTML = SVG_FUNIL;
    toggle.addEventListener('click', () => div.classList.add('aberto'));
    return toggle;
  }

  function criarConteudo(div) {
    const conteudo = document.createElement('div');
    conteudo.className = 'painel-filtros-conteudo';

    conteudo.appendChild(criarHeader(div));
    for (const item of registrados) {
      conteudo.appendChild(criarLinha(item.categoria, item.grupo));
    }
    return conteudo;
  }

  function criarHeader(div) {
    const header = document.createElement('div');
    header.className = 'painel-filtros-header';
    header.innerHTML = '<h4>Filtros</h4>';

    const fechar = document.createElement('button');
    fechar.className = 'painel-filtros-fechar';
    fechar.textContent = '×';
    fechar.title = 'Fechar';
    fechar.setAttribute('aria-label', 'Fechar filtros');
    fechar.addEventListener('click', () => div.classList.remove('aberto'));
    header.appendChild(fechar);

    return header;
  }

  function criarLinha(categoria, grupo) {
    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) grupo.addTo(mapa);
      else mapa.removeLayer(grupo);
    });

    const icone = document.createElement('span');
    icone.className = 'icone-categoria';
    icone.innerHTML = iconeMiniatura(categoria.id);

    const nome = document.createElement('span');
    nome.textContent = categoria.nome;

    const contagem = document.createElement('span');
    contagem.className = 'contagem';
    contagem.textContent = `(${grupo.getLayers().length})`;

    label.append(checkbox, icone, nome, contagem);
    return label;
  }

  // Renderiza a miniatura de um ícone de categoria pra mostrar no painel.
  // Usa o getIcone do markers.js com um marker "fake" só com a categoria.
  function iconeMiniatura(categoriaId) {
    const fake = { categoria: categoriaId };
    const icone = window.getIcone(fake);
    return icone ? icone.options.html : '';
  }

  window.Filtros = {
    inicializar,
    registrar,
    construir,
  };
})();