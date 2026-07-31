/* ── JOGO DA TRAVESSIA — KiFácil ────────────────────────────────────────── */

const BARQUEIRO_SRC = '../personagens/alceu-cumprimentando.png';
const DURACAO_TRAVESSIA = 2200; // ms — precisa bater com a transição CSS de #barco-transito

const ITENS_CFG = {
  gato:  { nome: 'Chico',   tipo: 'img',   src: '../imagens-animais/cat_sprite_06.png' },
  rato:  { nome: 'Ratinho', tipo: 'emoji', valor: '🐭' },
  racao: { nome: 'Ração',   tipo: 'emoji', valor: '🥣' },
};
const REGRAS = [
  { par: ['gato', 'rato'], mensagem: 'O Chico comeu o Ratinho! 🐱🐭' },
  { par: ['rato', 'racao'], mensagem: 'O Ratinho beliscou toda a Ração! 🐭🥣' },
];

const RECORDE_KEY = 'kf_travessia_recorde_travessias';
const XP_KEY = 'kf_travessia_xp';
const XP_VITORIA = 20;

const $ = (id) => document.getElementById(id);

/* ── ESTADO ── */
let itens = {};
let barqueiroBank = 'esq';
let itemNoBarco = null;
let itemEmTransito = null;
let emTransito = false;
let travessias = 0;
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

/* ── INÍCIO / REINÍCIO ── */
$('btn-comecar').addEventListener('click', () => { tocar('click'); novoJogo(); });
$('btn-jogar-de-novo').addEventListener('click', () => { tocar('click'); novoJogo(); });
$('btn-tentar-de-novo').addEventListener('click', () => { tocar('click'); novoJogo(); });

function novoJogo() {
  pararTimer();
  itens = {
    gato:  { bank: 'esq' },
    rato:  { bank: 'esq' },
    racao: { bank: 'esq' },
  };
  barqueiroBank = 'esq';
  itemNoBarco = null;
  itemEmTransito = null;
  emTransito = false;
  travessias = 0;
  tempoInicio = null;
  jogoAtivo = true;

  render();
  atualizarStats();
  esconderOverlays();
}

const rec = localStorage.getItem(RECORDE_KEY);
if (rec) $('recorde-unico').textContent = `Melhor: ${rec} travessias`;

/* ── RENDER ── */
function render() {
  const margemEsq = $('margem-esq');
  const margemDir = $('margem-dir');
  margemEsq.innerHTML = '';
  margemDir.innerHTML = '';

  Object.keys(itens).forEach(id => {
    if (id === itemEmTransito) return;
    const alvo = itens[id].bank === 'esq' ? margemEsq : margemDir;
    alvo.appendChild(criarSlotItem(id));
  });

  if (!emTransito) {
    const margemBarco = barqueiroBank === 'esq' ? margemEsq : margemDir;
    margemBarco.appendChild(criarControleBarco());
  }
}

function criarSlotItem(id) {
  const cfg = ITENS_CFG[id];
  const el = document.createElement('div');
  el.className = 'item-slot';
  if (itemNoBarco === id) el.classList.add('selecionado');
  if (itens[id].bank !== barqueiroBank) el.classList.add('desabilitado');

  const conteudo = cfg.tipo === 'img'
    ? `<img src="${cfg.src}" alt="${cfg.nome}">`
    : `<div class="item-emoji">${cfg.valor}</div>`;
  el.innerHTML = `${conteudo}<div class="item-nome">${cfg.nome}</div>`;

  el.addEventListener('click', () => selecionarItem(id));
  return el;
}

function criarControleBarco() {
  const wrap = document.createElement('div');
  wrap.className = 'barco-controle';
  const destino = barqueiroBank === 'esq' ? 'direita →' : '← esquerda';
  wrap.innerHTML = `
    <div class="barco-tripulacao">
      <div class="barco-icone">🛶</div>
      <img class="barqueiro-img" src="${BARQUEIRO_SRC}" alt="Alceu">
    </div>
    <button class="btn-atravessar">Atravessar ${destino}</button>
  `;
  wrap.querySelector('.btn-atravessar').addEventListener('click', atravessar);
  return wrap;
}

/* ── SELEÇÃO ── */
function selecionarItem(id) {
  if (!jogoAtivo) return;
  if (itens[id].bank !== barqueiroBank) return;
  tocar('click');
  itemNoBarco = (itemNoBarco === id) ? null : id;
  render();
}

/* ── ANIMAÇÃO DO BARCO ── */
function animarBarco(bankPartida, itemId, callback) {
  const transito = $('barco-transito');
  const partida = bankPartida === 'esq' ? '15%' : '85%';
  const chegada = bankPartida === 'esq' ? '85%' : '15%';

  const passageiro = itemId
    ? (ITENS_CFG[itemId].tipo === 'img'
        ? `<div class="transito-passageiro"><img src="${ITENS_CFG[itemId].src}" alt=""></div>`
        : `<div class="transito-passageiro"><div class="item-emoji">${ITENS_CFG[itemId].valor}</div></div>`)
    : '';
  transito.innerHTML = `
    <div class="barco-tripulacao">
      <div class="barco-icone">🛶</div>
      <img class="barqueiro-img" src="${BARQUEIRO_SRC}" alt="Alceu">
    </div>
    ${passageiro}`;

  transito.classList.remove('hidden');
  transito.style.transition = 'none';
  transito.style.left = partida;
  transito.offsetHeight; // força reflow
  transito.style.transition = '';
  transito.style.left = chegada;

  setTimeout(() => {
    transito.classList.add('hidden');
    callback();
  }, DURACAO_TRAVESSIA);
}

/* ── TRAVESSIA ── */
function atravessar() {
  if (!jogoAtivo) return;
  if (!tempoInicio) iniciarTimer();
  tocar('click');

  jogoAtivo = false;
  const bankAntigo = barqueiroBank;
  const novoBank = barqueiroBank === 'esq' ? 'dir' : 'esq';
  const itemLevado = itemNoBarco;

  itemEmTransito = itemLevado;
  itemNoBarco = null;
  emTransito = true;
  render();

  animarBarco(bankAntigo, itemLevado, () => {
    finalizarTravessia(bankAntigo, novoBank, itemLevado);
  });
}

function finalizarTravessia(bankAntigo, novoBank, itemLevado) {
  if (itemLevado) itens[itemLevado].bank = novoBank;
  itemEmTransito = null;
  emTransito = false;
  barqueiroBank = novoBank;
  travessias++;
  jogoAtivo = true;

  atualizarStats();

  const idsQueFicaram = Object.keys(itens).filter(id => itens[id].bank === bankAntigo);
  const regraViolada = REGRAS.find(r => idsQueFicaram.includes(r.par[0]) && idsQueFicaram.includes(r.par[1]));

  if (regraViolada) {
    render();
    derrotaJogo(regraViolada.mensagem);
    return;
  }

  render();

  const todosNoDestino = Object.values(itens).every(it => it.bank === 'dir');
  if (todosNoDestino) venceuJogo();
  else tocar('ding');
}

/* ── STATS ── */
function atualizarStats() {
  $('stat-travessias').textContent = travessias;
  $('stat-tempo').textContent = fmtTempo(tempoDecorrido());
}

/* ── FIM DE JOGO ── */
function venceuJogo() {
  jogoAtivo = false;
  pararTimer();
  tocar('porta');

  const tempoFinal = tempoDecorrido();
  $('vit-travessias').textContent = travessias;
  $('vit-tempo').textContent = fmtTempo(tempoFinal);

  const jaGanhouXp = localStorage.getItem(XP_KEY);
  if (!jaGanhouXp) {
    localStorage.setItem(XP_KEY, '1');
    $('vit-xp').textContent = `+${XP_VITORIA} XP`;
    $('vit-xp').style.display = '';
    if (typeof window._concederXpTravessia === 'function') window._concederXpTravessia(XP_VITORIA);
  } else {
    $('vit-xp').style.display = 'none';
  }

  const recordeAnterior = parseInt(localStorage.getItem(RECORDE_KEY), 10);
  const $recorde = $('vit-recorde');
  if (!recordeAnterior || travessias < recordeAnterior) {
    localStorage.setItem(RECORDE_KEY, String(travessias));
    $recorde.textContent = '🏆 Novo recorde de menos travessias!';
  } else {
    $recorde.textContent = `Seu melhor resultado continua: ${recordeAnterior} travessias`;
  }

  mostrarOverlay('overlay-vitoria');
}

function derrotaJogo(mensagem) {
  jogoAtivo = false;
  pararTimer();
  tocar('tranca');
  $('derrota-titulo').textContent = mensagem;
  mostrarOverlay('overlay-derrota');
}

/* ── OVERLAYS ── */
function esconderOverlays() {
  document.querySelectorAll('.game-overlay').forEach(el => el.classList.add('hidden'));
}
function mostrarOverlay(id) {
  esconderOverlays();
  $(id).classList.remove('hidden');
}
