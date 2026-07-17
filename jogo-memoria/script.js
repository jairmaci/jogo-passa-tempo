/* ── JOGO DA MEMÓRIA — KiFácil ──────────────────────────────────────────── */

/* ── CONFIG: banco de imagens (gatos da KiFácil) ── */
const IMAGENS_POOL = [
  { id: 'bentinho-alavanca',  src: '../imagens-animais/bentinho-alavanca.png' },
  { id: 'bentinho-assustado', src: '../imagens-animais/bentinho-assustado.png' },
  { id: 'bentinho-correndo',  src: '../imagens-animais/bentinho-correndo.png' },
  { id: 'bentinho-em-pe',     src: '../imagens-animais/bentinho-em-pe.png' },
  { id: 'cat-sprite-01',      src: '../imagens-animais/cat_sprite_01.png' },
  { id: 'cat-sprite-02',      src: '../imagens-animais/cat_sprite_02.png' },
  { id: 'cat-sprite-03',      src: '../imagens-animais/cat_sprite_03.png' },
  { id: 'cat-sprite-04',      src: '../imagens-animais/cat_sprite_04.png' },
  { id: 'cat-sprite-05',      src: '../imagens-animais/cat_sprite_05.png' },
  { id: 'cat-sprite-06',      src: '../imagens-animais/cat_sprite_06.png' },
  { id: 'cat-sprite-07',      src: '../imagens-animais/cat_sprite_07.png' },
  { id: 'cat-sprite-08',      src: '../imagens-animais/cat_sprite_08.png' },
  { id: 'cat-sprite-09',      src: '../imagens-animais/cat_sprite_09.png' },
  { id: 'cat-sprite-10',      src: '../imagens-animais/cat_sprite_10.png' },
  { id: 'cat-sprite-11',      src: '../imagens-animais/cat_sprite_11.png' },
  { id: 'cat-sprite-12',      src: '../imagens-animais/cat_sprite_12.png' },
  { id: 'cat-sprite-13',      src: '../imagens-animais/cat_sprite_13.png' },
  { id: 'cat-sprite-14',      src: '../imagens-animais/cat_sprite_14.png' },
  { id: 'cat-sprite-15',      src: '../imagens-animais/cat_sprite_15.png' },
  { id: 'cat-sprite-16',      src: '../imagens-animais/cat_sprite_16.png' },
  { id: 'cat-sprite-17',      src: '../imagens-animais/cat_sprite_17.png' },
  { id: 'chico-bolo',         src: '../imagens-animais/chico-bolo.png' },
  { id: 'chico-dormindo',     src: '../imagens-animais/chico-dormindo.png' },
  { id: 'chico-em-pe',        src: '../imagens-animais/chico-em-pe.png' },
  { id: 'chico-jogando',      src: '../imagens-animais/chico-jogando.png' },
  { id: 'chico-lendo',        src: '../imagens-animais/chico-lendo.png' },
  { id: 'chico-pensando',     src: '../imagens-animais/chico-pensando.png' },
  { id: 'chico-racao',        src: '../imagens-animais/chico-racao.png' },
  { id: 'pitu-em-pe',         src: '../imagens-animais/pitu-em-pe.png' },
  { id: 'teti-deitada',       src: '../imagens-animais/teti-deitada.png' },
  { id: 'teti',               src: '../imagens-animais/teti.png' },
];

/* ── CONFIG: níveis de dificuldade ── */
const NIVEIS = {
  facil:   { nome: 'Fácil',   pares: 6,  cols: 4, xp: 5  },
  medio:   { nome: 'Médio',   pares: 10, cols: 5, xp: 10 },
  dificil: { nome: 'Difícil', pares: 15, cols: 6, xp: 15 },
};
const RECORDE_KEY = 'kf_memoria_recorde_';
const XP_KEY = 'kf_memoria_xp_';

const $ = (id) => document.getElementById(id);

/* ── ESTADO ── */
let nivelAtual = null;
let cartas = [];
let carta1 = null, carta2 = null;
let travado = false;
let jogadas = 0;
let paresEncontrados = 0;
let tempoInicio = null;
let timerInterval = null;

/* ── UTIL ── */
function embaralhar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function fmtTempo(seg) {
  const m = Math.floor(seg / 60).toString().padStart(2, '0');
  const s = Math.floor(seg % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function tocar(nome) {
  const m = {
    click: '../../app-academia/sons/click.mp3',
    ding:  '../../app-academia/sons/ding.mp3',
    erro:  '../../app-academia/sons/magica.mp3',
    porta: '../../app-academia/sons/porta-abrindo.mp3',
  };
  try { new Audio(m[nome]).play().catch(() => {}); } catch (e) {}
}

/* ── SELEÇÃO DE DIFICULDADE ── */
function abrirSelecaoDificuldade() {
  Object.keys(NIVEIS).forEach(nivel => {
    const rec = localStorage.getItem(RECORDE_KEY + nivel);
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

/* ── INICIAR JOGO ── */
function iniciarJogo(nivel) {
  nivelAtual = nivel;
  const cfg = NIVEIS[nivel];

  pararTimer();
  jogadas = 0;
  paresEncontrados = 0;
  carta1 = null; carta2 = null; travado = true; // travado até embaralhar
  tempoInicio = null;

  // sorteia um conjunto aleatório de imagens (sem repetir personagem entre partidas)
  const escolhidas = embaralhar(IMAGENS_POOL).slice(0, cfg.pares);
  const par = escolhidas.concat(escolhidas).map((img, i) => ({ ...img, uid: i }));
  cartas = embaralhar(par);

  renderTabuleiro(cfg);
  // fase de prévia: todas as cartas viradas pra cima
  document.querySelectorAll('.carta').forEach(el => el.classList.add('virada'));

  atualizarStats();
  esconderOverlays();
  $('preview-wrap').classList.remove('hidden');
}

function renderTabuleiro(cfg) {
  const tabuleiro = $('tabuleiro');
  tabuleiro.innerHTML = '';
  tabuleiro.style.gridTemplateColumns = `repeat(${cfg.cols}, minmax(0, 100px))`;

  cartas.forEach((carta, idx) => {
    const el = document.createElement('div');
    el.className = 'carta';
    el.dataset.idx = idx;
    el.innerHTML = `
      <div class="carta-interior">
        <div class="carta-face carta-verso"></div>
        <div class="carta-face carta-frente"><img src="${carta.src}" alt="" loading="lazy"></div>
      </div>`;
    el.addEventListener('click', () => virarCarta(idx));
    tabuleiro.appendChild(el);
  });
}

/* ── EMBARALHAR E COMEÇAR ── */
$('btn-embaralhar').addEventListener('click', () => {
  tocar('click');
  $('preview-wrap').classList.add('hidden');
  document.querySelectorAll('.carta').forEach(el => el.classList.remove('virada'));
  setTimeout(() => {
    cartas = embaralhar(cartas);
    renderTabuleiro(NIVEIS[nivelAtual]);
    travado = false;
  }, 480);
});

/* ── VIRAR CARTA ── */
function virarCarta(idx) {
  if (travado) return;
  const el = document.querySelector(`.carta[data-idx="${idx}"]`);
  if (!el || el.classList.contains('virada') || el.classList.contains('encontrada')) return;

  if (!tempoInicio) iniciarTimer();

  el.classList.add('virada');
  tocar('click');

  if (!carta1) {
    carta1 = { idx, el };
    return;
  }
  if (carta1.idx === idx) return;

  carta2 = { idx, el };
  jogadas++;
  atualizarStats();
  travado = true;

  const iguais = cartas[carta1.idx].id === cartas[carta2.idx].id;
  if (iguais) {
    setTimeout(() => {
      carta1.el.classList.add('encontrada');
      carta2.el.classList.add('encontrada');
      paresEncontrados++;
      atualizarStats();
      tocar('ding');
      carta1 = null; carta2 = null; travado = false;
      if (paresEncontrados === NIVEIS[nivelAtual].pares) venceuJogo();
    }, 280);
  } else {
    carta1.el.classList.add('erro');
    carta2.el.classList.add('erro');
    setTimeout(() => {
      carta1.el.classList.remove('virada', 'erro');
      carta2.el.classList.remove('virada', 'erro');
      carta1 = null; carta2 = null; travado = false;
    }, 800);
  }
}

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
  $('stat-jogadas').textContent = jogadas;
  $('stat-pares').textContent = `${paresEncontrados}/${NIVEIS[nivelAtual] ? NIVEIS[nivelAtual].pares : 0}`;
}

/* ── VITÓRIA ── */
function venceuJogo() {
  pararTimer();
  tocar('porta');

  const tempoFinal = tempoDecorrido();
  $('vit-tempo').textContent = fmtTempo(tempoFinal);
  $('vit-jogadas').textContent = jogadas;

  const cfg = NIVEIS[nivelAtual];
  const chaveXp = XP_KEY + nivelAtual;
  const jaGanhouXp = localStorage.getItem(chaveXp);
  if (!jaGanhouXp) {
    localStorage.setItem(chaveXp, '1');
    $('vit-xp').textContent = `+${cfg.xp} XP`;
    $('vit-xp').style.display = '';
    if (typeof window._concederXpMemoria === 'function') window._concederXpMemoria(cfg.xp);
  } else {
    $('vit-xp').style.display = 'none';
  }

  const chaveRecorde = RECORDE_KEY + nivelAtual;
  const recordeAnterior = parseFloat(localStorage.getItem(chaveRecorde));
  const $recorde = $('vit-recorde');
  if (!recordeAnterior || tempoFinal < recordeAnterior) {
    localStorage.setItem(chaveRecorde, String(tempoFinal));
    $recorde.textContent = '🏆 Novo recorde nesta dificuldade!';
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
  abrirSelecaoDificuldade();
});

/* ── OVERLAYS ── */
function esconderOverlays() {
  document.querySelectorAll('.game-overlay').forEach(el => el.classList.add('hidden'));
}
function mostrarOverlay(id) {
  esconderOverlays();
  $(id).classList.remove('hidden');
}

/* ── INÍCIO ── */
abrirSelecaoDificuldade();
