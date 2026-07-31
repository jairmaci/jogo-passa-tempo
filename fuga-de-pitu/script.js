/* Fuga de Pitu — KiFácil */

const PITU_SRC = '../imagens-animais/pitu-em-pe.png';
const RECORDE_KEY = 'kf_fuga_pitu_recorde';
const XP_KEY = 'kf_fuga_pitu_xp';
const XP_VITORIA = 35;
const LINHAS = 13;
const COLUNAS = 17;
const N_LIN = Math.floor((LINHAS - 1) / 2);
const N_COL = Math.floor((COLUNAS - 1) / 2);

/* [nome, portas obrigatórias, pares de porta-armadilha (1 vazia + 1 com bônus)] */
const CONFIG_FASES = [
  ['A Entrada', 2, 0],
  ['Galeria das Chaves', 2, 0],
  ['Sala dos Passos', 3, 1],
  ['Corredor Dourado', 3, 1],
  ['Arquivo Secreto', 4, 1],
  ['Portas da Academia', 4, 2],
  ['Caminho da Despensa', 5, 2],
  ['Ala dos Enigmas', 5, 2],
  ['Trilha Final', 6, 3],
  ['A Vasilha de Pitu', 6, 3],
];

const $ = (id) => document.getElementById(id);

let faseAtual = 0;
let faseInfo = null;
let mapasGerados = {};
let grid = [];
let jogador = { r: 0, c: 0 };
let chavesBolso = 0;
let chavesColetadas = 0;
let portasAbertas = 0;
let totalChavesFase = 0;
let totalPortasFase = 0;
let passos = 0;
let tempoInicio = null;
let timerInterval = null;
let jogoAtivo = false;

/* ── UTIL ── */
function embaralhar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function tocar() {} // efeitos sonoros desativados (áudios não fazem parte deste repositório)
function fmtTempo(seg) {
  const m = Math.floor(seg / 60).toString().padStart(2, '0');
  const s = Math.floor(seg % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function tempoDecorrido() {
  return tempoInicio ? (Date.now() - tempoInicio) / 1000 : 0;
}
function iniciarTimer() {
  if (tempoInicio) return;
  tempoInicio = Date.now();
  timerInterval = setInterval(atualizarStats, 250);
}
function pararTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

/* ── GERAÇÃO DO LABIRINTO (árvore geradora — sem ciclos, garante ramos sem volta) ── */
function gerarArvore() {
  const visitado = Array.from({ length: N_LIN }, () => Array(N_COL).fill(false));
  const adj = Array.from({ length: N_LIN }, () => Array.from({ length: N_COL }, () => []));
  const mapa = Array.from({ length: LINHAS }, () => Array(COLUNAS).fill('#'));

  const abrirCelula = (r, c) => { mapa[r * 2 + 1][c * 2 + 1] = '.'; };
  const abrirParede = (r1, c1, r2, c2) => { mapa[r1 + r2 + 1][c1 + c2 + 1] = '.'; };

  const pilha = [[0, 0]];
  visitado[0][0] = true;
  abrirCelula(0, 0);
  while (pilha.length) {
    const [r, c] = pilha[pilha.length - 1];
    const vizinhos = [];
    if (r > 0 && !visitado[r - 1][c]) vizinhos.push([r - 1, c]);
    if (r < N_LIN - 1 && !visitado[r + 1][c]) vizinhos.push([r + 1, c]);
    if (c > 0 && !visitado[r][c - 1]) vizinhos.push([r, c - 1]);
    if (c < N_COL - 1 && !visitado[r][c + 1]) vizinhos.push([r, c + 1]);
    if (!vizinhos.length) { pilha.pop(); continue; }
    const [nr, nc] = vizinhos[Math.floor(Math.random() * vizinhos.length)];
    visitado[nr][nc] = true;
    abrirCelula(nr, nc);
    abrirParede(r, c, nr, nc);
    adj[r][c].push([nr, nc]);
    adj[nr][nc].push([r, c]);
    pilha.push([nr, nc]);
  }
  return { mapa, adj };
}

function bfsMaisLonge(adj, origem) {
  const dist = Array.from({ length: N_LIN }, () => Array(N_COL).fill(-1));
  const prev = Array.from({ length: N_LIN }, () => Array(N_COL).fill(null));
  dist[origem[0]][origem[1]] = 0;
  const fila = [origem];
  let longe = origem;
  while (fila.length) {
    const [r, c] = fila.shift();
    if (dist[r][c] > dist[longe[0]][longe[1]]) longe = [r, c];
    for (const [nr, nc] of adj[r][c]) {
      if (dist[nr][nc] === -1) {
        dist[nr][nc] = dist[r][c] + 1;
        prev[nr][nc] = [r, c];
        fila.push([nr, nc]);
      }
    }
  }
  return { longe, prev };
}

/* acha o caminho mais longo da árvore (diâmetro) — vira a rota principal P → B */
function encontrarCaminhoPrincipal(adj) {
  const r1 = bfsMaisLonge(adj, [0, 0]);
  const r2 = bfsMaisLonge(adj, r1.longe);
  const caminho = [];
  let cur = r2.longe;
  while (cur) { caminho.push(cur); cur = r2.prev[cur[0]][cur[1]]; }
  return caminho.reverse();
}

/* pra um ramo que sai do caminho principal, acha a célula mais distante (bom lugar pra chave) */
function pontaDoRamo(adj, inicio, evitar) {
  const chave = (p) => p[0] + ',' + p[1];
  const visitado = new Set([chave(evitar), chave(inicio)]);
  const dist = new Map([[chave(inicio), 0]]);
  const pilha = [inicio];
  let maisLonge = inicio, maxDist = 0;
  while (pilha.length) {
    const atual = pilha.pop();
    const d = dist.get(chave(atual));
    if (d > maxDist) { maxDist = d; maisLonge = atual; }
    for (const viz of adj[atual[0]][atual[1]]) {
      if (visitado.has(chave(viz))) continue;
      visitado.add(chave(viz));
      dist.set(chave(viz), d + 1);
      pilha.push(viz);
    }
  }
  return maisLonge;
}

/* todas as células de um ramo (pra escolher mais de um lugar pra chave bônus) */
function celulasDoRamo(adj, inicio, evitar) {
  const chave = (p) => p[0] + ',' + p[1];
  const visitado = new Set([chave(evitar)]);
  const pilha = [inicio];
  const celulas = [];
  while (pilha.length) {
    const atual = pilha.pop();
    if (visitado.has(chave(atual))) continue;
    visitado.add(chave(atual));
    celulas.push(atual);
    for (const viz of adj[atual[0]][atual[1]]) {
      if (!visitado.has(chave(viz))) pilha.push(viz);
    }
  }
  return celulas;
}

function criarMapaFase(qtdPortas, qtdArmadilhas) {
  const { mapa, adj } = gerarArvore();
  const caminho = encontrarCaminhoPrincipal(adj);

  const noCaminho = new Map(caminho.map(([r, c], i) => [r + ',' + c, i]));
  const ramosPorIndice = caminho.map(() => []);
  caminho.forEach(([r, c], i) => {
    for (const [nr, nc] of adj[r][c]) {
      if (!noCaminho.has(nr + ',' + nc)) {
        ramosPorIndice[i].push({ entrada: [nr, nc], juncao: [r, c], ponta: pontaDoRamo(adj, [nr, nc], [r, c]) });
      }
    }
  });

  const inicioSeguro = 2;
  const fimSeguro = Math.max(inicioSeguro + qtdPortas * 2, caminho.length - 2);
  const passo = (fimSeguro - inicioSeguro) / (qtdPortas + 1);

  let ultimoIdx = 0;
  for (let i = 1; i <= qtdPortas; i++) {
    let alvoIdx = Math.min(caminho.length - 2, Math.round(inicioSeguro + passo * i));
    alvoIdx = Math.max(alvoIdx, ultimoIdx + 2); // garante espaço mínimo pra uma chave antes da porta
    alvoIdx = Math.min(alvoIdx, caminho.length - 2);
    if (alvoIdx <= ultimoIdx + 1) { ultimoIdx = alvoIdx; continue; } // sem espaço, pula esta porta

    let ramosDoSegmento = [];
    for (let j = alvoIdx - 1; j > ultimoIdx; j--) {
      if (ramosPorIndice[j].length) { ramosDoSegmento = ramosPorIndice[j]; ramosPorIndice[j] = []; break; }
    }

    if (ramosDoSegmento.length) {
      const [kr, kc] = ramosDoSegmento[0].ponta;
      mapa[kr * 2 + 1][kc * 2 + 1] = 'K';
    } else {
      const [kr, kc] = caminho[alvoIdx - 1];
      mapa[kr * 2 + 1][kc * 2 + 1] = 'K';
    }

    const [dr, dc] = caminho[alvoIdx];
    mapa[dr * 2 + 1][dc * 2 + 1] = 'D';
    ultimoIdx = alvoIdx;
  }

  /* ── portas "armadilha": ficam em ramos que NÃO fazem parte do caminho obrigatório.
     Abrir custa 1 chave do bolso — dentro, às vezes não tem nada (prejuízo),
     às vezes tem 2 chaves de bônus. É sempre opcional, nunca bloqueia a vasilha. */
  const ramosSobrando = [];
  ramosPorIndice.forEach((lista) => ramosSobrando.push(...lista));
  embaralhar(ramosSobrando).slice(0, qtdArmadilhas * 2).forEach((ramo, idx) => {
    const [er, ec] = ramo.entrada;
    mapa[er * 2 + 1][ec * 2 + 1] = 'D';
    const ehBonus = idx % 2 === 1; // alterna: metade vazia (prejuízo), metade com bônus
    if (ehBonus) {
      const celulas = celulasDoRamo(adj, ramo.entrada, ramo.juncao);
      embaralhar(celulas).slice(0, Math.min(2, celulas.length)).forEach(([kr, kc]) => {
        mapa[kr * 2 + 1][kc * 2 + 1] = 'K';
      });
    }
  });

  const [pr, pc] = caminho[0];
  const [br, bc] = caminho[caminho.length - 1];
  mapa[pr * 2 + 1][pc * 2 + 1] = 'P';
  mapa[br * 2 + 1][bc * 2 + 1] = 'B';

  return mapa.map((linha) => linha.join(''));
}

function gerarFase(indice) {
  const [nome, portas, armadilhas] = CONFIG_FASES[indice];
  return { nome, mapa: criarMapaFase(portas, armadilhas) };
}

/* ── FLUXO DO JOGO ── */
function novoJogo() {
  pararTimer();
  mapasGerados = {}; // novo jogo = novos labirintos sorteados
  faseAtual = 0;
  passos = 0;
  tempoInicio = null;
  carregarFase(0);
}

function carregarFase(indice) {
  faseAtual = indice;
  if (!mapasGerados[indice]) mapasGerados[indice] = gerarFase(indice);
  faseInfo = mapasGerados[indice];
  chavesBolso = 0;
  chavesColetadas = 0;
  portasAbertas = 0;
  const linhas = faseInfo.mapa;
  totalChavesFase = contarNoMapa(linhas, 'K');
  totalPortasFase = contarNoMapa(linhas, 'D');

  grid = linhas.map((linha, r) => linha.split('').map((ch, c) => {
    if (ch === 'P') { jogador = { r, c }; return '.'; }
    return ch;
  }));

  renderMapa();
  atualizarStats();
  $('mensagem-jogo').textContent = `${faseInfo.nome}: cuidado com as chaves! Algumas portas escondem armadilhas.`;
  esconderOverlays();
  $('controles-mobile').classList.remove('hidden');
  jogoAtivo = true;
}

function contarNoMapa(linhas, alvo) {
  return linhas.join('').split('').filter((ch) => ch === alvo).length;
}

function renderMapa() {
  const mapa = $('mapa');
  mapa.innerHTML = '';
  grid.forEach((linha, r) => {
    linha.forEach((tipo, c) => {
      const tile = document.createElement('div');
      tile.className = `tile ${classeTile(tipo)}`;
      tile.style.gridColumn = c + 1;
      tile.style.gridRow = r + 1;
      if (tipo === 'K') tile.innerHTML = '<div class="key" aria-label="Chave"></div>';
      if (tipo === 'B') tile.innerHTML = '<div class="bowl" aria-label="Vasilha de ração"></div>';
      mapa.appendChild(tile);
    });
  });
  const pitu = document.createElement('div');
  pitu.id = 'pitu';
  pitu.innerHTML = `<img src="${PITU_SRC}" alt="Pitu">`;
  mapa.appendChild(pitu);
  posicionarPitu();
}

function classeTile(tipo) {
  if (tipo === '#') return 'wall';
  if (tipo === 'D') return 'door';
  return 'floor';
}

function posicionarPitu() {
  const pitu = $('pitu');
  pitu.style.transform = `translate(calc(${jogador.c} * var(--tile) - 4px), calc(${jogador.r} * var(--tile) - 7px))`;
  pitu.classList.remove('andando');
  void pitu.offsetWidth;
  pitu.classList.add('andando');
}

function mover(dir) {
  if (!jogoAtivo) return;
  const delta = { cima: [-1, 0], baixo: [1, 0], esquerda: [0, -1], direita: [0, 1] }[dir];
  if (!delta) return;

  const nr = jogador.r + delta[0];
  const nc = jogador.c + delta[1];
  const destino = grid[nr]?.[nc];
  if (!destino || destino === '#') return;

  iniciarTimer();

  if (destino === 'D') {
    if (chavesBolso <= 0) {
      $('mensagem-jogo').textContent = 'Essa porta está trancada. Volte e pegue uma chave primeiro.';
      tocar('tranca');
      return;
    }
    chavesBolso--;
    portasAbertas++;
    grid[nr][nc] = '.'; // porta fica aberta pra sempre, dá pra ir e voltar
    $('mensagem-jogo').textContent = 'Porta aberta!';
    tocar('porta');
  }

  jogador = { r: nr, c: nc };
  passos++;

  if (destino === 'K') {
    chavesBolso++;
    chavesColetadas++;
    grid[nr][nc] = '.';
    $('mensagem-jogo').textContent = 'Chave coletada.';
    tocar('ding');
  }

  if (destino === 'B') {
    concluirFase();
  }

  renderMapa();
  atualizarStats();
}

function reiniciarFase() {
  tocar('click');
  carregarFase(faseAtual);
}

function concluirFase() {
  jogoAtivo = false;
  tocar('porta');
  $('controles-mobile').classList.add('hidden');

  if (faseAtual < CONFIG_FASES.length - 1) {
    $('fase-titulo').textContent = `Fase ${faseAtual + 1} concluída`;
    $('fase-texto').textContent = 'Pitu pegou todas as chaves e abriu o caminho até a ração. A próxima sala é ainda maior!';
    mostrarOverlay('overlay-fase');
    return;
  }
  vencerJogo();
}

function vencerJogo() {
  pararTimer();
  const tempoFinal = tempoDecorrido();
  $('vit-tempo').textContent = fmtTempo(tempoFinal);
  $('vit-passos').textContent = passos;

  const jaGanhouXp = localStorage.getItem(XP_KEY);
  if (!jaGanhouXp) {
    localStorage.setItem(XP_KEY, '1');
    $('vit-xp').textContent = `+${XP_VITORIA} XP`;
    $('vit-xp').style.display = '';
    if (typeof window._concederXpFugaPitu === 'function') window._concederXpFugaPitu(XP_VITORIA);
  } else {
    $('vit-xp').style.display = 'none';
  }

  const pontuacao = Math.round(tempoFinal) * 1000 + passos;
  const recordeAnterior = parseInt(localStorage.getItem(RECORDE_KEY), 10);
  if (!recordeAnterior || pontuacao < recordeAnterior) {
    localStorage.setItem(RECORDE_KEY, String(pontuacao));
    $('vit-recorde').textContent = 'Novo recorde de fuga!';
  } else {
    $('vit-recorde').textContent = 'Recorde mantido. Tente fugir com menos passos.';
  }

  mostrarOverlay('overlay-vitoria');
}

function atualizarStats() {
  $('stat-fase').textContent = `${faseAtual + 1}/${CONFIG_FASES.length}`;
  $('stat-chaves').textContent = `${chavesColetadas}/${totalChavesFase}`;
  $('stat-portas').textContent = `${portasAbertas}/${totalPortasFase}`;
  $('stat-passos').textContent = passos;
  $('stat-tempo').textContent = fmtTempo(tempoDecorrido());
}

function esconderOverlays() {
  document.querySelectorAll('.game-overlay').forEach((el) => el.classList.add('hidden'));
}
function mostrarOverlay(id) {
  esconderOverlays();
  $(id).classList.remove('hidden');
}

document.addEventListener('keydown', (e) => {
  const mapa = {
    ArrowUp: 'cima', w: 'cima', W: 'cima',
    ArrowDown: 'baixo', s: 'baixo', S: 'baixo',
    ArrowLeft: 'esquerda', a: 'esquerda', A: 'esquerda',
    ArrowRight: 'direita', d: 'direita', D: 'direita',
  };
  const dir = mapa[e.key];
  if (!dir) return;
  e.preventDefault();
  mover(dir);
});

document.querySelectorAll('.ctrl-btn').forEach((btn) => {
  btn.addEventListener('click', () => mover(btn.dataset.dir));
});

$('btn-comecar').addEventListener('click', () => { tocar('click'); novoJogo(); });
$('btn-proxima-fase').addEventListener('click', () => { tocar('click'); carregarFase(faseAtual + 1); });
$('btn-jogar-de-novo').addEventListener('click', () => { tocar('click'); novoJogo(); });
$('btn-reiniciar-fase').addEventListener('click', reiniciarFase);

atualizarStats();
