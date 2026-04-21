// ==========================================================================
// Popup — conteúdo e posicionamento dos popups de marker
// ==========================================================================
//
// API:
//   Popup.inicializar(mapa, { wikiBase })
//   Popup.ligarMarker(marker, dados)
//     Registra o handler de clique que abre o popup. Respeita o modo
//     régua (consultando Regua.modoAtivo()) e o posicionamento adaptativo.
// ==========================================================================

(function () {
  'use strict';

  let mapa = null;
  let wikiBase = '';

  function inicializar(mapaLeaflet, config) {
    mapa = mapaLeaflet;
    wikiBase = config.wikiBase;
  }

  function ligarMarker(marker, dados) {
    marker.on('click', () => {
      // Se o modo régua está ativo, o clique vira um ponto da régua
      // (o marker "encaminha" sua posição pro mapa simulando um clique).
      if (window.Regua && Regua.modoAtivo()) {
        mapa.fire('click', { latlng: marker.getLatLng() });
        return;
      }
      abrirPopup(marker, dados);
    });
  }

  // Abre o popup em dois passos: primeiro com offset estimado pelo tamanho
  // máximo; depois, após o DOM renderizar, mede o tamanho real e recalcula.
  // Isso evita popups "flutuando longe" quando o conteúdo é curto.
  function abrirPopup(marker, dados) {
    const offsetInicial = calcularOffset(marker, 300, 320);
    const popup = L.popup({ offset: offsetInicial, autoPan: false })
      .setLatLng(marker.getLatLng())
      .setContent(montarHTML(dados))
      .openOn(mapa);

    requestAnimationFrame(() => {
      const el = popup.getElement();
      if (!el) return;
      const offsetFinal = calcularOffset(marker, el.offsetWidth, el.offsetHeight);
      popup.options.offset = offsetFinal;
      popup.update();
    });
  }

  // Monta o HTML do popup com os campos disponíveis no YAML.
  // Campos opcionais só aparecem quando preenchidos.
  function montarHTML(d) {
    return `
      <h3>${d.nome}</h3>
      ${d.capital ? `<p class="popup-capital">Capital</p>` : ''}
      ${d.provincia ? `<p><strong>Província:</strong> ${d.provincia}</p>` : ''}
      ${d.governo ? `<p><strong>Governo:</strong> ${d.governo}</p>` : ''}
      ${d.batalhao ? `<p><strong>Batalhão:</strong> ${d.batalhao}</p>` : ''}
      ${d.comandante ? `<p><strong>Comandante:</strong> ${d.comandante}</p>` : ''}
      ${d.populacao ? `<p><strong>População:</strong> ${d.populacao.toLocaleString('pt-BR')}</p>` : ''}
      ${d.wiki ? `<p><a href="${wikiBase}${d.wiki}" target="_blank">Ler na wiki</a></p>` : ''}
    `;
  }

  // Calcula offset adaptativo: se o marker está no topo da viewport, abre
  // pra baixo; perto das bordas laterais, desloca horizontalmente.
  function calcularOffset(marker, larguraPopup, alturaPopup) {
    const margem = 20;
    const pontoNaTela = mapa.latLngToContainerPoint(marker.getLatLng());
    const tamanhoMapa = mapa.getSize();

    const espacoAcima = pontoNaTela.y - margem;
    const espacoAbaixo = tamanhoMapa.y - pontoNaTela.y - margem;
    const espacoEsquerda = pontoNaTela.x - margem;
    const espacoDireita = tamanhoMapa.x - pontoNaTela.x - margem;

    let offsetY = 0;
    if (espacoAcima < alturaPopup && espacoAbaixo > espacoAcima) {
      offsetY = alturaPopup + 20;
    }

    let offsetX = 0;
    const metadePopup = larguraPopup / 2;
    if (espacoEsquerda < metadePopup) {
      offsetX = metadePopup - espacoEsquerda;
    } else if (espacoDireita < metadePopup) {
      offsetX = -(metadePopup - espacoDireita);
    }

    return L.point(offsetX, offsetY);
  }

  window.Popup = {
    inicializar,
    ligarMarker,
  };
})();