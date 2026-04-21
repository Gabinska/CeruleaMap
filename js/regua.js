// ==========================================================================
// Régua — ferramenta de medição de distâncias no mapa
// ==========================================================================
//
// Uso:
//   Regua.inicializar(map)
//   Regua.configurarVelocidades(dados)   // opcional; ativa o cálculo de tempo
//
// Expõe:
//   Regua.modoAtivo() -> boolean
//
// Controles na cascata esquerda:
//   Botão 📏 (régua)   — sempre visível. Liga/desliga modo régua.
//   Botão 📐 (esquadro) — só visível com modo ativo. Abre/fecha painel.
//
// Interação:
//   Clique esquerdo   — adiciona ponto (ou em cima de marker)
//   Arrasto do ponto  — reposiciona o ponto
//   Clique direito    — desfaz o último ponto adicionado
//   Esc               — sai do modo e limpa medição
//
// Panes customizados (z-order via CSS):
//   reguaLinhas   (410) — polylines
//   reguaPontos   (420) — pontos draggáveis
//   reguaTooltips (630) — rótulos de distância
// ==========================================================================

(function () {
  'use strict';

  // ------------------------------------------------------------------------
  // Constantes
  // ------------------------------------------------------------------------
  const KM_POR_PIXEL = 150 / 312;  // escala medida da barra do mapa original

  const PONTO = {
    raio: 6,
    cor: '#b8863f',
    borda: '#ffffff',
    larguraBorda: 2,
  };

  const LINHA = {
    cor: '#ffffff',
    largura: 3,
  };

  // ------------------------------------------------------------------------
  // Estado interno
  // ------------------------------------------------------------------------
  let map = null;
  let modoRegua = false;
  let painelAberto = false;
  let elementos = {};

  // Estado da medição atual
  let pontos = [];
  let camadaLinhas = null;
  let camadaPontos = null;
  let camadaTooltips = null;
  let polyline = null;

  // Velocidades de viagem (preenchido quando YAML carrega)
  let velocidades = null;      // estrutura vinda do YAML
  let modoSelecionado = null;  // { id, nome, kmPorDia } ou null

  // ------------------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------------------
  function inicializar(mapaLeaflet) {
    map = mapaLeaflet;

    map.createPane('reguaLinhas');
    map.getPane('reguaLinhas').style.zIndex = 410;

    map.createPane('reguaPontos');
    map.getPane('reguaPontos').style.zIndex = 420;

    map.createPane('reguaTooltips');
    map.getPane('reguaTooltips').style.zIndex = 630;
    map.getPane('reguaTooltips').style.pointerEvents = 'none';

    camadaLinhas = L.layerGroup().addTo(map);
    camadaPontos = L.layerGroup().addTo(map);
    camadaTooltips = L.layerGroup().addTo(map);

    construirBotaoRegua();
    construirPainel();
    registrarAtalhos();
    sincronizarClasses();
    console.log('[Régua] inicializada');
  }

  function modoAtivo() {
    return modoRegua;
  }

  // Recebe a tabela de velocidades (do YAML), popula o dropdown
  // e define o modo padrão. Pode ser chamado depois de inicializar.
  function configurarVelocidades(dados) {
    velocidades = dados;
    modoSelecionado = encontrarPadrao(dados);
    popularDropdown(dados);
    atualizarPainel();
    console.log('[Régua] velocidades configuradas,', dados.length, 'grupos');
  }

  // Procura a opção marcada como padrao: true. Se nenhuma tiver,
  // pega a primeira opção do primeiro grupo (fallback).
  function encontrarPadrao(grupos) {
    for (const grupo of grupos) {
      for (const op of grupo.opcoes) {
        if (op.padrao) return op;
      }
    }
    return grupos[0]?.opcoes[0] || null;
  }

  // ------------------------------------------------------------------------
  // Controle 1: botão da régua (sempre visível)
  // ------------------------------------------------------------------------
  function construirBotaoRegua() {
    const controle = L.control({ position: 'topleft' });

    controle.onAdd = function () {
      const div = L.DomUtil.create('div', 'painel-regua-botao');

      const toggle = document.createElement('button');
      toggle.className = 'painel-regua-toggle';
      toggle.type = 'button';
      toggle.title = 'Medir distâncias';
      toggle.setAttribute('aria-label', 'Medir distâncias');
      toggle.innerHTML = svgRegua();
      toggle.addEventListener('click', alternarModo);
      div.appendChild(toggle);

      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      elementos.divRegua = div;
      elementos.toggleRegua = toggle;
      return div;
    };

    controle.addTo(map);
  }

  // ------------------------------------------------------------------------
  // Controle 2: botão do esquadro + painel
  // ------------------------------------------------------------------------
  function construirPainel() {
    const controle = L.control({ position: 'topleft' });

    controle.onAdd = function () {
      const div = L.DomUtil.create('div', 'painel-regua');

      const toggle = document.createElement('button');
      toggle.className = 'painel-regua-toggle';
      toggle.type = 'button';
      toggle.title = 'Mostrar medições';
      toggle.setAttribute('aria-label', 'Mostrar medições');
      toggle.innerHTML = svgEsquadro();
      toggle.addEventListener('click', alternarPainel);
      div.appendChild(toggle);

      const conteudo = document.createElement('div');
      conteudo.className = 'painel-regua-conteudo';

      const header = document.createElement('div');
      header.className = 'painel-regua-header';
      header.innerHTML = '<h4>Medições</h4>';

      const fechar = document.createElement('button');
      fechar.className = 'painel-regua-fechar';
      fechar.type = 'button';
      fechar.textContent = '×';
      fechar.title = 'Fechar painel';
      fechar.setAttribute('aria-label', 'Fechar painel');
      fechar.addEventListener('click', fecharPainel);
      header.appendChild(fechar);
      conteudo.appendChild(header);

      // Label + dropdown de meio de transporte
      const label = document.createElement('label');
      label.className = 'painel-regua-label';
      label.textContent = 'Meio de transporte:';

      const select = document.createElement('select');
      select.className = 'painel-regua-select';
      // Começa com uma opção-placeholder até configurarVelocidades() rodar
      const opt = document.createElement('option');
      opt.textContent = 'Carregando...';
      select.appendChild(opt);
      select.disabled = true;
      select.addEventListener('change', aoTrocarModo);
      label.appendChild(select);
      conteudo.appendChild(label);

      // Info de distância e tempo
      const info = document.createElement('div');
      info.className = 'painel-regua-info';
      info.innerHTML = `
        <div><strong>Distância:</strong> <span class="painel-regua-distancia">—</span></div>
        <div><strong>Tempo:</strong> <span class="painel-regua-tempo">—</span></div>
      `;
      conteudo.appendChild(info);

      const limpar = document.createElement('button');
      limpar.className = 'painel-regua-limpar';
      limpar.type = 'button';
      limpar.textContent = 'Limpar';
      limpar.addEventListener('click', limparMedicao);
      conteudo.appendChild(limpar);

      div.appendChild(conteudo);

      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      elementos.divPainel = div;
      elementos.togglePainel = toggle;
      elementos.limpar = limpar;
      elementos.select = select;
      return div;
    };

    controle.addTo(map);
  }

  // Popula o <select> com <optgroup> por grupo e <option> por meio.
  // Seleciona a opção marcada como padrao no YAML.
  function popularDropdown(grupos) {
    const select = elementos.select;
    if (!select) return;

    select.innerHTML = '';
    select.disabled = false;

    for (const grupo of grupos) {
      const og = document.createElement('optgroup');
      og.label = grupo.grupo;

      for (const op of grupo.opcoes) {
        const opt = document.createElement('option');
        opt.value = op.id;
        opt.textContent = `${op.nome} (${op.kmPorDia} km/dia)`;
        if (op === modoSelecionado) opt.selected = true;
        og.appendChild(opt);
      }

      select.appendChild(og);
    }
  }

  // Handler de troca no dropdown: acha o objeto selecionado e atualiza.
  function aoTrocarModo(e) {
    const id = e.target.value;
    modoSelecionado = buscarOpcaoPorId(id);
    atualizarPainel();
  }

  function buscarOpcaoPorId(id) {
    if (!velocidades) return null;
    for (const grupo of velocidades) {
      for (const op of grupo.opcoes) {
        if (op.id === id) return op;
      }
    }
    return null;
  }

  function registrarAtalhos() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modoRegua) {
        sairDoModo();
      }
    });
  }

  // ------------------------------------------------------------------------
  // Alternância de modo e de painel
  // ------------------------------------------------------------------------

  function alternarModo() {
    if (modoRegua) sairDoModo();
    else entrarNoModo();
  }

  function entrarNoModo() {
    modoRegua = true;
    painelAberto = true;
    map.on('click', aoClicarNoMapa);
    map.on('contextmenu', aoClicarDireitoNoMapa);
    sincronizarClasses();
    console.log('[Régua] modo ativado');
  }

  function sairDoModo() {
    modoRegua = false;
    painelAberto = false;
    map.off('click', aoClicarNoMapa);
    map.off('contextmenu', aoClicarDireitoNoMapa);
    limparMedicao();
    sincronizarClasses();
    console.log('[Régua] modo desativado');
  }

  function alternarPainel() {
    if (!modoRegua) return;
    painelAberto = !painelAberto;
    sincronizarClasses();
    console.log(painelAberto ? '[Régua] painel aberto' : '[Régua] painel fechado');
  }

  function fecharPainel() {
    painelAberto = false;
    sincronizarClasses();
    console.log('[Régua] painel fechado (modo continua ativo)');
  }

  function sincronizarClasses() {
    elementos.divRegua.classList.toggle('ativo', modoRegua);
    elementos.divPainel.classList.toggle('visivel', modoRegua);
    elementos.divPainel.classList.toggle('aberto', painelAberto);
  }

  // ------------------------------------------------------------------------
  // Medição: adicionar, arrastar e remover pontos
  // ------------------------------------------------------------------------

  function aoClicarNoMapa(e) {
    const limites = map.options.maxBounds;
    if (limites && !limites.contains(e.latlng)) return;
    adicionarPonto(e.latlng);
  }

  function aoClicarDireitoNoMapa(e) {
    if (e.originalEvent) e.originalEvent.preventDefault();
    desfazer();
  }

  function adicionarPonto(latlng) {
    pontos.push(latlng);

    const marker = L.marker(latlng, {
      icon: criarIconePonto(),
      draggable: true,
      pane: 'reguaPontos',
      bubblingMouseEvents: false,
    });

    marker.on('drag', () => aoArrastar(marker));
    marker.addTo(camadaPontos);

    redesenharLinha();
    redesenharTooltips();
    atualizarPainel();
  }

  function criarIconePonto() {
    const diametro = PONTO.raio * 2 + PONTO.larguraBorda * 2;
    const centro = diametro / 2;
    const html = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${diametro}" height="${diametro}">
        <circle cx="${centro}" cy="${centro}" r="${PONTO.raio}"
                fill="${PONTO.cor}" stroke="${PONTO.borda}"
                stroke-width="${PONTO.larguraBorda}"/>
      </svg>
    `;
    return L.divIcon({
      className: 'ponto-regua-icone',
      html: html,
      iconSize: [diametro, diametro],
      iconAnchor: [centro, centro],
    });
  }

  function aoArrastar(marker) {
    const novaPos = marker.getLatLng();
    const idx = indiceDoMarker(marker);
    if (idx === -1) return;

    const limites = map.options.maxBounds;
    if (limites && !limites.contains(novaPos)) {
      marker.setLatLng(pontos[idx]);
      return;
    }

    pontos[idx] = novaPos;
    redesenharLinha();
    redesenharTooltips();
    atualizarPainel();
  }

  function indiceDoMarker(marker) {
    return camadaPontos.getLayers().indexOf(marker);
  }

  function desfazer() {
    if (pontos.length === 0) return;

    pontos.pop();

    const camadas = camadaPontos.getLayers();
    const ultimo = camadas[camadas.length - 1];
    if (ultimo) camadaPontos.removeLayer(ultimo);

    redesenharLinha();
    redesenharTooltips();
    atualizarPainel();
  }

  function redesenharLinha() {
    if (polyline) {
      camadaLinhas.removeLayer(polyline);
      polyline = null;
    }
    if (pontos.length < 2) return;

    polyline = L.polyline(pontos, {
      color: LINHA.cor,
      weight: LINHA.largura,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
      pane: 'reguaLinhas',
    });
    polyline.addTo(camadaLinhas);
  }

  function redesenharTooltips() {
    camadaTooltips.clearLayers();
    if (pontos.length < 2) return;

    for (let i = 1; i < pontos.length; i++) {
      const a = pontos[i - 1];
      const b = pontos[i];
      const meio = pontoMedio(a, b);
      const km = Math.round(distanciaEntre(a, b) * KM_POR_PIXEL);

      L.tooltip({
        permanent: true,
        direction: 'center',
        className: 'tooltip-regua-parcial',
        pane: 'reguaTooltips',
      })
        .setLatLng(meio)
        .setContent(`${km} km`)
        .addTo(camadaTooltips);
    }

    if (pontos.length >= 3) {
      const ultimo = pontos[pontos.length - 1];
      const kmTotal = Math.round(distanciaTotal() * KM_POR_PIXEL);

      L.tooltip({
        permanent: true,
        direction: 'top',
        offset: [0, -12],
        className: 'tooltip-regua-total',
        pane: 'reguaTooltips',
      })
        .setLatLng(ultimo)
        .setContent(`Total: ${kmTotal} km`)
        .addTo(camadaTooltips);
    }
  }

  function limparMedicao() {
    pontos = [];
    polyline = null;
    camadaLinhas.clearLayers();
    camadaPontos.clearLayers();
    camadaTooltips.clearLayers();
    atualizarPainel();
  }

  // ------------------------------------------------------------------------
  // Painel: atualização dos números (distância e tempo)
  // ------------------------------------------------------------------------

  function atualizarPainel() {
    const distanciaEl = elementos.divPainel.querySelector('.painel-regua-distancia');
    const tempoEl = elementos.divPainel.querySelector('.painel-regua-tempo');
    if (!distanciaEl || !tempoEl) return;

    if (pontos.length < 2) {
      distanciaEl.textContent = '—';
      tempoEl.textContent = '—';
      return;
    }

    const km = Math.round(distanciaTotal() * KM_POR_PIXEL);
    distanciaEl.textContent = `${km} km`;

    if (modoSelecionado) {
      tempoEl.textContent = formatarTempo(km, modoSelecionado.kmPorDia);
    } else {
      tempoEl.textContent = '—';
    }
  }

  // ------------------------------------------------------------------------
  // Formatação do tempo de viagem
  // ------------------------------------------------------------------------

  // Converte distância e velocidade em string legível:
  //   < 1 dia   → "18h"
  //   1 a 7 dias → "3 dias e 5h"
  //   > 7 dias  → "12 dias"
  function formatarTempo(km, kmPorDia) {
    const dias = km / kmPorDia;

    if (dias < 1) {
      const horas = Math.round(dias * 24);
      // Caso extremo: distância tão pequena que arredonda pra 0h
      return horas === 0 ? '< 1h' : `${horas}h`;
    }

    if (dias <= 7) {
      const diasInteiros = Math.floor(dias);
      const horas = Math.round((dias - diasInteiros) * 24);

      // Se horas arredondam pra 24, vira um dia a mais e 0 horas
      if (horas === 24) {
        return plural(diasInteiros + 1, 'dia', 'dias');
      }
      if (horas === 0) {
        return plural(diasInteiros, 'dia', 'dias');
      }
      return `${plural(diasInteiros, 'dia', 'dias')} e ${horas}h`;
    }

    return plural(Math.round(dias), 'dia', 'dias');
  }

  function plural(n, singular, pluralForma) {
    return `${n} ${n === 1 ? singular : pluralForma}`;
  }

  // ------------------------------------------------------------------------
  // Cálculos geométricos
  // ------------------------------------------------------------------------

  function distanciaTotal() {
    let total = 0;
    for (let i = 1; i < pontos.length; i++) {
      total += distanciaEntre(pontos[i - 1], pontos[i]);
    }
    return total;
  }

  function distanciaEntre(a, b) {
    const dx = b.lng - a.lng;
    const dy = b.lat - a.lat;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pontoMedio(a, b) {
    return L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
  }

  // ------------------------------------------------------------------------
  // Ícones SVG
  // ------------------------------------------------------------------------
  function svgRegua() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 6L6 21l-3-3L18 3z"/>
      <path d="M15 6l3 3"/>
      <path d="M12 9l2 2"/>
      <path d="M9 12l2 2"/>
      <path d="M6 15l2 2"/>
    </svg>`;
  }

  function svgEsquadro() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 21h18L3 3v18z"/>
      <path d="M7 17l2-2"/>
      <path d="M10 17l2-2"/>
      <path d="M13 17l2-2"/>
    </svg>`;
  }

  // ------------------------------------------------------------------------
  // Exposição global
  // ------------------------------------------------------------------------
  window.Regua = {
    inicializar: inicializar,
    modoAtivo: modoAtivo,
    configurarVelocidades: configurarVelocidades,
  };
})();