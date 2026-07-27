/* ── CAMPO DOS RATINHOS — KiFácil (estilo Campo Minado) ─────────────────── */

const NIVEIS = {
  facil:   { nome: 'Fácil',   tamanho: 8,  minas: 10, cellSize: 42, xp: 10 },
  medio:   { nome: 'Médio',   tamanho: 10, minas: 16, cellSize: 36, xp: 20 },
  dificil: { nome: 'Difícil', tamanho: 12, minas: 26, cellSize: 30, xp: 35 },
};
const RECORDE_KEY = 'kf_campo_recorde_';
const XP_KEY = 'kf_campo_xp_';

const $ = (id) => document.getElementById(id);

/* ── ESTADO ── */
let nivelAtual = null;
let tamanho = 0;
let totalMinas = 0;
let grid = [];
let primeiraJogada = true;
let modoBandeira = false;
let jogoAtivo = false;
let celulasReveladas = 0;
let bandeirasColocadas = 0;
let tempoInicio = null;
let timerInterval = null;

/* ── UTIL ── */
function tocar(nome) {
  const m = {
    click:  '../../app-academia/sons/click.mp3',
    ding:   '../../app-academia/sons/ding.mp3',
    porta:  '../../app-academia/sons/porta-abrindo.mp3',
    tranca: '../../app-academia/sons/trancando.MP3',
  };
  try { new Audio(m[nome]).play().catch(() => {}); } catch (e) {}
}
function fmtTempo(seg) {
  const m = Math.floor(seg / 60).toString().padStart(2, '0');
  const s = Math.floor(seg % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function fmtDigital(n) {
  return String(Math.max(0, Math.min(999, Math.floor(n)))).padStart(3, '0');
}
function tempoDecorrido() { return tempoInicio ? (Date.now() - tempoInicio) / 1000 : 0; }
function iniciarTimer() { tempoInicio = Date.now(); timerInterval = setInterval(atualizarStats, 250); }
function pararTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = null; }

function vizinhos(r, c) {
  const v = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < tamanho && nc >= 0 && nc < tamanho) v.push([nr, nc]);
    }
  }
  return v;
}

/* ── SELEÇÃO DE NÍVEL ── */
document.querySelectorAll('.dificuldade-card').forEach(btn => {
  btn.addEventListener('click', () => { tocar('click'); novoJogo(btn.dataset.nivel); });
});
$('btn-trocar-nivel').addEventListener('click', () => { tocar('click'); abrirSelecaoNivel(); });
$('btn-trocar-nivel-derrota').addEventListener('click', () => { tocar('click'); abrirSelecaoNivel(); });
$('btn-jogar-de-novo').addEventListener('click', () => { tocar('click'); novoJogo(nivelAtual); });
$('btn-tentar-de-novo').addEventListener('click', () => { tocar('click'); novoJogo(nivelAtual); });

function abrirSelecaoNivel() {
  Object.keys(NIVEIS).forEach(nivel => {
    const rec = localStorage.getItem(RECORDE_KEY + nivel);
    const el = $('recorde-' + nivel);
    if (el) el.textContent = rec ? `Melhor tempo: ${fmtTempo(parseFloat(rec))}` : '';
  });
  mostrarOverlay('overlay-dificuldade');
}

/* ── NOVO JOGO ── */
function novoJogo(nivel) {
  nivelAtual = nivel;
  const cfg = NIVEIS[nivel];
  tamanho = cfg.tamanho;
  totalMinas = cfg.minas;

  pararTimer();
  grid = [];
  for (let r = 0; r < tamanho; r++) {
    const linha = [];
    for (let c = 0; c < tamanho; c++) linha.push({ mina: false, revelada: false, bandeira: false, adjacentes: 0 });
    grid.push(linha);
  }
  primeiraJogada = true;
  modoBandeira = false;
  jogoAtivo = true;
  celulasReveladas = 0;
  bandeirasColocadas = 0;
  tempoInicio = null;

  $('btn-modo-bandeira').classList.remove('ativo');
  $('modo-atual').textContent = 'Modo: Revelar (clique direito marca 🐾)';
  $('btn-rosto').textContent = '🐱';

  renderTabuleiro(cfg.cellSize);
  atualizarStats();
  esconderOverlays();
}

/* ── COLOCAÇÃO DAS MINAS (após o primeiro clique, sem armar perto dele) ── */
function colocarMinas(excluirR, excluirC) {
  const proibidas = new Set(vizinhos(excluirR, excluirC).map(([r, c]) => r + ',' + c));
  proibidas.add(excluirR + ',' + excluirC);

  let colocadas = 0;
  while (colocadas < totalMinas) {
    const r = Math.floor(Math.random() * tamanho);
    const c = Math.floor(Math.random() * tamanho);
    if (proibidas.has(r + ',' + c)) continue;
    if (grid[r][c].mina) continue;
    grid[r][c].mina = true;
    colocadas++;
  }

  for (let r = 0; r < tamanho; r++) {
    for (let c = 0; c < tamanho; c++) {
      if (grid[r][c].mina) continue;
      grid[r][c].adjacentes = vizinhos(r, c).filter(([nr, nc]) => grid[nr][nc].mina).length;
    }
  }
}

/* ── RENDER ── */
function renderTabuleiro(cellSize) {
  const tab = $('campo-tabuleiro');
  tab.innerHTML = '';
  tab.style.gridTemplateColumns = `repeat(${tamanho}, ${cellSize}px)`;

  for (let r = 0; r < tamanho; r++) {
    for (let c = 0; c < tamanho; c++) {
      const el = document.createElement('div');
      el.className = 'celula';
      el.dataset.r = r;
      el.dataset.c = c;
      el.style.width = cellSize + 'px';
      el.style.height = cellSize + 'px';
      el.style.fontSize = Math.round(cellSize * 0.5) + 'px';
      el.addEventListener('click', () => clicarCelula(r, c));
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); alternarBandeira(r, c); });
      tab.appendChild(el);
    }
  }
}

function elCelula(r, c) {
  return document.querySelector(`.celula[data-r="${r}"][data-c="${c}"]`);
}

function atualizarCelulaDOM(r, c) {
  const cel = grid[r][c];
  const el = elCelula(r, c);
  if (!el) return;
  el.classList.toggle('revelada', cel.revelada);
  el.classList.toggle('bandeira', cel.bandeira && !cel.revelada);

  if (cel.revelada && cel.mina) {
    el.classList.add('rato-revelado');
    el.textContent = '🐭';
  } else if (cel.revelada && cel.adjacentes > 0) {
    el.classList.add('num-' + cel.adjacentes);
    el.textContent = cel.adjacentes;
  } else if (cel.revelada) {
    el.textContent = '';
  } else if (cel.bandeira) {
    el.textContent = '🐾';
  } else {
    el.textContent = '';
  }
}

/* ── MODO BANDEIRA (toque em mobile) ── */
$('btn-modo-bandeira').addEventListener('click', () => {
  if (!jogoAtivo) return;
  tocar('click');
  modoBandeira = !modoBandeira;
  $('btn-modo-bandeira').classList.toggle('ativo', modoBandeira);
  $('modo-atual').textContent = modoBandeira ? 'Modo: Marcar 🐾' : 'Modo: Revelar (clique direito marca 🐾)';
});

/* ── ROSTINHO (recomeça o mesmo nível) ── */
$('btn-rosto').addEventListener('click', () => {
  if (!nivelAtual) return;
  tocar('click');
  novoJogo(nivelAtual);
});

/* ── CLIQUE NA CÉLULA ── */
function clicarCelula(r, c) {
  if (!jogoAtivo) return;
  if (modoBandeira) { alternarBandeira(r, c); return; }
  revelar(r, c);
}

function alternarBandeira(r, c) {
  if (!jogoAtivo) return;
  const cel = grid[r][c];
  if (cel.revelada) return;
  tocar('click');
  cel.bandeira = !cel.bandeira;
  bandeirasColocadas += cel.bandeira ? 1 : -1;
  atualizarCelulaDOM(r, c);
  atualizarStats();
}

function revelar(r, c) {
  const cel = grid[r][c];
  if (cel.revelada || cel.bandeira) return;

  if (primeiraJogada) {
    colocarMinas(r, c);
    primeiraJogada = false;
    iniciarTimer();
  }
  tocar('click');

  if (cel.mina) {
    cel.revelada = true;
    perdeuJogo(r, c);
    return;
  }

  revelarComFloodFill(r, c);
  atualizarStats();
  checarVitoria();
}

function revelarComFloodFill(rInicial, cInicial) {
  const pilha = [[rInicial, cInicial]];
  while (pilha.length) {
    const [r, c] = pilha.pop();
    const cel = grid[r][c];
    if (cel.revelada || cel.bandeira || cel.mina) continue;
    cel.revelada = true;
    celulasReveladas++;
    atualizarCelulaDOM(r, c);
    if (cel.adjacentes === 0) {
      vizinhos(r, c).forEach(([nr, nc]) => {
        if (!grid[nr][nc].revelada && !grid[nr][nc].mina) pilha.push([nr, nc]);
      });
    }
  }
}

/* ── FIM DE JOGO ── */
function perdeuJogo(rClicada, cClicada) {
  jogoAtivo = false;
  pararTimer();
  tocar('tranca');
  $('btn-rosto').textContent = '🙀';

  for (let r = 0; r < tamanho; r++) {
    for (let c = 0; c < tamanho; c++) {
      if (grid[r][c].mina) { grid[r][c].revelada = true; atualizarCelulaDOM(r, c); }
    }
  }
  const elExplodida = elCelula(rClicada, cClicada);
  if (elExplodida) elExplodida.classList.add('explodiu');

  $('painel-derrota').classList.remove('hidden');
}

function checarVitoria() {
  const totalSeguras = tamanho * tamanho - totalMinas;
  if (celulasReveladas === totalSeguras) venceuJogo();
}

function venceuJogo() {
  jogoAtivo = false;
  pararTimer();
  tocar('porta');
  $('btn-rosto').textContent = '😻';

  for (let r = 0; r < tamanho; r++) {
    for (let c = 0; c < tamanho; c++) {
      if (grid[r][c].mina && !grid[r][c].bandeira) {
        grid[r][c].bandeira = true;
        atualizarCelulaDOM(r, c);
      }
    }
  }

  const tempoFinal = tempoDecorrido();
  $('vit-tempo').textContent = fmtTempo(tempoFinal);

  const cfg = NIVEIS[nivelAtual];
  const chaveXp = XP_KEY + nivelAtual;
  const jaGanhouXp = localStorage.getItem(chaveXp);
  if (!jaGanhouXp) {
    localStorage.setItem(chaveXp, '1');
    $('vit-xp').textContent = `+${cfg.xp} XP`;
    $('vit-xp').style.display = '';
    if (typeof window._concederXpCampo === 'function') window._concederXpCampo(cfg.xp);
  } else {
    $('vit-xp').style.display = 'none';
  }

  const chaveRecorde = RECORDE_KEY + nivelAtual;
  const recordeAnterior = parseFloat(localStorage.getItem(chaveRecorde));
  const $recorde = $('vit-recorde');
  if (!recordeAnterior || tempoFinal < recordeAnterior) {
    localStorage.setItem(chaveRecorde, String(tempoFinal));
    $recorde.textContent = '🏆 Novo recorde de tempo!';
  } else {
    $recorde.textContent = `Seu melhor tempo continua: ${fmtTempo(recordeAnterior)}`;
  }

  mostrarOverlay('overlay-vitoria');
}

/* ── STATS ── */
function atualizarStats() {
  $('stat-ratinhos').textContent = fmtDigital(totalMinas - bandeirasColocadas);
  $('stat-tempo').textContent = fmtDigital(tempoDecorrido());
}

/* ── OVERLAYS ── */
function esconderOverlays() {
  document.querySelectorAll('.game-overlay').forEach(el => el.classList.add('hidden'));
  $('painel-derrota').classList.add('hidden');
}
function mostrarOverlay(id) {
  esconderOverlays();
  $(id).classList.remove('hidden');
}

/* ── INÍCIO ── */
abrirSelecaoNivel();
