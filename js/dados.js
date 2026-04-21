// ==========================================================================
// Dados — carregamento de YAML e utilitários de string
// ==========================================================================
//
// API:
//   Dados.carregarYAML(caminho)    -> Promise<any>
//   Dados.carregarCategoria(cat)   -> Promise<{id, markers}>
//   Dados.normalizar(texto)        -> string
//     "Forte Elpída"       -> "forte-elpida"
//     "Nascente de Y'shar" -> "nascente-de-y-shar"
// ==========================================================================

(function () {
  'use strict';

  async function carregarYAML(caminho) {
    const resposta = await fetch(caminho);
    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status} ao buscar ${caminho}`);
    }
    const texto = await resposta.text();
    return jsyaml.load(texto);
  }

  async function carregarCategoria(categoria) {
    const markers = await carregarYAML(`data/${categoria.arquivo}`);
    return { id: categoria.id, markers };
  }

  // Normaliza string pra uso em comparações e URLs:
  // minúsculo, sem acento, espaços/apóstrofes viram hífen.
  function normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // remove acentos separados pelo NFD
      .replace(/['']/g, '-')             // apóstrofes viram hífen
      .replace(/\s+/g, '-');             // espaços viram hífen
  }

  window.Dados = {
    carregarYAML,
    carregarCategoria,
    normalizar,
  };
})();