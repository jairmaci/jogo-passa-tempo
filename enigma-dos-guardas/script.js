/* ── ENIGMA DOS GUARDAS — KiFácil (clássico dos 2 guardas: um mente, um fala a verdade) ── */

const RECORDE_KEY = 'kf_guardas_melhor_sequencia';
const XP_KEY = 'kf_guardas_xp';
const XP_PRIMEIRA_VITORIA = 15;

const $ = (id) => document.getElementById(id);

/* ── ESTADO ── */
let portaSegura = null;
let guardaMentiroso = null;
let guardaSelecionadoTemp = null;
let guardaEscolhido = null;
let perguntaFeita = false;
let portaEscolhida = null;
let sequencia = 0;
let melhorSequencia = parseInt(localStorage.getItem(RECORDE_KEY), 10) || 0;

/* ── UTIL ── */
function tocar(nome) {
  const m = {
    click: '../../app-academia/sons/click.mp3',
    ding:  '../../app-academia/sons/ding.mp3',
    porta: '../../app-academia/sons/porta-abrindo.mp3',
  };
  try { new Audio(m[nome]).play().catch(() => {}); } catch (e) {}
}
function oposta(porta) { return porta === 'esquerda' ? 'direita' : 'esquerda'; }
function outroGuarda(guarda) { return guarda === 'lolo' ? 'lanlan' : 'lolo'; }
function ehSincero(guarda) { return guarda !== guardaMentiroso; }
function nomeGuarda(g) { return g === 'lolo' ? 'Lolo' : 'Lanlan'; }
function nomePorta(p) { return p === 'esquerda' ? 'esquerda' : 'direita'; }

/* ── LÓGICA DAS RESPOSTAS ── */
function respostaDireta(guarda) {
  return ehSincero(guarda) ? portaSegura : oposta(portaSegura);
}
function respostaCruzada(guarda) {
  const respostaDoOutro = respostaDireta(outroGuarda(guarda));
  return ehSincero(guarda) ? respostaDoOutro : oposta(respostaDoOutro);
}
function respostaSincero(guarda) {
  const verdade = ehSincero(guarda);
  const final = ehSincero(guarda) ? verdade : !verdade;
  return final; // sempre true, mas calculado de verdade
}

/* ── NOVO ROUND ── */
$('btn-comecar').addEventListener('click', () => { tocar('click'); novoRound(); });
$('btn-jogar-de-novo').addEventListener('click', () => { tocar('click'); novoRound(); });

function novoRound() {
  portaSegura = Math.random() < 0.5 ? 'esquerda' : 'direita';
  guardaMentiroso = Math.random() < 0.5 ? 'lolo' : 'lanlan';
  guardaSelecionadoTemp = null;
  guardaEscolhido = null;
  perguntaFeita = false;
  portaEscolhida = null;

  ['esquerda', 'direita'].forEach(lado => {
    $('lado-' + lado).querySelector('.guarda-slot').classList.remove('desabilitado');
    $('balao-' + lado).classList.add('hidden');
    const porta = $('porta-' + lado);
    porta.classList.remove('aberta', 'travada');
  });

  $('texto-etapa').textContent = 'Clique num gato pra perguntar.';
  esconderOverlays();
  $('cena').classList.remove('hidden');
}

/* ── CLIQUE NOS GUARDAS ── */
$('guarda-lolo').addEventListener('click', () => abrirPainelPergunta('lolo'));
$('guarda-lanlan').addEventListener('click', () => abrirPainelPergunta('lanlan'));

function abrirPainelPergunta(guarda) {
  if (perguntaFeita) return;
  tocar('click');
  guardaSelecionadoTemp = guarda;
  $('pergunta-guarda-nome').textContent = `Perguntar pro ${nomeGuarda(guarda)}`;
  $('painel-perguntas').classList.remove('hidden');
}
$('btn-cancelar-pergunta').addEventListener('click', () => {
  tocar('click');
  $('painel-perguntas').classList.add('hidden');
});

/* ── ESCOLHA DA PERGUNTA ── */
document.querySelectorAll('.pergunta-btn').forEach(btn => {
  btn.addEventListener('click', () => fazerPergunta(btn.dataset.pergunta));
});

function fazerPergunta(tipo) {
  tocar('click');
  const guarda = guardaSelecionadoTemp;
  let textoResposta;

  if (tipo === 'direta') {
    const p = respostaDireta(guarda);
    textoResposta = `A porta da ${nomePorta(p)}!`;
  } else if (tipo === 'cruzada') {
    const p = respostaCruzada(guarda);
    textoResposta = `Ele diria: porta da ${nomePorta(p)}!`;
  } else {
    textoResposta = respostaSincero(guarda) ? 'Sim!' : 'Não!';
  }

  guardaEscolhido = guarda;
  perguntaFeita = true;

  $('painel-perguntas').classList.add('hidden');
  const lado = guarda === 'lolo' ? 'esquerda' : 'direita';
  $('balao-texto-' + lado).textContent = textoResposta;
  $('balao-' + lado).classList.remove('hidden');

  const outroLado = oposta(lado);
  $('lado-' + outroLado).querySelector('.guarda-slot').classList.add('desabilitado');

  $('texto-etapa').textContent = 'Agora escolha uma porta!';
}

/* ── CLIQUE NAS PORTAS ── */
$('porta-esquerda').addEventListener('click', () => escolherPorta('esquerda'));
$('porta-direita').addEventListener('click', () => escolherPorta('direita'));

function escolherPorta(lado) {
  if (!perguntaFeita) {
    $('texto-etapa').textContent = 'Pergunte pra um gato primeiro! 🐱';
    return;
  }
  if (portaEscolhida) return;
  portaEscolhida = lado;
  tocar('click');

  ['esquerda', 'direita'].forEach(l => $('porta-' + l).classList.add('travada'));

  const acertou = lado === portaSegura;
  $('resultado-' + lado).innerHTML = acertou
    ? '🎉<br>Prêmio!'
    : '🧶<br>Só novelos!';

  setTimeout(() => {
    tocar('porta');
    $('porta-' + lado).classList.add('aberta');
  }, 150);

  setTimeout(() => mostrarResultado(acertou), 950);
}

function mostrarResultado(acertou) {
  if (acertou) {
    sequencia++;
    if (sequencia > melhorSequencia) {
      melhorSequencia = sequencia;
      localStorage.setItem(RECORDE_KEY, String(melhorSequencia));
    }
  } else {
    sequencia = 0;
  }
  atualizarStats();

  $('resultado-eyebrow').textContent = acertou ? 'Parabéns!' : 'Ih...';
  $('resultado-titulo').textContent = acertou ? 'Você achou o prêmio!' : 'Não foi dessa vez!';
  $('resultado-texto').textContent =
    `O ${nomeGuarda(guardaMentiroso)} era o mentiroso dessa rodada, e a porta certa era a da ${nomePorta(portaSegura)}.`;

  const jaGanhouXp = localStorage.getItem(XP_KEY);
  if (acertou && !jaGanhouXp) {
    localStorage.setItem(XP_KEY, '1');
    $('vit-xp').textContent = `+${XP_PRIMEIRA_VITORIA} XP`;
    $('vit-xp').classList.remove('hidden');
    if (typeof window._concederXpGuardas === 'function') window._concederXpGuardas(XP_PRIMEIRA_VITORIA);
  } else {
    $('vit-xp').classList.add('hidden');
  }
  $('vit-recorde').textContent = `Melhor sequência: ${melhorSequencia} acerto(s) seguido(s)`;

  mostrarOverlay('overlay-resultado');
}

/* ── STATS ── */
function atualizarStats() {
  $('stat-sequencia').textContent = sequencia;
  $('stat-melhor').textContent = melhorSequencia;
}

/* ── DICA ── */
$('btn-dica').addEventListener('click', () => { tocar('click'); mostrarOverlay('overlay-dica'); });
$('btn-fechar-dica').addEventListener('click', () => {
  tocar('click');
  esconderOverlays();
  $('cena').classList.remove('hidden');
});

/* ── OVERLAYS ── */
function esconderOverlays() {
  document.querySelectorAll('.game-overlay').forEach(el => el.classList.add('hidden'));
}
function mostrarOverlay(id) {
  $('painel-perguntas').classList.add('hidden');
  esconderOverlays();
  $(id).classList.remove('hidden');
}

/* ── INÍCIO ── */
atualizarStats();
