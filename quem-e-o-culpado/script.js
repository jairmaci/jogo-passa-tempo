/* ── QUEM É O CULPADO? — KiFácil (dedução ao estilo Detetive/Cluedo) ────── */

const CATEGORIAS = {
  suspeito: { nome: 'Suspeito', icone: '🐱', opcoes: ['Chico', 'Pitu', 'Teti', 'Bentinho', 'Lolo'] },
  local: { nome: 'Local', icone: '🏠', opcoes: ['Cozinha', 'Sala', 'Quarto', 'Banheiro', 'Varanda'] },
  traquinagem: { nome: 'O que aconteceu', icone: '❗', opcoes: ['Fez xixi fora da caixinha', 'Derrubou o vaso de plantas', 'Roubou comida da mesa', 'Arranhou o sofá', 'Desfiou o papel higiênico'] },
  horario: { nome: 'Horário', icone: '🕒', opcoes: ['Manhã', 'Tarde', 'Entardecer', 'Noite', 'Madrugada'] },
};
const ORDEM_CATEGORIAS = ['suspeito', 'local', 'traquinagem', 'horario'];

const LOCAL_FRASE = { Cozinha: 'na Cozinha', Sala: 'na Sala', Quarto: 'no Quarto', Banheiro: 'no Banheiro', Varanda: 'na Varanda' };
const HORARIO_FRASE = { 'Manhã': 'de manhã', 'Tarde': 'à tarde', 'Entardecer': 'no entardecer', 'Noite': 'à noite', 'Madrugada': 'de madrugada' };

const NIVEIS = { facil: { qtd: 3, xp: 15 }, medio: { qtd: 4, xp: 25 }, dificil: { qtd: 5, xp: 40 } };
const RECORDE_KEY = 'kf_culpado_recorde_';
const XP_KEY = 'kf_culpado_xp_';

const $ = (id) => document.getElementById(id);

/* ── ESTADO ── */
let nivelAtual = null;
let categoriasAtivas = {};
let solucao = {};
let clues = [];
let eliminados = {};
let selecionados = {};
let modoEliminar = true;
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
function tempoDecorrido() { return tempoInicio ? (Date.now() - tempoInicio) / 1000 : 0; }
function iniciarTimer() { if (tempoInicio) return; tempoInicio = Date.now(); timerInterval = setInterval(atualizarStats, 250); }
function pararTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = null; }

/* ── SELEÇÃO DE NÍVEL ── */
document.querySelectorAll('.dificuldade-card').forEach((btn) => {
  btn.addEventListener('click', () => { tocar('click'); novoJogo(btn.dataset.nivel); });
});
$('btn-trocar-nivel').addEventListener('click', () => { tocar('click'); abrirSelecaoNivel(); });
$('btn-jogar-de-novo').addEventListener('click', () => { tocar('click'); novoJogo(nivelAtual); });
$('btn-tentar-de-novo').addEventListener('click', () => { tocar('click'); esconderOverlays(); $('caso-wrap').classList.remove('hidden'); });

function abrirSelecaoNivel() {
  Object.keys(NIVEIS).forEach((nivel) => {
    const rec = localStorage.getItem(RECORDE_KEY + nivel);
    const el = $('recorde-' + nivel);
    if (el) el.textContent = rec ? `Melhor tempo: ${fmtTempo(parseFloat(rec))}` : '';
  });
  $('caso-wrap').classList.add('hidden');
  mostrarOverlay('overlay-inicio');
}

/* ── NOVO CASO ── */
function novoJogo(nivel) {
  nivelAtual = nivel;
  const qtd = NIVEIS[nivel].qtd;

  categoriasAtivas = {};
  solucao = {};
  eliminados = {};
  selecionados = {};

  ORDEM_CATEGORIAS.forEach((chave) => {
    const opcoes = embaralhar(CATEGORIAS[chave].opcoes).slice(0, qtd);
    categoriasAtivas[chave] = opcoes;
    solucao[chave] = opcoes[Math.floor(Math.random() * opcoes.length)];
    eliminados[chave] = new Set();
    selecionados[chave] = null;
  });

  clues = embaralhar(gerarClues());
  modoEliminar = true;
  tempoInicio = null;
  pararTimer();
  jogoAtivo = true;

  $('btn-modo-eliminar').classList.add('ativo');
  $('btn-modo-escolher').classList.remove('ativo');
  $('modo-atual').textContent = 'Modo: Eliminar (risque quem não foi)';

  renderCategorias();
  renderPistas();
  atualizarStats();
  atualizarBotaoAcusar();
  esconderOverlays();
  $('caso-wrap').classList.remove('hidden');
}

function gerarClues() {
  const lista = [];
  ORDEM_CATEGORIAS.forEach((chave) => {
    categoriasAtivas[chave].forEach((opcao) => {
      if (opcao !== solucao[chave]) lista.push(textoClue(chave, opcao));
    });
  });
  return lista;
}

function textoClue(chave, opcao) {
  if (chave === 'suspeito') return `Não foi o(a) ${opcao}.`;
  if (chave === 'local') return `Não aconteceu ${LOCAL_FRASE[opcao]}.`;
  if (chave === 'traquinagem') return `A traquinagem não foi essa: "${opcao}".`;
  if (chave === 'horario') return `Não foi ${HORARIO_FRASE[opcao]}.`;
  return '';
}

/* ── RENDER ── */
function renderCategorias() {
  const wrap = $('categorias-wrap');
  wrap.innerHTML = '';
  ORDEM_CATEGORIAS.forEach((chave) => {
    const cfg = CATEGORIAS[chave];
    const bloco = document.createElement('div');
    bloco.className = 'categoria-bloco';
    bloco.innerHTML = `<div class="categoria-titulo">${cfg.icone} ${cfg.nome}</div>`;
    const opcoesEl = document.createElement('div');
    opcoesEl.className = 'categoria-opcoes';
    categoriasAtivas[chave].forEach((opcao) => {
      const card = document.createElement('div');
      card.className = 'opcao-card';
      if (eliminados[chave].has(opcao)) card.classList.add('eliminado');
      if (selecionados[chave] === opcao) card.classList.add('selecionado');
      card.textContent = opcao;
      card.addEventListener('click', () => clicarOpcao(chave, opcao));
      opcoesEl.appendChild(card);
    });
    bloco.appendChild(opcoesEl);
    wrap.appendChild(bloco);
  });
}

function renderPistas() {
  const lista = $('pistas-lista');
  lista.innerHTML = '';
  clues.forEach((texto) => {
    const div = document.createElement('div');
    div.className = 'pista-item';
    div.textContent = texto;
    lista.appendChild(div);
  });
}

/* ── MODO ── */
$('btn-modo-eliminar').addEventListener('click', () => {
  tocar('click');
  modoEliminar = true;
  $('btn-modo-eliminar').classList.add('ativo');
  $('btn-modo-escolher').classList.remove('ativo');
  $('modo-atual').textContent = 'Modo: Eliminar (risque quem não foi)';
});
$('btn-modo-escolher').addEventListener('click', () => {
  tocar('click');
  modoEliminar = false;
  $('btn-modo-escolher').classList.add('ativo');
  $('btn-modo-eliminar').classList.remove('ativo');
  $('modo-atual').textContent = 'Modo: Escolher resposta (marque sua acusação)';
});

/* ── CLIQUE NAS OPÇÕES ── */
function clicarOpcao(chave, opcao) {
  if (!jogoAtivo) return;
  if (!tempoInicio) iniciarTimer();
  tocar('click');

  if (modoEliminar) {
    if (eliminados[chave].has(opcao)) eliminados[chave].delete(opcao);
    else eliminados[chave].add(opcao);
  } else {
    selecionados[chave] = selecionados[chave] === opcao ? null : opcao;
  }
  renderCategorias();
  atualizarBotaoAcusar();
}

function atualizarBotaoAcusar() {
  const todasEscolhidas = ORDEM_CATEGORIAS.every((chave) => selecionados[chave] !== null);
  $('btn-acusar').disabled = !todasEscolhidas;
}

/* ── ACUSAR ── */
$('btn-acusar').addEventListener('click', () => {
  if (!jogoAtivo) return;
  tocar('click');
  const acertou = ORDEM_CATEGORIAS.every((chave) => selecionados[chave] === solucao[chave]);
  if (acertou) venceuJogo();
  else errouAcusacao();
});

function errouAcusacao() {
  tocar('tranca');
  $('resultado-eyebrow').textContent = 'Ih...';
  $('resultado-titulo').textContent = 'Não foi dessa vez!';
  $('resultado-texto').textContent = 'Essa combinação não bate com as pistas. Reveja o caso com calma — releia as pistas e tente de novo.';
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
  $('resultado-eyebrow').textContent = 'Caso resolvido!';
  $('resultado-titulo').textContent = 'Você descobriu tudo!';
  $('resultado-texto').textContent = `Foi o(a) ${solucao.suspeito}, ${LOCAL_FRASE[solucao.local]}: "${solucao.traquinagem}", ${HORARIO_FRASE[solucao.horario]}.`;
  $('resultado-stats').style.display = '';
  $('vit-tempo').textContent = fmtTempo(tempoFinal);

  const cfg = NIVEIS[nivelAtual];
  const chaveXp = XP_KEY + nivelAtual;
  const jaGanhouXp = localStorage.getItem(chaveXp);
  if (!jaGanhouXp) {
    localStorage.setItem(chaveXp, '1');
    $('vit-xp').textContent = `+${cfg.xp} XP`;
    $('vit-xp').classList.remove('hidden');
    if (typeof window._concederXpCulpado === 'function') window._concederXpCulpado(cfg.xp);
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
