/* ── MESA DE JANTAR — KiFácil (arranjo circular de assentos) ────────────── */

const GATOS_CFG = {
  chico:    { nome: 'Chico',    src: '../imagens-animais/chico-em-pe.png' },
  pitu:     { nome: 'Pitu',     src: '../imagens-animais/pitu-em-pe.png' },
  teti:     { nome: 'Teti',     src: '../imagens-animais/teti.png' },
  bentinho: { nome: 'Bentinho', src: '../imagens-animais/bentinho-em-pe.png' },
  lolo:     { nome: 'Lolo',     src: '../imagens-animais/lolo.png' },
  lanlan:   { nome: 'Lanlan',   src: '../imagens-animais/lanlan.png' },
};
const TODOS_GATOS = Object.keys(GATOS_CFG);
const NIVEIS = { facil: { n: 4, xp: 15 }, medio: { n: 5, xp: 25 }, dificil: { n: 6, xp: 40 } };
const RECORDE_KEY = 'kf_mesa_recorde_';
const XP_KEY = 'kf_mesa_xp_';

const $ = (id) => document.getElementById(id);

/* ── ESTADO ── */
let nivelAtual = null;
let catsAtivos = [];
let arranjoSolucao = [];
let clues = [];
let assentos = [];
let selecionado = null;
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
function permutar(arr) {
  if (arr.length <= 1) return [arr];
  const resultado = [];
  for (let i = 0; i < arr.length; i++) {
    const resto = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutar(resto)) resultado.push([arr[i], ...p]);
  }
  return resultado;
}
function tocar(nome) {
  const m = {
    click: '../../app-academia/sons/click.mp3',
    ding: '../../app-academia/sons/ding.mp3',
    porta: '../../app-academia/sons/porta-abrindo.mp3',
    tranca: '../../app-academia/sons/trancando.MP3',
  };
  try { new Audio(m[nome]).play().catch(() => {}); } catch (e) {}
}
function fmtTempo(seg) {
  const m = Math.floor(seg / 60).toString().padStart(2, '0');
  const s = Math.floor(seg % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function tempoDecorrido() { return tempoInicio ? (Date.now() - tempoInicio) / 1000 : 0; }
function iniciarTimer() { if (tempoInicio) return; tempoInicio = Date.now(); timerInterval = setInterval(atualizarStats, 250); }
function pararTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = null; }

/* ── MOTOR DE GERAÇÃO (validado: sempre gera arranjo único) ── */
function satisfazClue(arranjo, clue) {
  const n = arranjo.length;
  const pos = {};
  arranjo.forEach((g, i) => { pos[g] = i; });
  const direita = (g) => arranjo[(pos[g] + 1) % n];
  const esquerda = (g) => arranjo[(pos[g] - 1 + n) % n];
  if (clue.tipo === 'naoAoLado') return direita(clue.a) !== clue.b && esquerda(clue.a) !== clue.b;
  if (clue.tipo === 'direita') return direita(clue.b) === clue.a;
  if (clue.tipo === 'entre') {
    const viz = [esquerda(clue.a), direita(clue.a)];
    return viz.includes(clue.b) && viz.includes(clue.c) && clue.b !== clue.c;
  }
  return false;
}
function contarArranjos(cats, listaClues, limite) {
  const resto = cats.slice(1);
  const perms = permutar(resto);
  let count = 0;
  for (const p of perms) {
    const arranjo = [cats[0], ...p];
    if (listaClues.every((c) => satisfazClue(arranjo, c))) { count++; if (count >= limite) break; }
  }
  return count;
}
function gerarTodasClues(arranjo) {
  const n = arranjo.length;
  const lista = [];
  const pos = {};
  arranjo.forEach((g, i) => { pos[g] = i; });
  const direita = (g) => arranjo[(pos[g] + 1) % n];
  const esquerda = (g) => arranjo[(pos[g] - 1 + n) % n];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const a = arranjo[i], b = arranjo[j];
      if (direita(a) !== b && esquerda(a) !== b) lista.push({ tipo: 'naoAoLado', a, b });
    }
  }
  arranjo.forEach((b) => lista.push({ tipo: 'direita', a: direita(b), b }));
  arranjo.forEach((g) => lista.push({ tipo: 'entre', a: g, b: esquerda(g), c: direita(g) }));
  return lista;
}
function reduzirClues(cats, todasClues) {
  let atual = todasClues.slice();
  let mudou = true;
  while (mudou) {
    mudou = false;
    const ordem = embaralhar(atual.map((_, i) => i));
    for (const idx of ordem) {
      if (!atual[idx]) continue;
      const teste = atual.filter((c, i) => i !== idx && c);
      if (contarArranjos(cats, teste, 2) === 1) { atual[idx] = null; mudou = true; }
    }
    atual = atual.filter(Boolean);
  }
  return atual;
}
function textoClue(clue) {
  const nome = (k) => GATOS_CFG[k].nome;
  if (clue.tipo === 'naoAoLado') return `${nome(clue.a)} não senta ao lado de ${nome(clue.b)}.`;
  if (clue.tipo === 'direita') return `${nome(clue.a)} está à direita de ${nome(clue.b)}.`;
  if (clue.tipo === 'entre') return `${nome(clue.a)} senta entre ${nome(clue.b)} e ${nome(clue.c)}.`;
  return '';
}
function arranjosEquivalentesRotacao(a, b) {
  const n = a.length;
  for (let offset = 0; offset < n; offset++) {
    let igual = true;
    for (let i = 0; i < n; i++) { if (a[i] !== b[(i + offset) % n]) { igual = false; break; } }
    if (igual) return true;
  }
  return false;
}

/* ── SELEÇÃO DE NÍVEL ── */
document.querySelectorAll('.dificuldade-card').forEach((btn) => {
  btn.addEventListener('click', () => { tocar('click'); novoJogo(btn.dataset.nivel); });
});
$('btn-trocar-nivel').addEventListener('click', () => { tocar('click'); abrirSelecaoNivel(); });
$('btn-jogar-de-novo').addEventListener('click', () => { tocar('click'); novoJogo(nivelAtual); });
$('btn-tentar-de-novo').addEventListener('click', () => { tocar('click'); esconderOverlays(); $('mesa-wrap').classList.remove('hidden'); jogoAtivo = true; });

function abrirSelecaoNivel() {
  Object.keys(NIVEIS).forEach((nivel) => {
    const rec = localStorage.getItem(RECORDE_KEY + nivel);
    const el = $('recorde-' + nivel);
    if (el) el.textContent = rec ? `Melhor tempo: ${fmtTempo(parseFloat(rec))}` : '';
  });
  $('mesa-wrap').classList.add('hidden');
  mostrarOverlay('overlay-inicio');
}

/* ── NOVO JOGO ── */
function novoJogo(nivel) {
  nivelAtual = nivel;
  const n = NIVEIS[nivel].n;

  catsAtivos = embaralhar(TODOS_GATOS).slice(0, n);
  arranjoSolucao = embaralhar(catsAtivos);
  const todasClues = gerarTodasClues(arranjoSolucao);
  clues = embaralhar(reduzirClues(catsAtivos, todasClues));
  assentos = new Array(n).fill(null);
  selecionado = null;
  tempoInicio = null;
  pararTimer();
  jogoAtivo = true;

  renderMesa();
  renderPool();
  renderPistas();
  atualizarStats();
  atualizarBotaoConfirmar();
  esconderOverlays();
  $('mesa-wrap').classList.remove('hidden');
}

/* ── RENDER ── */
function renderMesa() {
  const mesa = $('mesa-circular');
  mesa.querySelectorAll('.cadeira').forEach((el) => el.remove());
  const n = catsAtivos.length;
  const raio = 42; // % do raio da mesa
  for (let i = 0; i < n; i++) {
    const anguloGraus = -90 + i * (360 / n);
    const rad = (anguloGraus * Math.PI) / 180;
    const x = 50 + raio * Math.cos(rad);
    const y = 50 + raio * Math.sin(rad);

    const cadeira = document.createElement('div');
    cadeira.className = 'cadeira' + (assentos[i] ? ' ocupada' : '') + (!assentos[i] && selecionado ? ' selecionavel' : '');
    cadeira.style.left = x + '%';
    cadeira.style.top = y + '%';
    if (assentos[i]) {
      const cfg = GATOS_CFG[assentos[i]];
      cadeira.innerHTML = `<img src="${cfg.src}" alt="${cfg.nome}" title="${cfg.nome}">`;
    } else {
      cadeira.innerHTML = `<span class="cadeira-num">${i + 1}</span>`;
    }
    cadeira.addEventListener('click', () => clicarCadeira(i));
    mesa.appendChild(cadeira);
  }
}

function renderPool() {
  const pool = $('pool-gatos');
  pool.innerHTML = '';
  catsAtivos.forEach((chave) => {
    const cfg = GATOS_CFG[chave];
    const jaSentado = assentos.includes(chave);
    const el = document.createElement('div');
    el.className = 'gato-token' + (jaSentado ? ' usado' : '') + (selecionado === chave ? ' selecionado' : '');
    el.innerHTML = `<img src="${cfg.src}" alt="${cfg.nome}"><span>${cfg.nome}</span>`;
    el.addEventListener('click', () => clicarGatoPool(chave));
    pool.appendChild(el);
  });
}

function renderPistas() {
  const lista = $('pistas-lista');
  lista.innerHTML = '';
  clues.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'pista-item';
    div.textContent = textoClue(c);
    lista.appendChild(div);
  });
}

/* ── INTERAÇÃO ── */
function clicarGatoPool(chave) {
  if (!jogoAtivo) return;
  if (assentos.includes(chave)) return;
  tocar('click');
  selecionado = selecionado === chave ? null : chave;
  renderMesa();
  renderPool();
}

function clicarCadeira(i) {
  if (!jogoAtivo) return;
  tocar('click');
  if (!tempoInicio) iniciarTimer();

  if (assentos[i]) {
    assentos[i] = null;
  } else if (selecionado) {
    assentos[i] = selecionado;
    selecionado = null;
  }
  renderMesa();
  renderPool();
  atualizarBotaoConfirmar();
}

function atualizarBotaoConfirmar() {
  $('btn-confirmar').disabled = assentos.some((a) => a === null);
}

/* ── CONFIRMAR ── */
$('btn-confirmar').addEventListener('click', () => {
  if (!jogoAtivo) return;
  tocar('click');
  if (arranjosEquivalentesRotacao(assentos, arranjoSolucao)) venceuJogo();
  else errouArrumacao();
});

function errouArrumacao() {
  tocar('tranca');
  $('resultado-eyebrow').textContent = 'Ih...';
  $('resultado-titulo').textContent = 'Ainda não é essa a arrumação!';
  $('resultado-texto').textContent = 'Alguma pista não está batendo. Reveja a mesa com calma e tente de novo.';
  $('resultado-stats').style.display = 'none';
  $('vit-xp').classList.add('hidden');
  $('vit-recorde').textContent = '';
  mostrarOverlay('overlay-resultado');
}

function venceuJogo() {
  jogoAtivo = false;
  pararTimer();
  tocar('porta');

  const tempoFinal = tempoDecorrido();
  $('resultado-eyebrow').textContent = 'Isso aí!';
  $('resultado-titulo').textContent = 'Mesa arrumada certinho!';
  $('resultado-texto').textContent = 'No sentido horário: ' + arranjoSolucao.map((k) => GATOS_CFG[k].nome).join(' → ') + '.';
  $('resultado-stats').style.display = '';
  $('vit-tempo').textContent = fmtTempo(tempoFinal);

  const cfg = NIVEIS[nivelAtual];
  const chaveXp = XP_KEY + nivelAtual;
  const jaGanhouXp = localStorage.getItem(chaveXp);
  if (!jaGanhouXp) {
    localStorage.setItem(chaveXp, '1');
    $('vit-xp').textContent = `+${cfg.xp} XP`;
    $('vit-xp').classList.remove('hidden');
    if (typeof window._concederXpMesa === 'function') window._concederXpMesa(cfg.xp);
  } else {
    $('vit-xp').classList.add('hidden');
  }

  const chaveRecorde = RECORDE_KEY + nivelAtual;
  const recordeAnterior = parseFloat(localStorage.getItem(chaveRecorde));
  if (!recordeAnterior || tempoFinal < recordeAnterior) {
    localStorage.setItem(chaveRecorde, String(tempoFinal));
    $('vit-recorde').textContent = '🏆 Novo recorde de tempo!';
  } else {
    $('vit-recorde').textContent = `Seu melhor tempo continua: ${fmtTempo(recordeAnterior)}`;
  }

  mostrarOverlay('overlay-resultado');
}

/* ── STATS ── */
function atualizarStats() {
  $('stat-tempo').textContent = fmtTempo(tempoDecorrido());
}

/* ── OVERLAYS ── */
function esconderOverlays() {
  document.querySelectorAll('.game-overlay').forEach((el) => el.classList.add('hidden'));
}
function mostrarOverlay(id) {
  esconderOverlays();
  $(id).classList.remove('hidden');
}

/* ── INÍCIO ── (disparado pelo tutorial da Rafaela, ver index.html) */
