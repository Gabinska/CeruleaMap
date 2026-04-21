# CeruleaMap — Escopo do Projeto

## Visão geral

Mapa interativo do mundo de Cerulea para a campanha *Fragmentos de um Sonho Cerúleo*, hospedado em GitHub Pages, integrado bidirecionalmente com a wiki da campanha (feita em Quartz). O mapa serve jogadores e GM como ferramenta de consulta e navegação — tipo "Google Maps" do cenário.

**URL em produção:** https://gabinska.github.io/CeruleaMap/

---

## Stack técnica

- **Leaflet.js** (via CDN) — biblioteca de mapas, usando modo `CRS.Simple` (imagem como mundo, coordenadas em pixels).
- **js-yaml** (via CDN) — parser de YAML no navegador.
- **HTML + CSS + JavaScript puro** — sem frameworks, sem build step.
- **GitHub Pages** — hospedagem estática.
- **VS Code** — editor.

### Decisões deliberadas

- **Sem frameworks (React, Vue, etc.):** projeto pequeno, não justifica complexidade adicional.
- **Sem build step:** salvar arquivo, atualizar navegador, ver mudança. Zero intermediários.
- **CDN em vez de bibliotecas locais:** simplicidade de deploy, sem instalação.

---

## Estrutura de arquivos

```
CeruleaMap/
├── index.html              # HTML + JS principal (seções organizadas com cabeçalhos)
├── calibrar.html           # Ferramenta auxiliar de calibração de coordenadas
├── css/
│   └── styles.css          # Estilos de markers, popups, painéis e botões
├── js/
│   └── markers.js          # SVGs dos ícones por categoria + getIcone()
├── assets/
│   ├── mapa-cerulea.png    # 3000 × 4000 px, versão sem nomes e sem bússola
│   └── mapa-cerulea_names.png  # versão com nomes, usada pra calibrar coordenadas
├── data/
│   ├── categorias.yaml     # índice: quais arquivos de dados carregar
│   ├── cidades-estado.yaml
│   ├── hidrografia.yaml
│   ├── terreno.yaml
│   ├── rotas.yaml
│   └── povoados.yaml       # estrutura pronta, conteúdo vem em V2
└── README.md
```

### Por que múltiplos YAMLs por categoria

Um arquivo por categoria de marker. Permite editar só um conjunto de markers por vez sem rolar por uma lista enorme. O `categorias.yaml` funciona como índice — o JS lê ele primeiro pra saber quais outros arquivos carregar. Adicionar categoria nova = criar arquivo + adicionar linha no índice. Não mexe no HTML.

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

Cada arquivo YAML contém uma lista de markers. Campos do marker:

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

### Organização do `index.html`

O `<script>` é dividido em seções demarcadas por cabeçalhos comentados, na ordem "primeiro declara, depois usa":

1. **Configuração do mapa** — constantes, instância do Leaflet, overlay da imagem, zoom inicial
2. **Comportamento do mapa** — handler de resize
3. **Carregamento de dados (YAML)** — `carregarYAML`, `carregarCategoria`
4. **Renderização de markers** — `montarPopup`, `calcularOffsetComTamanho`
5. **Painel de filtros** — `construirFiltros`, `getIconeMiniatura`, SVG do funil
6. **Deep-link por URL** — `normalizar`, `lerMarkerDaURL`, `abrirMarkerDaURL`
7. **Busca** — `construirBusca`, `buscarMarkers`, SVG da lupa
8. **Orquestração** — `carregarTudo`, chamada final

### Separação em arquivos

- **`index.html`** — configuração do mapa e toda a lógica da aplicação
- **`js/markers.js`** — SVGs dos ícones, `L.divIcon` configurados, função `getIcone` exportada via `window`
- **`css/styles.css`** — estilos de markers, popups, painéis e botões de zoom

---

## Convenções importantes

- **Coordenadas no Leaflet:** formato `[y, x]`, não `[x, y]`. Herança da convenção geográfica (latitude antes de longitude).
- **Sistema de zoom:** escala logarítmica em torno de 0. Zoom 0 = imagem em tamanho real. Cada passo dobra/divide.
- **Dimensões do mapa:** 3000 (largura) × 4000 (altura) pixels.
- **Escala de distância:** 150 km = X pixels (a medir na barra de escala original quando implementar a régua).
- **Classes CSS de marker:** prefixo `marker-` como namespace pra evitar conflitos.

---

## Pendências — V2 e além

### Funcionalidades de mapa
- **Régua de medição** com três níveis:
  1. Régua simples entre dois pontos
  2. Rota quebrada com múltiplos pontos (soma segmentos)
  3. Estimativa de tempo de viagem (a pé, cavalo, barco)
  - Calibrar escala pela barra de 150 km do mapa original
  - Definir velocidades de referência por modo (decisão de campanha)
- **Rotas terrestres** entre cidades (hoje só a Rota Serena marítima)
- **Markers de povoado** populados (infra já pronta)
- **Possíveis markers de lore** — ruínas, POIs de aventura

### Refinamentos visuais
- Painel de filtros mais compacto no mobile (consome muita largura quando aberto)
- Tipografia que combine mais com o mapa (hoje usa fonte de sistema)

### Conteúdo
- Coordenadas precisas já coletadas pros 14 markers de cidade-estado e pros markers de geografia (feito via `calibrar.html`).
- Valores de população das cidades (já preenchidos em todas as 14).
- Velocidades de referência pros modais de viagem *(a definir antes da régua)*.
- Páginas correspondentes na wiki Quartz (criadas conforme a campanha avança; mapa funciona mesmo se a wiki estiver incompleta).