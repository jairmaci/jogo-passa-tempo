/* Codigo do Cofre — KiFacil */

const NIVEIS = {
  facil: { totalSelos: 6, tentativas: 10, xp: 15 },
  medio: { totalSelos: 7, tentativas: 8, xp: 20 },
  dificil: { totalSelos: 8, tentativas: 7, xp: 25 },
};

const SELOS = [
  { id: 'A', classe: 'selo-a' },
  { id: 'B', classe: 'selo-b' },
  { id: 'C', classe: 'selo-c' },
  { id: 'D', classe: 'selo-d' },
  { id: 'E', classe: 'selo-e' },
  { id: 'F', classe: 'selo-f' },
  { id: 'G', classe: 'selo-g' },
  { id: 'H', classe: 'selo-h' },
];

const RECORDE_KEY = 'kf_codigo_cofre_recorde';
const XP_KEY = 'kf_codigo_cofre_xp';
const TAMANHO_CODIGO = 4;
const $ = (id) => document.getElementById(id);

let nivelAtual = null;
let cfgAtual = null;
let selosAtivos = [];
let segredo = [];
let tentativaAtual = [];
let historico = [];
let inicioTempo = null;
let timerInterval = null;
let jogoAtivo = false;

function tocar(nome) {
  const sons = {
    click: '../../app-academia/sons/click.mp3',
    ding: '../../app-academia/sons/ding.mp3',
    porta: '../../app-academia/sons/porta-abrindo.mp3',
    tranca: '../../app-academia/sons/trancando.MP3',
  };
  try { new Audio(sons[nome]).play().catch(() => {}); } catch (e) {}
}

function fmtTempo(segundos) {
  const m = Math.floor(segundos / 60).toString().padStart(2, '0');
  const s = Math.floor(segundos % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function tempoDecorrido() {
  return inicioTempo ? Math.floor((Date.now() - inicioTempo) / 1000) : 0;
}

function iniciarTimer() {
  inicioTempo = Date.now();
  timerInterval = setInterval(atualizarStats, 250);
}

function pararTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function embaralhar(lista) {
  return [...lista].sort(() => Math.random() - 0.5);
}

function gerarSegredo() {
  segredo = embaralhar(selosAtivos).slice(0, TAMANHO_CODIGO).map((selo) => selo.id);
}

function iniciarJogo(nivel) {
  nivelAtual = nivel;
  cfgAtual = NIVEIS[nivel];
  selosAtivos = SELOS.slice(0, cfgAtual.totalSelos);
  tentativaAtual = [];
  historico = [];
  jogoAtivo = true;
  pararTimer();
  iniciarTimer();
  gerarSegredo();

  $('cofre-layout').classList.remove('hidden');
  $('cofre-miolo').textContent = nivelAtual.slice(0, 3).toUpperCase();
  $('cofre-miolo').closest('.cofre-porta').classList.remove('aberto');
  $('mensagem-jogo').textContent = 'Escolha 4 selos diferentes e teste sua deducao.';
  esconderOverlays();
  renderTudo();
  atualizarStats();
}

function renderTudo() {
  renderCodigoAtual();
  renderSelos();
  renderHistorico();
}

function renderCodigoAtual() {
  $('codigo-atual').innerHTML = '';
  for (let i = 0; i < TAMANHO_CODIGO; i++) {
    const valor = tentativaAtual[i];
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot-codigo';
    slot.textContent = valor || String(i + 1);
    if (valor) {
      slot.classList.add('preenchido', classeDoSelo(valor));
      slot.addEventListener('click', () => removerSelo(valor));
    }
    $('codigo-atual').appendChild(slot);
  }
  $('btn-testar').disabled = tentativaAtual.length !== TAMANHO_CODIGO || !jogoAtivo;
}

function renderSelos() {
  $('selos').innerHTML = '';
  selosAtivos.forEach((selo) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `selo-btn ${selo.classe}`;
    btn.textContent = selo.id;
    if (tentativaAtual.includes(selo.id)) btn.classList.add('usado');
    btn.addEventListener('click', () => escolherSelo(selo.id));
    $('selos').appendChild(btn);
  });
}

function renderHistorico() {
  $('historico').innerHTML = '';
  historico.forEach((linha, idx) => {
    const el = document.createElement('div');
    el.className = 'linha-historico';
    el.innerHTML = `
      <div class="linha-codigo" aria-label="Tentativa ${idx + 1}">
        ${linha.tentativa.map((valor) => `<span class="selo-mini ${classeDoSelo(valor)}">${valor}</span>`).join('')}
      </div>
      <div class="pistas">
        <span class="pista ok">${linha.certos} certo</span>
        <span class="pista warn">${linha.deslocados} desloc.</span>
      </div>
    `;
    $('historico').prepend(el);
  });
}

function classeDoSelo(id) {
  const selo = SELOS.find((item) => item.id === id);
  return selo ? selo.classe : '';
}

function escolherSelo(id) {
  if (!jogoAtivo || tentativaAtual.length >= TAMANHO_CODIGO || tentativaAtual.includes(id)) return;
  tocar('click');
  tentativaAtual.push(id);
  renderCodigoAtual();
  renderSelos();
}

function removerSelo(id) {
  if (!jogoAtivo) return;
  tocar('click');
  tentativaAtual = tentativaAtual.filter((valor) => valor !== id);
  renderCodigoAtual();
  renderSelos();
}

function apagarTentativa() {
  if (!jogoAtivo) return;
  tocar('click');
  tentativaAtual = [];
  renderCodigoAtual();
  renderSelos();
}

function avaliarTentativa(tentativa) {
  let certos = 0;
  let deslocados = 0;
  tentativa.forEach((valor, idx) => {
    if (segredo[idx] === valor) certos++;
    else if (segredo.includes(valor)) deslocados++;
  });
  return { certos, deslocados };
}

function testarCodigo() {
  if (!jogoAtivo || tentativaAtual.length !== TAMANHO_CODIGO) return;
  const avaliacao = avaliarTentativa(tentativaAtual);
  historico.push({ tentativa: [...tentativaAtual], ...avaliacao });
  tentativaAtual = [];
  tocar(avaliacao.certos === TAMANHO_CODIGO ? 'porta' : 'ding');
  renderTudo();
  atualizarStats();

  if (avaliacao.certos === TAMANHO_CODIGO) {
    vencerJogo();
    return;
  }

  if (historico.length >= cfgAtual.tentativas) {
    perderJogo();
    return;
  }

  $('mensagem-jogo').textContent = `${avaliacao.certos} no lugar certo, ${avaliacao.deslocados} no codigo mas em outra posicao.`;
}

function vencerJogo() {
  jogoAtivo = false;
  pararTimer();
  $('cofre-miolo').closest('.cofre-porta').classList.add('aberto');

  const tempo = tempoDecorrido();
  const pontos = historico.length * 1000 + tempo;
  const recordeKey = `${RECORDE_KEY}_${nivelAtual}`;
  const recordeAnterior = parseInt(localStorage.getItem(recordeKey), 10);
  const novoRecorde = !recordeAnterior || pontos < recordeAnterior;
  if (novoRecorde) localStorage.setItem(recordeKey, String(pontos));

  $('resultado-eyebrow').textContent = 'Parabens!';
  $('resultado-titulo').textContent = 'Cofre aberto!';
  $('resultado-texto').textContent = `Voce descobriu o codigo em ${historico.length} tentativa(s), no tempo de ${fmtTempo(tempo)}.`;
  $('vit-recorde').textContent = novoRecorde ? 'Novo recorde nessa dificuldade!' : 'Recorde mantido nessa dificuldade.';
  mostrarCodigoRevelado();
  concederXpSePreciso();
  mostrarOverlay('overlay-resultado');
}

function perderJogo() {
  jogoAtivo = false;
  pararTimer();
  tocar('tranca');
  $('resultado-eyebrow').textContent = 'Fim das tentativas';
  $('resultado-titulo').textContent = 'O cofre continuou fechado';
  $('resultado-texto').textContent = 'Use as pistas das tentativas para eliminar possibilidades e tente outra vez.';
  $('vit-recorde').textContent = '';
  $('vit-xp').classList.add('hidden');
  mostrarCodigoRevelado();
  mostrarOverlay('overlay-resultado');
}

function mostrarCodigoRevelado() {
  $('codigo-revelado').innerHTML = segredo
    .map((valor) => `<span class="selo-mini ${classeDoSelo(valor)}">${valor}</span>`)
    .join('');
}

function concederXpSePreciso() {
  const key = `${XP_KEY}_${nivelAtual}`;
  if (localStorage.getItem(key)) {
    $('vit-xp').classList.add('hidden');
    return;
  }
  localStorage.setItem(key, '1');
  $('vit-xp').textContent = `+${cfgAtual.xp} XP`;
  $('vit-xp').classList.remove('hidden');
  if (typeof window._concederXpCofre === 'function') window._concederXpCofre(cfgAtual.xp);
}

function melhorRecordeTexto() {
  if (!nivelAtual) return '--';
  const valor = parseInt(localStorage.getItem(`${RECORDE_KEY}_${nivelAtual}`), 10);
  if (!valor) return '--';
  const tentativas = Math.floor(valor / 1000);
  return `${tentativas}t`;
}

function atualizarStats() {
  const limite = cfgAtual ? cfgAtual.tentativas : 8;
  $('stat-tentativas').textContent = `${historico.length}/${limite}`;
  $('stat-tempo').textContent = fmtTempo(tempoDecorrido());
  $('stat-melhor').textContent = melhorRecordeTexto();
}

function esconderOverlays() {
  document.querySelectorAll('.game-overlay').forEach((el) => el.classList.add('hidden'));
}

function mostrarOverlay(id) {
  esconderOverlays();
  $(id).classList.remove('hidden');
}

document.querySelectorAll('.dificuldade-card').forEach((btn) => {
  btn.addEventListener('click', () => {
    tocar('click');
    iniciarJogo(btn.dataset.nivel);
  });
});

$('btn-apagar').addEventListener('click', apagarTentativa);
$('btn-testar').addEventListener('click', testarCodigo);
$('btn-jogar-de-novo').addEventListener('click', () => iniciarJogo(nivelAtual || 'medio'));
$('btn-trocar-nivel').addEventListener('click', () => {
  tocar('click');
  pararTimer();
  $('cofre-layout').classList.add('hidden');
  mostrarOverlay('overlay-inicio');
});
$('btn-ajuda').addEventListener('click', () => {
  tocar('click');
  mostrarOverlay('overlay-ajuda');
});
$('btn-fechar-ajuda').addEventListener('click', () => {
  tocar('click');
  esconderOverlays();
});

atualizarStats();
