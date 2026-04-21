// ==========================================================================
// DeepLink — abrir marker específico via ?marker=xxx na URL
// ==========================================================================
//
// API:
//   DeepLink.inicializar(mapa)
//   DeepLink.registrar(marker, dados)
//   DeepLink.abrirSeHouver()     // chama no final do carregamento
// ==========================================================================

(function () {
  'use strict';

  let mapa = null;
  const porNome = {};   // { nomeNormalizado: marker }

  function inicializar(mapaLeaflet) {
    mapa = mapaLeaflet;
  }

  function registrar(marker, dados) {
    porNome[Dados.normalizar(dados.nome)] = marker;
  }

  // Se a URL tem ?marker=xxx válido, centraliza o mapa nele e dispara
  // o clique (que o Popup.ligarMarker já cuidou de registrar).
  function abrirSeHouver() {
    const alvo = lerDaURL();
    if (!alvo) return;

    const marker = porNome[alvo];
    if (!marker) {
      console.warn(`Marker "${alvo}" não encontrado.`);
      return;
    }

    mapa.setView(marker.getLatLng(), -1);
    marker.fire('click');
  }

  function lerDaURL() {
    const params = new URLSearchParams(window.location.search);
    const nome = params.get('marker');
    return nome ? Dados.normalizar(nome) : null;
  }

  window.DeepLink = {
    inicializar,
    registrar,
    abrirSeHouver,
  };
})();