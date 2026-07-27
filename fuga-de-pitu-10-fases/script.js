/* Fuga de Pitu — KiFacil */

const PITU_SRC = '../imagens-animais/pitu-em-pe.png';
const RECORDE_KEY = 'kf_fuga_pitu_recorde';
const XP_KEY = 'kf_fuga_pitu_xp';
const XP_VITORIA = 35;
const LINHAS = 13;
const COLUNAS = 17;

const CONFIG_FASES = [
  ['A Entrada', 2],
  ['Galeria das Chaves', 2],
  ['Sala dos Passos', 3],
  ['Corredor Dourado', 3],
  ['Arquivo Secreto', 4],
  ['Portas da Academia', 4],
  ['Caminho da Despensa', 5],
  ['Ala dos Enigmas', 5],
  ['Trilha Final', 6],
  ['A Vasilha de Pitu', 6],
];

const FASES = CONFIG_FASES.map(([nome, portas], indice) => ({
  nome,
  mapa: criarMapaFase(portas, indice),
}));

const $ = (id) => document.getElementById(id);

let faseAtual = 0;
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

function criarMapaFase(qtdPortas, variante) {
  const mapa = Array.from({ length: LINHAS }, () => Array(COLUNAS).fill('#'));
  const caminho = criarCaminhoPrincipal();

  caminho.forEach(([r, c]) => {
    mapa[r][c] = '.';
  });

  const offset = variante % 3;
  const inicioSeguro = 4 + offset;
  const fimSeguro = caminho.length - 6;
  const distancia = Math.floor((fimSeguro - inicioSeguro) / qtdPortas);

  for (let i = 0; i < qtdPortas; i++) {
    const chaveIdx = inicioSeguro + i * distancia;
    const portaIdx = Math.min(chaveIdx + Math.max(3, Math.floor(distancia / 2)), fimSeguro - 1);
    const [kr, kc] = caminho[chaveIdx];
    const [dr, dc] = caminho[portaIdx];
    mapa[kr][kc] = 'K';
    mapa[dr][dc] = 'D';
  }

  adicionarSalasLaterais(mapa, caminho, variante);
  const [sr, sc] = caminho[0];
  const [br, bc] = caminho[caminho.length - 1];
  mapa[sr][sc] = 'P';
  mapa[br][bc] = 'B';

  return mapa.map((linha) => linha.join(''));
}

function criarCaminhoPrincipal() {
  const caminho = [];
  for (let r = 1; r <= 11; r += 2) {
    if (((r - 1) / 2) % 2 === 0) {
      for (let c = 1; c <= 15; c++) caminho.push([r, c]);
      if (r < 11) caminho.push([r + 1, 15]);
    } else {
      for (let c = 15; c >= 1; c--) caminho.push([r, c]);
      if (r < 11) caminho.push([r + 1, 1]);
    }
  }
  return caminho;
}

function adicionarSalasLaterais(mapa, caminho, variante) {
  const posicoes = [10, 24, 38, 52, 66, 80].map((n) => n + (variante % 2));
  posicoes.forEach((idx, i) => {
    const base = caminho[idx];
    if (!base) return;
    const [r, c] = base;
    const direcao = i % 2 === 0 ? -1 : 1;
    const rr = r + direcao;
    if (rr <= 0 || rr >= LINHAS - 1) return;
    mapa[rr][c] = '.';
    if (c > 1) mapa[rr][c - 1] = '.';
    if (c < COLUNAS - 2) mapa[rr][c + 1] = '.';
  });
}

function tocar(nome) {
  const sons = {
    click: '../../app-academia/sons/click.mp3',
    ding: '../../app-academia/sons/ding.mp3',
    porta: '../../app-academia/sons/porta-abrindo.mp3',
    tranca: '../../app-academia/sons/trancando.MP3',
  };
  try { new Audio(sons[nome]).play().catch(() => {}); } catch (e) {}
}

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

function novoJogo() {
  pararTimer();
  faseAtual = 0;
  passos = 0;
  tempoInicio = null;
  carregarFase(0);
}

function carregarFase(indice) {
  faseAtual = indice;
  chavesBolso = 0;
  chavesColetadas = 0;
  portasAbertas = 0;
  const linhas = FASES[faseAtual].mapa;
  totalChavesFase = contarNoMapa(linhas, 'K');
  totalPortasFase = contarNoMapa(linhas, 'D');

  grid = linhas.map((linha, r) => linha.split('').map((ch, c) => {
    if (ch === 'P') {
      jogador = { r, c };
      return '.';
    }
    return ch;
  }));

  renderMapa();
  atualizarStats();
  $('mensagem-jogo').textContent = `${FASES[faseAtual].nome}: ${totalChavesFase} chave(s), ${totalPortasFase} porta(s).`;
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
      if (tipo === 'B') tile.innerHTML = '<div class="bowl" aria-label="Vasilha de racao"></div>';
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
  const delta = {
    cima: [-1, 0],
    baixo: [1, 0],
    esquerda: [0, -1],
    direita: [0, 1],
  }[dir];
  if (!delta) return;

  const nr = jogador.r + delta[0];
  const nc = jogador.c + delta[1];
  const destino = grid[nr]?.[nc];
  if (!destino || destino === '#') return;

  iniciarTimer();

  if (destino === 'D') {
    if (chavesBolso <= 0) {
      $('mensagem-jogo').textContent = 'Essa porta esta trancada. Pegue a proxima chave primeiro.';
      tocar('tranca');
      return;
    }
    chavesBolso--;
    portasAbertas++;
    grid[nr][nc] = '.';
    $('mensagem-jogo').textContent = `Porta aberta! Faltam ${totalPortasFase - portasAbertas}.`;
    tocar('porta');
  }

  jogador = { r: nr, c: nc };
  passos++;

  if (destino === 'K') {
    chavesBolso++;
    chavesColetadas++;
    grid[nr][nc] = '.';
    $('mensagem-jogo').textContent = 'Chave coletada. Procure a porta correspondente.';
    tocar('ding');
  }

  if (destino === 'B') {
    if (portasAbertas < totalPortasFase) {
      $('mensagem-jogo').textContent = 'A passagem da racao so libera depois de abrir todas as portas.';
      tocar('tranca');
    } else {
      concluirFase();
    }
  }

  renderMapa();
  atualizarStats();
}

function concluirFase() {
  jogoAtivo = false;
  tocar('porta');
  $('controles-mobile').classList.add('hidden');

  if (faseAtual < FASES.length - 1) {
    $('fase-titulo').textContent = `Fase ${faseAtual + 1} concluida`;
    $('fase-texto').textContent = 'Pitu abriu todas as portas e achou a vasilha. A proxima sala tem um caminho maior.';
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
  $('stat-fase').textContent = `${faseAtual + 1}/${FASES.length}`;
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

$('btn-comecar').addEventListener('click', () => {
  tocar('click');
  novoJogo();
});
$('btn-proxima-fase').addEventListener('click', () => {
  tocar('click');
  carregarFase(faseAtual + 1);
});
$('btn-jogar-de-novo').addEventListener('click', () => {
  tocar('click');
  novoJogo();
});

atualizarStats();
