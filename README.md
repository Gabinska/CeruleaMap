### Por que múltiplos YAMLs por categoria

Um arquivo por categoria de marker. Permite editar só um conjunto de markers por vez sem rolar por uma lista enorme. O `categorias.yaml` funciona como índice — o JS lê ele primeiro pra saber quais outros arquivos carregar. Adicionar categoria nova = criar arquivo + adicionar linha no índice. Não mexe no HTML.

### Por que múltiplos arquivos JS

Cada módulo tem uma responsabilidade clara e uma API pequena exposta via `window`. Padrão consistente em todos:

```javascript
Dados.carregarYAML(caminho) -> Promise<any>
Popup.ligarMarker(marker, dados)
Regua.inicializar(mapa)
Filtros.registrar(categoria, grupo) / construir()
Busca.registrar(marker, dados) / construir()
DeepLink.registrar(marker, dados) / abrirSeHouver()
```

O `index.html` vira "main": configura o mapa, inicializa módulos, carrega dados e orquestra o fluxo. Nenhuma lógica de feature vive lá.

---

## Conteúdo — categorias de marker

Quatro categorias de filtro no V1:

### 1. Cidades-estado
As 14 sedes de batalhão da Força Celeste. Capitais de província são marcadas com `capital: true` no YAML e recebem ícone diferente (escudo com coroa).

**Lista completa:**
Lazus (capital de Cerulea do Norte), Agnen, Estóssia, Miras, Teosia · Magnea (capital de Empódia), Endens, Orinth, Ialos, Mantar · Tegeas (capital de Dákry) · Exônia (capital de Ilha das Correntes), Forte Elpída · Vedon (capital de Cerulea do Sul)

### 2. Hidrografia
Rios, lagos, lagoas e nascentes.

**Markers atuais:** Lagoa Safina, Rio Nharos, Rio Dourado, Rio Velanthir, Nascente de Y'shar.

### 3. Terreno
Tudo que é tipo de terreno caracterizado — florestas, desertos, montanhas, planícies, dunas. Categoria consolidada.

**Markers atuais:** Cordilheira Môn, Floresta do Silêncio, Deserto de Thal'Dur, Dunas do Esquecimento, Montanhas da Esperança, Planícies Desoladas.

### 4. Rotas
Rotas de viagem.

**Marker atual:** Rota Serena (rota marítima entre Lazus e Exônia). Rotas terrestres entram em V2.

### 5. Povoados (estrutura pronta, sem conteúdo)
Arquivo `povoados.yaml` existe e o ícone está implementado (escudo sem sol e sem coroa), mas ainda vazio. Pronto pra popular em V2.

---

## Formato dos dados

Cada arquivo YAML de categoria contém uma lista de markers. Campos do marker:

```yaml
- nome: Miras
  categoria: cidade-estado
  capital: true             # opcional — presente só nas capitais de província
  provincia: Cerulea do Norte
  governo: Monarquia
  batalhao: "4º — Vingadores"
  comandante: Arador Mallen
  populacao: 28000          # opcional — se omitido, não aparece no popup
  coordenadas: [y, x]       # pixels da imagem, convenção Leaflet [y, x]
  wiki: Províncias/Cerulea-do-Norte/Miras
```

### Conteúdo do popup ao clicar no marker

- Nome do local (com linha divisória abaixo)
- Badge "CAPITAL" *(só capitais de província)*
- Província
- Forma de governo *(só cidades)*
- Batalhão + comandante *(só cidades)*
- População *(opcional — só aparece se preenchida)*
- Botão dourado "Ler na wiki"

### Formato de `velocidades.yaml`

Tabela agrupada por modo de transporte, usada pelo dropdown da régua:

```yaml
- grupo: Andando
  opcoes:
    - id: pe-lento
      nome: Ritmo lento
      kmPorDia: 20
    - id: pe-normal
      nome: Ritmo normal
      kmPorDia: 30
      padrao: true            # opcional — uma opção marcada = default do dropdown
    - id: pe-forcada
      nome: Marcha forçada
      kmPorDia: 45
```

---

## Integração com a wiki

**URL base da wiki (Quartz):** `https://gabinska.github.io/Cerulea/`

**Padrão de URL da wiki** (mantendo acentos e capitalização como o Quartz gera):

- Cidades-estado: `/Províncias/{Província}/{Cidade}`
  Exemplo: `/Províncias/Cerulea-do-Norte/Miras`
- Geografia: `/Geografia/{Categoria}/{Nome-Com-Hífen}`
  Exemplo: `/Geografia/Hidrografia/Lagoa-Safina`

### Linkagem bidirecional

- **Mapa → Wiki:** cada popup tem botão "Ler na wiki" construindo a URL com `{base} + marker.wiki`.
- **Wiki → Mapa:** URLs com `?marker=nome-normalizado` centram o mapa no marker correspondente e disparam o popup automaticamente. Permite colar "veja no mapa" em qualquer página da wiki.
  - Nomes são normalizados: minúsculo, sem acento, com hífen no lugar de espaços/apóstrofes.
  - Ex: `?marker=lazus`, `?marker=forte-elpida`, `?marker=nascente-de-y-shar`.

---

## Funcionalidades implementadas (V1)

### Navegação do mapa
- Pan (arrastar) com mouse e toque
- Zoom com scroll, pinça (touch) e botões `+` / `−`
- Zoom mínimo calculado dinamicamente (mapa sempre cabe na tela, sem bordas vazias)
- `maxBounds` com `viscosity 1.0` — impede arrastar o mapa pra fora dos limites
- Listener de `resize` recalcula o zoom mínimo quando a janela muda de tamanho
- Botões `+`/`−` estilizados com a paleta do projeto (pergaminho + borda marrom)

### Markers
- Visualmente distintos por categoria (SVGs inline via `L.divIcon`, cores via CSS)
- Paleta seguindo o guia visual de Cerulea:
  - Capital: escudo dourado com sol e coroa
  - Cidade-estado: escudo dourado com sol (sem coroa)
  - Povoado: escudo sem ornamentos *(reservado pra V2)*
  - Hidrografia: gota azul safira (`#1E4A8C`)
  - Terreno: montanha marrom-avermelhada (`#a06464`)
  - Rotas: roda de carroça vermelha escura (`#8B3A3A`)
- Clique abre popup com informações estruturadas

### Popups
- Design customizado (fundo pergaminho, borda marrom, tipografia consistente)
- Largura adaptativa (200–300 px), altura máxima 320 px com scroll
- Badge "CAPITAL" destacado em dourado para capitais de província
- Link "Ler na wiki" estilizado como botão dourado
- **Posicionamento inteligente:** o popup detecta o espaço disponível na viewport e abre pra cima ou pra baixo, desloca horizontalmente se estiver perto das bordas
- **Offset medido após renderização real:** popups menores ficam próximos do marker, popups maiores se afastam o suficiente — sem estimativa chumbada

### Filtros
- Painel colapsável no canto superior-esquerdo, fechado por padrão (ícone de funil)
- Expandido mostra título "FILTROS" + checkboxes por categoria
- Cada linha traz: checkbox + ícone miniatura da categoria + nome + contagem entre parênteses
- Cada categoria liga/desliga como um `layerGroup` do Leaflet
- Usuário pode ver qualquer combinação (todas, nenhuma, algumas)

### Busca por nome
- Painel colapsável no canto superior-direito, fechado por padrão (ícone de lupa)
- Expandido: campo de texto + botão × de fechar + lista de resultados
- **Match:** substring (contém), não só prefixo — "sa" acha "Lagoa Safina" e "Rota Serena"
- **Normalização:** ignora acentos e caixa — "dak" acha "Dákry"
- **Limite:** 5 resultados, com rodapé "e mais N resultados" quando ultrapassa
- **Navegação por teclado:** ↓ ↑ pra mover, Enter pra selecionar, Esc pra fechar
- **Resultado mostra:** ícone da categoria + nome + etiqueta da categoria em caps
- Selecionar um resultado: centraliza no marker, abre popup, limpa campo, fecha painel

### Régua de medição
- **Dois botões na cascata esquerda:** régua (📏) liga/desliga o modo, esquadro (📐) abre/fecha o painel lateral de medições. Esquadro só aparece com modo ativo.
- **Adição de pontos:** clique esquerdo no mapa cria um ponto bronze com borda branca. Clique em cima de um marker de cidade/terreno/rio cria ponto exatamente naquela posição.
- **Linha de medição:** polyline branca conectando os pontos na ordem de criação.
- **Drag:** arrastar um ponto reposiciona, com linha e tooltips atualizando em tempo real.
- **Undo:** clique direito em qualquer lugar desfaz o último ponto adicionado (não abre menu de contexto).
- **Tooltips na linha:** tooltip pergaminho discreta em cada segmento mostrando distância parcial. Com 3+ pontos, tooltip dourada adicional "Total: X km" ancorada no último ponto.
- **Painel lateral:**
  - Dropdown de meio de transporte com 11 opções em 4 grupos (a pé, cavalo, barco, zepelim) carregadas de `velocidades.yaml`.
  - Padrão "Ritmo normal, a pé" (30 km/dia).
  - Distância total e tempo de viagem formatado ("18h" / "3 dias e 5h" / "12 dias").
  - Botão Limpar zera a medição mantendo o modo ativo.
- **Limites respeitados:** cliques e drag fora do mapa são ignorados.
- **Convivência com outros cliques:** com modo régua ativo, clicar num marker vira ponto da régua ao invés de abrir popup.
- **Z-order correto via panes customizados:** linhas abaixo dos markers, pontos acima das linhas, tooltips acima dos markers (mas abaixo dos popups).
- **Escala:** 150 km = 312 px na imagem 3000×4000. Constante `KM_POR_PIXEL = 150 / 312` no `regua.js`.
- **Velocidades:** baseadas no projeto ORBIS (Stanford) — simulação histórica de viagens no Império Romano. Adaptadas ao mundo de Cerulea.

### URLs compartilháveis
- `?marker=lazus` abre o mapa já centralizado e com popup do marker aberto
- Nome normalizado, tolerante a maiúscula/minúscula e acento
- Typo ou marker inexistente: mapa abre normal + aviso no console (não derruba a app)

### Responsividade
- `<meta name="viewport">` configurado pra renderização correta em mobile
- Interface em tamanho legível e clicável em celular (botões com área de toque adequada)
- Desktop e celular funcionais como alvos de uso

---

## Arquitetura do código

### Módulos JS

Cada arquivo é um IIFE (`(function () { ... })()`) que expõe uma API mínima em `window`. Estado interno fica encapsulado no IIFE. Padrão de API consistente:

- **`inicializar(mapa, config?)`** — chamado uma vez. Recebe referência ao mapa.
- **`registrar(...)`** — chamado no loop da orquestração pra cada marker ou categoria.
- **`construir()` ou `abrirSeHouver()`** — chamado no final, monta UI ou executa lógica de startup.

Exemplos:

```javascript
// Carregamento de dados
Dados.carregarYAML('data/categorias.yaml') -> Promise
Dados.normalizar('Forte Elpída')             -> 'forte-elpida'

// Popups
Popup.inicializar(mapa, { wikiBase: '...' })
Popup.ligarMarker(marker, dados)             // registra o clique

// Régua
Regua.inicializar(mapa)
Regua.configurarVelocidades(dados)            // ativa cálculo de tempo
Regua.modoAtivo()                             // outros módulos consultam

// Filtros
Filtros.inicializar(mapa)
Filtros.registrar(categoria, grupoLayer)
Filtros.construir()
```

### Organização do `index.html`

Script inline dividido em seções demarcadas por cabeçalhos comentados:

1. **Configuração do mapa** — constantes, instância do Leaflet, overlay, zoom inicial.
2. **Comportamento do mapa** — handler de resize.
3. **Inicialização dos módulos** — todos os `Modulo.inicializar(mapa)` em sequência.
4. **Orquestração** — `carregarTudo()` lê categorias, cria markers no loop, registra em cada módulo, dispara `construir()`.

Nenhuma lógica de feature vive aqui. Tudo está nos módulos.

### Organização de um módulo (exemplo: `regua.js`)

Dentro do IIFE, seções em ordem "primeiro declara, depois usa":

1. **Constantes** — escala, cores, tamanhos.
2. **Estado interno** — variáveis mutáveis.
3. **API pública** — `inicializar`, `modoAtivo`, `configurarVelocidades`.
4. **Construção da UI** — cria controles Leaflet, popula DOM.
5. **Alternância de modo e painel** — `entrarNoModo`, `sairDoModo`, etc.
6. **Medição** — `adicionarPonto`, `desfazer`, `redesenharLinha`, `redesenharTooltips`.
7. **Painel** — `atualizarPainel`, `formatarTempo`.
8. **Cálculos geométricos** — distância, ponto médio.
9. **Ícones SVG** — strings inline.
10. **Exposição global** — `window.Regua = { ... }`.

---

## Princípios de trabalho

- **Medir antes de teorizar:** quando comportamento diverge do esperado, o console decide, não a intuição.
- **Iteração pequena:** cada mudança é testada antes da próxima. Previne acúmulo de bugs.
- **Resistir a overengineering:** escolher a solução mais simples que resolve o problema. Complexidade só entra quando a simples provar insuficiente.
- **Commits temáticos:** cada commit resolve uma coisa. Facilita reverter e ler histórico.

---

## Convenções importantes

- **Coordenadas no Leaflet:** formato `[y, x]`, não `[x, y]`. Herança da convenção geográfica (latitude antes de longitude).
- **Sistema de zoom:** escala logarítmica em torno de 0. Zoom 0 = imagem em tamanho real. Cada passo dobra/divide.
- **Dimensões do mapa:** 3000 (largura) × 4000 (altura) pixels.
- **Escala de distância:** 150 km = 312 px (medido na barra de escala do mapa original). Constante `KM_POR_PIXEL = 150 / 312` em `regua.js`.
- **Classes CSS de marker:** prefixo `marker-` como namespace pra evitar conflitos.
- **Classes CSS dos painéis:** prefixo `painel-{nome}-` (ex: `painel-filtros-toggle`, `painel-regua-conteudo`) pra agrupar por feature.
- **Panes customizados da régua:** `reguaLinhas` (z 410), `reguaPontos` (z 420), `reguaTooltips` (z 630). Controlam z-order em relação aos panes padrão do Leaflet (overlayPane 400, markerPane 600, popupPane 700).
- **Variáveis CSS:** paleta em `:root` — `--pergaminho`, `--marrom-escuro`, `--marrom-medio`, `--dourado`, `--dourado-claro`, `--cinza-info`, `--dourado-translucido`. Trocar um valor aqui repagina o projeto inteiro.

---

## Pendências — V2 e além

### Funcionalidades de mapa
- **Rotas terrestres** entre cidades (hoje só a Rota Serena marítima)
- **Markers de povoado** populados (infra já pronta)
- **Possíveis markers de lore** — ruínas, POIs de aventura
- **Modificador de terreno na régua** *(opcional)* — atualmente a velocidade é constante por modo. Futuro: seletor ou peso por tipo de terreno (estrada, floresta, montanha, deserto), talvez seguindo o modelo ORBIS de modificadores por bioma.

### Refinamentos visuais
- Painel de filtros mais compacto no mobile (consome muita largura quando aberto)
- Tipografia que combine mais com o mapa (hoje usa fonte de sistema)

### Conteúdo
- Coordenadas precisas já coletadas pros 14 markers de cidade-estado e pros markers de geografia (feito via `calibrar.html`).
- Valores de população das cidades (já preenchidos em todas as 14).
- Velocidades calibradas em `velocidades.yaml` (11 modos de transporte).
- Páginas correspondentes na wiki Quartz (criadas conforme a campanha avança; mapa funciona mesmo se a wiki estiver incompleta).