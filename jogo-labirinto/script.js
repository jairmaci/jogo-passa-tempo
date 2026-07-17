/* ── JOGO DO LABIRINTO — KiFácil ────────────────────────────────────────── */

const GATOS = {
  pitu:     { nome: 'Pitu',     src: '../imagens-animais/pitu-em-pe.png' },
  chico:    { nome: 'Chico',    src: '../imagens-animais/chico-em-pe.png' },
  teti:     { nome: 'Teti',     src: '../imagens-animais/teti.png' },
  bentinho: { nome: 'Bentinho', src: '../imagens-animais/bentinho-em-pe.png' },
  lolo:     { nome: 'Lolo',     src: '../imagens-animais/lolo.png' },
  lanlan:   { nome: 'Lanlan',   src: '../imagens-animais/lanlan.png' },
};

const NIVEIS = {
  pequeno: { nome: 'Pequeno', tamanho: 9,  cellSize: 62, xp: 5  },
  medio:   { nome: 'Médio',   tamanho: 13, cellSize: 48, xp: 10 },
  grande:  { nome: 'Grande',  tamanho: 17, cellSize: 38, xp: 15 },
};
const RECORDE_KEY = 'kf_labirinto_recorde_';
const XP_KEY = 'kf_labirinto_xp_';

const $ = (id) => document.getElementById(id);

/* ── ESTADO ── */
let gatoAtual = null;
let nivelAtual = null;
let grid = [];
let tamanho = 0;
let cellSize = 0;
let jogadorSize = 0;
let jogadorPos = { r: 0, c: 0 };
let metaPos = { r: 0, c: 0 };
let passos = 0;
let tempoInicio = null;
let timerInterval = null;
let jogoAtivo = false;

/* ── UTIL ── */
function fmtTempo(seg) {
  const m = Math.floor(seg / 60).toString().padStart(2, '0');
  const s = Math.floor(seg % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function tocar(nome) {
  const m = {
    click: '../../app-academia/sons/click.mp3',
    ding:  '../../app-academia/sons/ding.mp3',
    porta: '../../app-academia/sons/porta-abrindo.mp3',
  };
  try { new Audio(m[nome]).play().catch(() => {}); } catch (e) {}
}

/* ── GERAÇÃO DO LABIRINTO (recursive backtracker) ── */
function gerarLabirinto(n) {
  const g = [];
  for (let r = 0; r < n; r++) {
    const linha = [];
    for (let c = 0; c < n; c++) linha.push({ top: true, right: true, bottom: true, left: true, visitado: false });
    g.push(linha);
  }

  const pilha = [[0, 0]];
  g[0][0].visitado = true;

  while (pilha.length) {
    const [r, c] = pilha[pilha.length - 1];
    const vizinhos = [];
    if (r > 0 && !g[r - 1][c].visitado) vizinhos.push(['cima', r - 1, c]);
    if (r < n - 1 && !g[r + 1][c].visitado) vizinhos.push(['baixo', r + 1, c]);
    if (c > 0 && !g[r][c - 1].visitado) vizinhos.push(['esquerda', r, c - 1]);
    if (c < n - 1 && !g[r][c + 1].visitado) vizinhos.push(['direita', r, c + 1]);

    if (!vizinhos.length) { pilha.pop(); continue; }

    const [dir, nr, nc] = vizinhos[Math.floor(Math.random() * vizinhos.length)];
    if (dir === 'cima')      { g[r][c].top = false;    g[nr][nc].bottom = false; }
    if (dir === 'baixo')     { g[r][c].bottom = false; g[nr][nc].top = false; }
    if (dir === 'esquerda')  { g[r][c].left = false;   g[nr][nc].right = false; }
    if (dir === 'direita')   { g[r][c].right = false;  g[nr][nc].left = false; }

    g[nr][nc].visitado = true;
    pilha.push([nr, nc]);
  }

  return g;
}

/* ── SELEÇÃO DE GATO ── */
document.querySelectorAll('.gato-card').forEach(btn => {
  btn.addEventListener('click', () => {
    tocar('click');
    gatoAtual = btn.dataset.gato;
    abrirSelecaoDificuldade();
  });
});

function abrirSelecaoDificuldade() {
  $('gato-escolhido-texto').textContent = `Gato escolhido: ${GATOS[gatoAtual].nome}`;
  Object.keys(NIVEIS).forEach(nivel => {
    const rec = localStorage.getItem(RECORDE_KEY + gatoAtual + '_' + nivel);
    const el = $('recorde-' + nivel);
    if (el) el.textContent = rec ? `Melhor tempo: ${fmtTempo(parseFloat(rec))}` : '';
  });
  mostrarOverlay('overlay-dificuldade');
}

document.querySelectorAll('.dificuldade-card').forEach(btn => {
  btn.addEventListener('click', () => {
    tocar('click');
    iniciarJogo(btn.dataset.nivel);
  });
});

$('btn-trocar-gato').addEventListener('click', () => {
  tocar('click');
  mostrarOverlay('overlay-gato');
});

/* ── INICIAR JOGO ── */
function iniciarJogo(nivel) {
  nivelAtual = nivel;
  const cfg = NIVEIS[nivel];
  tamanho = cfg.tamanho;
  cellSize = cfg.cellSize;
  jogadorSize = Math.round(cellSize * 1.9);

  pararTimer();
  passos = 0;
  tempoInicio = null;
  jogadorPos = { r: 0, c: 0 };
  metaPos = { r: tamanho - 1, c: tamanho - 1 };
  grid = gerarLabirinto(tamanho);

  renderLabirinto();
  atualizarStats();
  esconderOverlays();
  $('controles-mobile').classList.remove('hidden');
  jogoAtivo = true;
}

function renderLabirinto() {
  const lab = $('labirinto');
  lab.innerHTML = '';
  lab.style.width = (tamanho * cellSize) + 'px';
  lab.style.height = (tamanho * cellSize) + 'px';

  for (let r = 0; r < tamanho; r++) {
    for (let c = 0; c < tamanho; c++) {
      const cel = grid[r][c];
      const el = document.createElement('div');
      el.className = 'celula' + (r === metaPos.r && c === metaPos.c ? ' celula-meta' : '');
      el.style.left = (c * cellSize) + 'px';
      el.style.top = (r * cellSize) + 'px';
      el.style.width = cellSize + 'px';
      el.style.height = cellSize + 'px';
      el.style.borderTop    = cel.top    ? '2px solid var(--parede)' : '2px solid transparent';
      el.style.borderRight  = cel.right  ? '2px solid var(--parede)' : '2px solid transparent';
      el.style.borderBottom = cel.bottom ? '2px solid var(--parede)' : '2px solid transparent';
      el.style.borderLeft   = cel.left   ? '2px solid var(--parede)' : '2px solid transparent';
      lab.appendChild(el);
    }
  }

  const jogador = document.createElement('div');
  jogador.id = 'jogador';
  jogador.style.width = jogadorSize + 'px';
  jogador.style.height = jogadorSize + 'px';
  jogador.innerHTML = `<img src="${GATOS[gatoAtual].src}" alt="${GATOS[gatoAtual].nome}">`;
  lab.appendChild(jogador);
  posicionarJogador(0, 0);
}

function posicionarJogador(r, c) {
  const jogadorEl = $('jogador');
  jogadorEl.style.left = (c * cellSize + cellSize / 2 - jogadorSize / 2) + 'px';
  jogadorEl.style.top = (r * cellSize + cellSize / 2 - jogadorSize / 2) + 'px';
}

/* ── MOVIMENTO ── */
function moverJogador(dir) {
  if (!jogoAtivo) return;
  const { r, c } = jogadorPos;
  const cel = grid[r][c];
  let nr = r, nc = c;

  if (dir === 'cima'      && !cel.top)    nr = r - 1;
  else if (dir === 'baixo'    && !cel.bottom) nr = r + 1;
  else if (dir === 'esquerda' && !cel.left)   nc = c - 1;
  else if (dir === 'direita'  && !cel.right)  nc = c + 1;
  else return;

  if (!tempoInicio) iniciarTimer();

  jogadorPos = { r: nr, c: nc };
  passos++;
  atualizarStats();
  posicionarJogador(nr, nc);

  if (nr === metaPos.r && nc === metaPos.c) venceuJogo();
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
  moverJogador(dir);
});

document.querySelectorAll('.ctrl-btn').forEach(btn => {
  btn.addEventListener('click', () => moverJogador(btn.dataset.dir));
});

/* ── TIMER ── */
function iniciarTimer() {
  tempoInicio = Date.now();
  timerInterval = setInterval(atualizarStats, 250);
}
function pararTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}
function tempoDecorrido() {
  return tempoInicio ? (Date.now() - tempoInicio) / 1000 : 0;
}

/* ── STATS ── */
function atualizarStats() {
  $('stat-tempo').textContent = fmtTempo(tempoDecorrido());
  $('stat-passos').textContent = passos;
}

/* ── VITÓRIA ── */
function venceuJogo() {
  jogoAtivo = false;
  pararTimer();
  tocar('porta');
  $('controles-mobile').classList.add('hidden');

  const tempoFinal = tempoDecorrido();
  $('vit-titulo').textContent = `O ${GATOS[gatoAtual].nome} escapou do labirinto!`;
  $('vit-tempo').textContent = fmtTempo(tempoFinal);
  $('vit-passos').textContent = passos;

  const cfg = NIVEIS[nivelAtual];
  const chaveXp = XP_KEY + gatoAtual + '_' + nivelAtual;
  const jaGanhouXp = localStorage.getItem(chaveXp);
  if (!jaGanhouXp) {
    localStorage.setItem(chaveXp, '1');
    $('vit-xp').textContent = `+${cfg.xp} XP`;
    $('vit-xp').style.display = '';
    if (typeof window._concederXpLabirinto === 'function') window._concederXpLabirinto(cfg.xp);
  } else {
    $('vit-xp').style.display = 'none';
  }

  const chaveRecorde = RECORDE_KEY + gatoAtual + '_' + nivelAtual;
  const recordeAnterior = parseFloat(localStorage.getItem(chaveRecorde));
  const $recorde = $('vit-recorde');
  if (!recordeAnterior || tempoFinal < recordeAnterior) {
    localStorage.setItem(chaveRecorde, String(tempoFinal));
    $recorde.textContent = '🏆 Novo recorde nesta configuração!';
  } else {
    $recorde.textContent = `Seu melhor tempo continua: ${fmtTempo(recordeAnterior)}`;
  }

  mostrarOverlay('overlay-vitoria');
}

$('btn-jogar-de-novo').addEventListener('click', () => {
  tocar('click');
  iniciarJogo(nivelAtual);
});
$('btn-trocar-dificuldade').addEventListener('click', () => {
  tocar('click');
  jogoAtivo = false;
  $('controles-mobile').classList.add('hidden');
  abrirSelecaoDificuldade();
});

/* ── OVERLAYS ── */
function esconderOverlays() {
  document.querySelectorAll('.game-overlay').forEach(el => el.classList.add('hidden'));
}
function mostrarOverlay(id) {
  jogoAtivo = false;
  $('controles-mobile').classList.add('hidden');
  esconderOverlays();
  $(id).classList.remove('hidden');
}

/* ── INÍCIO ── */
mostrarOverlay('overlay-gato');
