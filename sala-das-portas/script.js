/* ── SALA DAS PORTAS — KiFácil (portas em cadeia, lógica de planejamento) ── */

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
const RECORDE_KEY = 'kf_portas_recorde_';
const XP_KEY = 'kf_portas_xp_';

const $ = (id) => document.getElementById(id);

/* ── ESTADO ── */
let nivelAtual = null;
let rodadaAtual = null;   // { cats, saidaId, estadosIniciais, regras, regrasExibidas }
let estadosAtuais = null; // { [catId]: 'trancada' | 'disponivel' | 'aberta' }
let jogoAtivo = false;
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

/* ── GERAÇÃO ──
   Constrói uma "ordem" aleatória de N portas: ordem[0] é a porta certa pra começar,
   ordem[n-1] é a saída. Toda porta (exceto ordem[0] e uma porta-isca) começa trancada,
   com uma regra de destrancar vinda de alguma porta ANTERIOR na ordem (nunca a isca —
   assim a isca nunca é um passo obrigatório, só uma cilada opcional). A isca tem uma
   única regra própria: abrir ela tranca a porta certa inicial (ordem[0]) — como ordem[0]
   é a raiz de toda a cadeia de destrancamentos, isso torna a cilada realmente fatal.
   Depois disso tudo é conferido por força bruta (podeVencer) antes de aceitar a rodada. */
function gerarCandidato(n) {
  const cats = embaralhar(TODOS_GATOS).slice(0, n);
  const saidaId = cats[n - 1];
  const decoyIndex = 1 + Math.floor(Math.random() * (n - 2)); // entre 1 e n-2

  const estadosIniciais = {};
  const regras = [];
  cats.forEach((id, i) => {
    if (i === 0 || i === decoyIndex) {
      estadosIniciais[id] = 'disponivel';
    } else {
      estadosIniciais[id] = 'trancada';
      const pool = [];
      for (let k = 0; k < i; k++) if (k !== decoyIndex) pool.push(k);
      const j = pool[Math.floor(Math.random() * pool.length)];
      regras.push({ gatilho: cats[j], efeito: 'destranca', alvo: id });
    }
  });
  regras.push({ gatilho: cats[decoyIndex], efeito: 'tranca', alvo: cats[0] });

  return { cats, saidaId, estadosIniciais, regras };
}

function aplicarAbertura(estados, regras, portaId) {
  const novo = { ...estados };
  novo[portaId] = 'aberta';
  regras.forEach((r) => {
    if (r.gatilho === portaId && novo[r.alvo] !== 'aberta') {
      novo[r.alvo] = r.efeito === 'destranca' ? 'disponivel' : 'trancada';
    }
  });
  return novo;
}

function podeVencer(cats, saidaId, estados, regras) {
  if (estados[saidaId] === 'disponivel') return true;
  const disponiveis = cats.filter((id) => estados[id] === 'disponivel');
  return disponiveis.some((id) => podeVencer(cats, saidaId, aplicarAbertura(estados, regras, id), regras));
}

function buscarSolucoes(cats, saidaId, estadosIniciais, regras) {
  const primeirasJogadas = cats.filter((id) => estadosIniciais[id] === 'disponivel');
  const resultados = primeirasJogadas.map((id) => ({
    id,
    vence: podeVencer(cats, saidaId, aplicarAbertura(estadosIniciais, regras, id), regras),
  }));
  return {
    existeVitoria: resultados.some((r) => r.vence),
    existeArmadilha: resultados.some((r) => !r.vence),
  };
}

function gerarRodada(n) {
  for (let tentativa = 0; tentativa < 300; tentativa++) {
    const cand = gerarCandidato(n);
    const { existeVitoria, existeArmadilha } = buscarSolucoes(cand.cats, cand.saidaId, cand.estadosIniciais, cand.regras);
    if (existeVitoria && existeArmadilha) return cand;
  }
  return gerarCandidato(n); // não deveria ser necessário, só uma rede de segurança
}

/* ── TEXTO DAS PISTAS ── */
function textoRegra(r) {
  const nomeA = GATOS_CFG[r.gatilho].nome;
  const nomeB = GATOS_CFG[r.alvo].nome;
  return r.efeito === 'destranca'
    ? `🔓 Abrir a porta do(a) ${nomeA} destranca a porta do(a) ${nomeB}.`
    : `🔒 Abrir a porta do(a) ${nomeA} tranca a porta do(a) ${nomeB}.`;
}

/* ── SELEÇÃO DE NÍVEL ── */
document.querySelectorAll('.dificuldade-card').forEach((btn) => {
  btn.addEventListener('click', () => { tocar('click'); novoJogo(btn.dataset.nivel); });
});
$('btn-trocar-nivel').addEventListener('click', () => { tocar('click'); abrirSelecaoNivel(); });
$('btn-nova-rodada').addEventListener('click', () => { tocar('click'); novoJogo(nivelAtual); });

function abrirSelecaoNivel() {
  Object.keys(NIVEIS).forEach((nivel) => {
    const rec = localStorage.getItem(RECORDE_KEY + nivel);
    const el = $('recorde-' + nivel);
    if (el) el.textContent = rec ? `Melhor tempo: ${fmtTempo(parseFloat(rec))}` : '';
  });
  $('portas-wrap').classList.add('hidden');
  mostrarOverlay('overlay-inicio');
}

/* ── NOVO JOGO ── */
function novoJogo(nivel) {
  nivelAtual = nivel;
  rodadaAtual = gerarRodada(NIVEIS[nivel].n);
  rodadaAtual.regrasExibidas = embaralhar(rodadaAtual.regras);
  estadosAtuais = { ...rodadaAtual.estadosIniciais };
  tempoInicio = null;
  pararTimer();
  jogoAtivo = true;

  esconderOverlays();
  $('portas-wrap').classList.remove('hidden');
  renderPortas();
  renderPistas();
  renderStats();
}

function recomecarRodada() {
  estadosAtuais = { ...rodadaAtual.estadosIniciais };
  tempoInicio = null;
  pararTimer();
  jogoAtivo = true;
  esconderOverlays();
  $('portas-wrap').classList.remove('hidden');
  renderPortas();
  renderStats();
}

/* ── JOGADA ── */
function abrirPorta(id) {
  if (!jogoAtivo || estadosAtuais[id] !== 'disponivel') return;
  tocar('click');
  if (!tempoInicio) iniciarTimer();

  const eraSaida = id === rodadaAtual.saidaId;
  estadosAtuais = aplicarAbertura(estadosAtuais, rodadaAtual.regras, id);
  renderPortas();
  renderStats();

  if (eraSaida) { finalizarJogo('vitoria'); return; }
  const aindaTemDisponivel = rodadaAtual.cats.some((c) => estadosAtuais[c] === 'disponivel');
  if (!aindaTemDisponivel) finalizarJogo('preso');
}

/* ── RESULTADO ── */
function finalizarJogo(resultado) {
  jogoAtivo = false;
  pararTimer();
  const tempoFinal = tempoDecorrido();

  if (resultado === 'vitoria') {
    tocar('porta');
    $('resultado-eyebrow').textContent = 'Uhul!';
    $('resultado-titulo').textContent = 'Você achou a porta certa!';
    $('resultado-texto').textContent = 'Usou as pistas direitinho e chegou até a saída. Parabéns!';
  } else {
    tocar('tranca');
    $('resultado-eyebrow').textContent = 'Ih...';
    $('resultado-titulo').textContent = 'Ficou preso!';
    $('resultado-texto').textContent = 'Alguma porta trancou o caminho antes de você chegar na saída. Reveja as pistas e tente de novo.';
  }

  $('vit-tempo').textContent = fmtTempo(tempoFinal);

  if (resultado === 'vitoria') {
    const cfg = NIVEIS[nivelAtual];
    const chaveXp = XP_KEY + nivelAtual;
    if (!localStorage.getItem(chaveXp)) {
      localStorage.setItem(chaveXp, '1');
      $('vit-xp').textContent = `+${cfg.xp} XP`;
      $('vit-xp').classList.remove('hidden');
      if (typeof window._concederXpPortas === 'function') window._concederXpPortas(cfg.xp);
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
    $('btn-acao-principal').textContent = '🔁 Jogar de Novo';
    $('btn-acao-principal').onclick = () => { tocar('click'); novoJogo(nivelAtual); };
  } else {
    $('vit-xp').classList.add('hidden');
    $('vit-recorde').textContent = '';
    $('btn-acao-principal').textContent = '🔁 Tentar de Novo';
    $('btn-acao-principal').onclick = () => { tocar('click'); recomecarRodada(); };
  }

  mostrarOverlay('overlay-resultado');
}

/* ── RENDER ── */
function renderPortas() {
  const wrap = $('portas-grade');
  wrap.innerHTML = '';
  rodadaAtual.cats.forEach((id) => {
    const estado = estadosAtuais[id];
    const cfg = GATOS_CFG[id];
    const el = document.createElement('div');
    el.className = 'porta porta-' + estado + (id === rodadaAtual.saidaId ? ' porta-saida' : '');
    el.innerHTML = `
      <div class="porta-selo">${id === rodadaAtual.saidaId ? '🥣' : ''}</div>
      <img src="${cfg.src}" alt="${cfg.nome}">
      <div class="porta-nome">${cfg.nome}</div>
      <div class="porta-estado">${estado === 'trancada' ? '🔒 Trancada' : estado === 'aberta' ? '✅ Aberta' : '🚪 Disponível'}</div>
    `;
    if (estado === 'disponivel') el.addEventListener('click', () => abrirPorta(id));
    wrap.appendChild(el);
  });
}

function renderPistas() {
  const lista = $('pistas-lista');
  lista.innerHTML = '';
  rodadaAtual.regrasExibidas.forEach((r) => {
    const div = document.createElement('div');
    div.className = 'pista-item';
    div.textContent = textoRegra(r);
    lista.appendChild(div);
  });
}

function renderStats() {
  $('stat-tempo').textContent = fmtTempo(tempoDecorrido());
}
function atualizarStats() { renderStats(); }

/* ── OVERLAYS ── */
function esconderOverlays() {
  document.querySelectorAll('.game-overlay').forEach((el) => el.classList.add('hidden'));
}
function mostrarOverlay(id) {
  esconderOverlays();
  $(id).classList.remove('hidden');
}

/* ── INÍCIO ── (disparado pelo tutorial da Rafaela, ver index.html) */
