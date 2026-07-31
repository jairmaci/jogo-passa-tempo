/* ── ENIGMA DOS GATOS — KiFácil (estilo "Enigma da Zebra") ──────────────── */

const CATEGORIA_META = {
  gato:      { nome: 'Gato' },
  cor:       { nome: 'Cor da Casinha' },
  petisco:   { nome: 'Petisco' },
  brinquedo: { nome: 'Brinquedo' },
  soneca:    { nome: 'Lugar da Soneca' },
};
const ORDEM_CATEGORIAS = ['gato', 'cor', 'petisco', 'brinquedo', 'soneca'];

const NIVEIS = { facil: { xp: 15 }, medio: { xp: 25 }, dificil: { xp: 40 } };
const RECORDE_KEY = 'kf_enigma_recorde_';
const XP_KEY = 'kf_enigma_xp_';

const $ = (id) => document.getElementById(id);

/* ── ESTADO ── */
let nivelAtual = null;
let puzzleAtual = null; // { n, dominios, clues }
let grade = {};
let historico = [];
let historicoIndex = 0;
let tempoInicio = null;
let timerInterval = null;
let jogoAtivo = false;

/* ── UTIL ── */
function tocar() {} // efeitos sonoros desativados (áudios não fazem parte deste repositório)
function fmtTempo(seg) {
  const m = Math.floor(seg / 60).toString().padStart(2, '0');
  const s = Math.floor(seg % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function tempoDecorrido() { return tempoInicio ? (Date.now() - tempoInicio) / 1000 : 0; }
function iniciarTimer() { tempoInicio = Date.now(); timerInterval = setInterval(atualizarStats, 250); }
function pararTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = null; }

/* ── TEXTO DAS PISTAS ── */
function textoDeClue(c, n) {
  if (c.tipo === 'posicao') {
    if (c.casa === 0) return `A casa com ${c.valor} é a primeira (nº 1).`;
    if (c.casa === n - 1) return `A casa com ${c.valor} é a última (nº ${n}).`;
    if (n % 2 === 1 && c.casa === Math.floor(n / 2)) return `A casa com ${c.valor} é a do meio.`;
    return `A casa com ${c.valor} é a casa nº ${c.casa + 1}.`;
  }
  if (c.tipo === 'mesmaCasa') return `A casa com ${c.valorA} também tem ${c.valorB}.`;
  if (c.tipo === 'esquerda') return `A casa com ${c.valorA} fica exatamente à esquerda da casa com ${c.valorB}.`;
  if (c.tipo === 'vizinho') return `A casa com ${c.valorA} fica ao lado da casa com ${c.valorB}.`;
  return '';
}

/* ── CHECAGEM DE PISTA CONTRA A GRADE ATUAL DO JOGADOR ── */
function clueSatisfeita(c, n) {
  if (c.tipo === 'posicao') return grade[c.chave][c.casa] === c.valor;
  if (c.tipo === 'mesmaCasa') {
    for (let i = 0; i < n; i++) if (grade[c.chaveA][i] === c.valorA && grade[c.chaveB][i] === c.valorB) return true;
    return false;
  }
  if (c.tipo === 'esquerda') {
    for (let i = 0; i < n - 1; i++) if (grade[c.chaveA][i] === c.valorA && grade[c.chaveB][i + 1] === c.valorB) return true;
    return false;
  }
  if (c.tipo === 'vizinho') {
    for (let i = 0; i < n - 1; i++) {
      if (grade[c.chaveA][i] === c.valorA && grade[c.chaveB][i + 1] === c.valorB) return true;
      if (grade[c.chaveB][i] === c.valorB && grade[c.chaveA][i + 1] === c.valorA) return true;
    }
    return false;
  }
  return false;
}

/* ── SELEÇÃO DE NÍVEL ── */
document.querySelectorAll('.dificuldade-card').forEach(btn => {
  btn.addEventListener('click', () => { tocar('click'); novoJogo(btn.dataset.nivel); });
});
$('btn-trocar-nivel').addEventListener('click', () => { tocar('click'); abrirSelecaoNivel(); });
$('btn-jogar-de-novo').addEventListener('click', () => { tocar('click'); novoJogo(nivelAtual); });

function abrirSelecaoNivel() {
  Object.keys(NIVEIS).forEach(nivel => {
    const rec = localStorage.getItem(RECORDE_KEY + nivel);
    const el = $('recorde-' + nivel);
    if (el) el.textContent = rec ? `Melhor tempo: ${fmtTempo(parseFloat(rec))}` : '';
  });
  $('enigma-wrap').classList.add('hidden');
  mostrarOverlay('overlay-inicio');
}

/* ── NOVO JOGO ── */
function novoJogo(nivel) {
  nivelAtual = nivel;
  mostrarOverlay('overlay-carregando');

  setTimeout(() => {
    const pool = ENIGMA_DADOS.pools[nivel];
    puzzleAtual = pool[Math.floor(Math.random() * pool.length)];

    grade = {};
    ORDEM_CATEGORIAS.forEach(ch => { grade[ch] = new Array(puzzleAtual.n).fill(null); });

    historico = [clonar(grade)];
    historicoIndex = 0;
    tempoInicio = null;
    pararTimer();
    jogoAtivo = true;

    renderGrade();
    renderPistas();
    atualizarStats();
    atualizarBotoesHistorico();

    esconderOverlays();
    $('enigma-wrap').classList.remove('hidden');
  }, 50);
}

function clonar(g) {
  const c = {};
  ORDEM_CATEGORIAS.forEach(ch => { c[ch] = g[ch].slice(); });
  return c;
}

/* ── RENDER DA GRADE ── */
function renderGrade() {
  const n = puzzleAtual.n;
  const tabela = $('grade-tabela');
  tabela.innerHTML = '';

  const theadTr = document.createElement('tr');
  theadTr.appendChild(document.createElement('th'));
  for (let i = 0; i < n; i++) {
    const th = document.createElement('th');
    th.textContent = `Casa nº ${i + 1}`;
    theadTr.appendChild(th);
  }
  tabela.appendChild(theadTr);

  ORDEM_CATEGORIAS.forEach(chave => {
    if (!(chave in puzzleAtual.dominios)) return;
    const tr = document.createElement('tr');
    const tdNome = document.createElement('td');
    tdNome.className = 'categoria-nome';
    tdNome.textContent = CATEGORIA_META[chave].nome;
    tr.appendChild(tdNome);

    for (let i = 0; i < n; i++) {
      const td = document.createElement('td');
      const select = document.createElement('select');
      const valorAtual = grade[chave][i];

      const optVazia = document.createElement('option');
      optVazia.value = '';
      optVazia.textContent = '—';
      select.appendChild(optVazia);

      const usadosEmOutraCasa = new Set(
        grade[chave].filter((v, idx) => idx !== i && v !== null)
      );
      puzzleAtual.dominios[chave].forEach(valor => {
        if (usadosEmOutraCasa.has(valor)) return;
        const opt = document.createElement('option');
        opt.value = valor;
        opt.textContent = valor;
        if (valor === valorAtual) opt.selected = true;
        select.appendChild(opt);
      });

      if (valorAtual) select.classList.add('preenchido');
      select.addEventListener('change', () => onMudarCelula(chave, i, select.value));
      td.appendChild(select);
      tr.appendChild(td);
    }
    tabela.appendChild(tr);
  });
}

function onMudarCelula(chave, casaIdx, novoValor) {
  if (!jogoAtivo) return;
  if (!tempoInicio) iniciarTimer();
  tocar('click');

  grade[chave][casaIdx] = novoValor || null;

  historico = historico.slice(0, historicoIndex + 1);
  historico.push(clonar(grade));
  historicoIndex = historico.length - 1;
  atualizarBotoesHistorico();

  renderGrade();
  renderPistas();
  atualizarStats();
  checarVitoria();
}

/* ── PISTAS ── */
function renderPistas() {
  const n = puzzleAtual.n;
  const lista = $('pistas-lista');
  lista.innerHTML = '';
  puzzleAtual.clues.forEach(c => {
    const div = document.createElement('div');
    const ok = clueSatisfeita(c, n);
    div.className = 'pista' + (ok ? ' satisfeita' : '');
    div.innerHTML = `<span class="pista-check">✓</span><span>${textoDeClue(c, n)}</span>`;
    lista.appendChild(div);
  });
}

/* ── DESFAZER / REFAZER / LIMPAR ── */
$('btn-desfazer').addEventListener('click', () => {
  if (historicoIndex <= 0) return;
  tocar('click');
  historicoIndex--;
  grade = clonar(historico[historicoIndex]);
  renderGrade(); renderPistas(); atualizarStats(); atualizarBotoesHistorico();
});
$('btn-refazer').addEventListener('click', () => {
  if (historicoIndex >= historico.length - 1) return;
  tocar('click');
  historicoIndex++;
  grade = clonar(historico[historicoIndex]);
  renderGrade(); renderPistas(); atualizarStats(); atualizarBotoesHistorico();
});
$('btn-reiniciar').addEventListener('click', () => {
  tocar('click');
  ORDEM_CATEGORIAS.forEach(ch => { grade[ch] = new Array(puzzleAtual.n).fill(null); });
  historico = [clonar(grade)];
  historicoIndex = 0;
  renderGrade(); renderPistas(); atualizarStats(); atualizarBotoesHistorico();
});
function atualizarBotoesHistorico() {
  $('btn-desfazer').disabled = historicoIndex <= 0;
  $('btn-refazer').disabled = historicoIndex >= historico.length - 1;
}

/* ── STATS ── */
function atualizarStats() {
  const n = puzzleAtual ? puzzleAtual.n : 0;
  const total = puzzleAtual ? puzzleAtual.clues.length : 0;
  const satisfeitas = puzzleAtual ? puzzleAtual.clues.filter(c => clueSatisfeita(c, n)).length : 0;
  $('stat-pistas').textContent = `${satisfeitas}/${total}`;
  $('stat-tempo').textContent = fmtTempo(tempoDecorrido());
}

/* ── VITÓRIA ── */
function checarVitoria() {
  const n = puzzleAtual.n;
  const tudoPreenchido = ORDEM_CATEGORIAS.every(ch => grade[ch].every(v => v !== null));
  if (!tudoPreenchido) return;
  const todasSatisfeitas = puzzleAtual.clues.every(c => clueSatisfeita(c, n));
  if (!todasSatisfeitas) return;
  venceuJogo();
}

function venceuJogo() {
  jogoAtivo = false;
  pararTimer();
  tocar('porta');

  const tempoFinal = tempoDecorrido();
  $('vit-tempo').textContent = fmtTempo(tempoFinal);

  const cfg = NIVEIS[nivelAtual];
  const chaveXp = XP_KEY + nivelAtual;
  const jaGanhouXp = localStorage.getItem(chaveXp);
  if (!jaGanhouXp) {
    localStorage.setItem(chaveXp, '1');
    $('vit-xp').textContent = `+${cfg.xp} XP`;
    $('vit-xp').style.display = '';
    if (typeof window._concederXpEnigma === 'function') window._concederXpEnigma(cfg.xp);
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

/* ── OVERLAYS ── */
function esconderOverlays() {
  document.querySelectorAll('.game-overlay').forEach(el => el.classList.add('hidden'));
}
function mostrarOverlay(id) {
  esconderOverlays();
  $(id).classList.remove('hidden');
}

/* ── INÍCIO ── (disparado pelo tutorial da Rafaela, ver index.html) */
