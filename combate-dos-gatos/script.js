/* ── COMBATE DOS GATOS — KiFácil (patentes ocultas, humano vs computador) ── */

const GATOS_CFG = {
  chico:    { nome: 'Chico',    src: '../imagens-animais/chico-em-pe.png' },
  pitu:     { nome: 'Pitu',     src: '../imagens-animais/pitu-em-pe.png' },
  teti:     { nome: 'Teti',     src: '../imagens-animais/teti.png' },
  bentinho: { nome: 'Bentinho', src: '../imagens-animais/bentinho-em-pe.png' },
  lolo:     { nome: 'Lolo',     src: '../imagens-animais/lolo.png' },
  lanlan:   { nome: 'Lanlan',   src: '../imagens-animais/lanlan.png' },
};

const PATENTES_CFG = {
  1: { gato: 'lolo',     nome: 'Espiã',     desc: 'Vence o Marechal (6) só se atacar primeiro' },
  2: { gato: 'lanlan',   nome: 'Sapadora',  desc: 'A única que desarma Bombas' },
  3: { gato: 'pitu',     nome: 'Exploradora', desc: 'Anda várias casas em linha reta' },
  4: { gato: 'teti',     nome: 'Sargenta',  desc: 'Patente comum — vence quem for mais fraco' },
  5: { gato: 'bentinho', nome: 'Capitã',    desc: 'Patente comum — vence quem for mais fraco' },
  6: { gato: 'chico',    nome: 'Marechal',  desc: 'A patente mais forte — cuidado com a Espiã!' },
};
const OUTROS_CFG = {
  bomba:    { emoji: '💣', nome: 'Bomba',   desc: 'Destrói quem atacar, exceto a Sapadora' },
  bandeira: { emoji: '🥣', nome: 'Potinho', desc: 'Proteja o seu — capture o do inimigo pra vencer' },
};
const VALOR_PATENTE = { 1: 110, 2: 150, 3: 170, 4: 200, 5: 230, 6: 280 };

const NIVEIS = {
  facil:   { erro: 0.45, margem: 0,  protegerBase: false, bonusAtacarFracaRevelada: 0,  pesoAmeaca: 0,   xp: 30 },
  medio:   { erro: 0.10, margem: 10, protegerBase: false, bonusAtacarFracaRevelada: 10, pesoAmeaca: 0.5, xp: 50 },
  dificil: { erro: 0.03, margem: 0,  protegerBase: true,  bonusAtacarFracaRevelada: 20, pesoAmeaca: 1,   xp: 75 },
};
const RECORDE_KEY = 'kf_combate_recorde_';
const XP_KEY = 'kf_combate_xp_';
const TABULEIRO_N = 10;
const DIRECOES_ORTOGONAIS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const LIMITE_PLIES_SEGURANCA = 500;

const $ = (id) => document.getElementById(id);

/* ── ESTADO ── */
let nivelAtual = null;
let board = null;
let faseAtual = 'posicionamento'; // 'posicionamento' | 'batalha'
let turno = 'humano';
let poolHumano = null;
let selecionadoPosicionamento = null;
let selecionado = null;
let destinosLegais = [];
let capturasHumano = 0;
let capturasComputador = 0;
let historicoPosicoes = {};
let jogadasTotais = 0;
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
function tocar() {} // efeitos sonoros desativados (áudios não fazem parte deste repositório)
function fmtTempo(seg) {
  const m = Math.floor(seg / 60).toString().padStart(2, '0');
  const s = Math.floor(seg % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function tempoDecorrido() { return tempoInicio ? (Date.now() - tempoInicio) / 1000 : 0; }
function iniciarTimer() { if (tempoInicio) return; tempoInicio = Date.now(); timerInterval = setInterval(atualizarStats, 250); }
function pararTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = null; }

function dentroTabuleiro(r, c) { return r >= 0 && r < TABULEIRO_N && c >= 0 && c < TABULEIRO_N; }
function squareEscura(r, c) { return (r + c) % 2 === 1; }
function oponente(dono) { return dono === 'humano' ? 'computador' : 'humano'; }
function clonarBoard(b) { return b.map((linha) => linha.map((p) => (p ? { ...p } : null))); }
function casaEhLago(r, c) { return (r === 4 || r === 5) && ((c === 2 || c === 3) || (c === 6 || c === 7)); }
function casaNaZonaHumano(r, c) { return r >= 6 && r <= 9; }
function casaNaZonaComputador(r, c) { return r >= 0 && r <= 3; }
function adjacente(r1, c1, r2, c2) { return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1; }

/* ── TABULEIRO / PEÇAS ── */
function criarTabuleiroVazio() {
  const b = [];
  for (let r = 0; r < TABULEIRO_N; r++) b.push(new Array(TABULEIRO_N).fill(null));
  return b;
}

function pecasDoDono(b, dono) {
  const lista = [];
  for (let r = 0; r < TABULEIRO_N; r++) {
    for (let c = 0; c < TABULEIRO_N; c++) {
      if (b[r][c] && b[r][c].dono === dono) lista.push({ r, c });
    }
  }
  return lista;
}

function encontrarBandeira(b, dono) {
  for (let r = 0; r < TABULEIRO_N; r++) {
    for (let c = 0; c < TABULEIRO_N; c++) {
      if (b[r][c] && b[r][c].dono === dono && b[r][c].tipo === 'bandeira') return { r, c };
    }
  }
  return null;
}

function criarListaExercito() {
  const lista = [];
  for (let patente = 1; patente <= 6; patente++) for (let i = 0; i < 4; i++) lista.push(patente);
  for (let i = 0; i < 4; i++) lista.push('bomba');
  lista.push('bandeira');
  return lista; // 29 itens
}
function poolInicial() { return { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, bomba: 4, bandeira: 1 }; }

function removerDaLista(lista, valor) {
  const idx = lista.indexOf(valor);
  if (idx !== -1) lista.splice(idx, 1);
}
function removerZonaSquare(zona, r, c) {
  const idx = zona.findIndex((s) => s.r === r && s.c === c);
  if (idx !== -1) zona.splice(idx, 1);
}

/* ── POSICIONAMENTO ── */
function gerarPosicionamentoComputador(b) {
  const zona = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < TABULEIRO_N; c++) zona.push({ r, c });

  const restante = criarListaExercito();

  const colBandeira = Math.floor(Math.random() * TABULEIRO_N);
  b[0][colBandeira] = { dono: 'computador', tipo: 'bandeira', revelada: false };
  removerZonaSquare(zona, 0, colBandeira);
  removerDaLista(restante, 'bandeira');

  const vizinhosBandeira = [[0, colBandeira - 1], [0, colBandeira + 1], [1, colBandeira]]
    .filter(([r, c]) => dentroTabuleiro(r, c) && !b[r][c]);
  embaralhar(vizinhosBandeira).slice(0, 2).forEach(([r, c]) => {
    b[r][c] = { dono: 'computador', tipo: 'bomba', revelada: false };
    removerZonaSquare(zona, r, c);
    removerDaLista(restante, 'bomba');
  });

  const tokensEmbaralhados = embaralhar(restante);
  const zonaEmbaralhada = embaralhar(zona);
  tokensEmbaralhados.forEach((tipo, i) => {
    const { r, c } = zonaEmbaralhada[i];
    b[r][c] = { dono: 'computador', tipo, revelada: false };
  });
}

/* ── MOTOR DE REGRAS ── */
function gerarMovimentosPeca(b, r, c) {
  const peca = b[r][c];
  if (!peca || peca.tipo === 'bomba' || peca.tipo === 'bandeira') return [];
  const resultados = [];

  if (peca.tipo === 3) {
    DIRECOES_ORTOGONAIS.forEach(([dr, dc]) => {
      let rr = r + dr, cc = c + dc;
      while (dentroTabuleiro(rr, cc) && !casaEhLago(rr, cc) && !b[rr][cc]) {
        resultados.push({ de: { r, c }, para: { r: rr, c: cc }, ataque: false });
        rr += dr; cc += dc;
      }
      if (dentroTabuleiro(rr, cc) && !casaEhLago(rr, cc) && b[rr][cc] && b[rr][cc].dono !== peca.dono) {
        resultados.push({ de: { r, c }, para: { r: rr, c: cc }, ataque: true });
      }
    });
  } else {
    DIRECOES_ORTOGONAIS.forEach(([dr, dc]) => {
      const rr = r + dr, cc = c + dc;
      if (!dentroTabuleiro(rr, cc) || casaEhLago(rr, cc)) return;
      if (!b[rr][cc]) resultados.push({ de: { r, c }, para: { r: rr, c: cc }, ataque: false });
      else if (b[rr][cc].dono !== peca.dono) resultados.push({ de: { r, c }, para: { r: rr, c: cc }, ataque: true });
    });
  }
  return resultados;
}

function movimentosLegais(b, dono) {
  let resultados = [];
  pecasDoDono(b, dono).forEach(({ r, c }) => { resultados = resultados.concat(gerarMovimentosPeca(b, r, c)); });
  return resultados;
}
function temMovimentosLegais(b, dono) { return movimentosLegais(b, dono).length > 0; }

// Resultado do combate do ponto de vista do atacante: 'vence' | 'perde' | 'empate'.
function resolverCombate(tipoAtacante, tipoDefensor) {
  if (tipoDefensor === 'bandeira') return 'vence';
  if (tipoDefensor === 'bomba') return tipoAtacante === 2 ? 'vence' : 'perde';
  if (tipoAtacante === 1 && tipoDefensor === 6) return 'vence'; // Espiã ataca o Marechal
  if (tipoAtacante === tipoDefensor) return 'empate';
  return tipoAtacante > tipoDefensor ? 'vence' : 'perde';
}

function aplicarMovimento(b, mov) {
  const novoBoard = clonarBoard(b);
  const atacante = { ...novoBoard[mov.de.r][mov.de.c] };
  novoBoard[mov.de.r][mov.de.c] = null;

  if (!mov.ataque) {
    novoBoard[mov.para.r][mov.para.c] = atacante;
    return { board: novoBoard, resultadoCombate: null, potinhoCapturado: null };
  }

  const defensor = { ...novoBoard[mov.para.r][mov.para.c] };
  const resultadoCombate = resolverCombate(atacante.tipo, defensor.tipo);
  atacante.revelada = true;
  defensor.revelada = true;

  if (defensor.tipo === 'bandeira') {
    novoBoard[mov.para.r][mov.para.c] = atacante;
    return { board: novoBoard, resultadoCombate, potinhoCapturado: defensor.dono };
  }
  if (resultadoCombate === 'vence') novoBoard[mov.para.r][mov.para.c] = atacante;
  else if (resultadoCombate === 'perde') novoBoard[mov.para.r][mov.para.c] = defensor;
  else novoBoard[mov.para.r][mov.para.c] = null;

  return { board: novoBoard, resultadoCombate, potinhoCapturado: null };
}

/* ── IA: valor esperado sobre patente oculta (não é busca de informação completa) ── */
function valorDefensor(tipo) {
  if (tipo === 'bandeira') return 5000;
  if (tipo === 'bomba') return 120;
  return VALOR_PATENTE[tipo];
}
function poolNaoRevelado(b, dono) {
  return pecasDoDono(b, dono).filter(({ r, c }) => !b[r][c].revelada).map(({ r, c }) => b[r][c].tipo);
}
function valorEsperadoAtaque(tipoAtacante, pool) {
  if (!pool.length) return 0;
  let soma = 0;
  pool.forEach((tipoDefensor) => {
    const resultado = resolverCombate(tipoAtacante, tipoDefensor);
    if (resultado === 'vence') soma += valorDefensor(tipoDefensor);
    else if (resultado === 'perde') soma -= VALOR_PATENTE[tipoAtacante];
    else soma -= 15;
  });
  return soma / pool.length;
}
// Risco/oportunidade de terminar o movimento ao lado de uma peça inimiga já revelada
// (só usa informação que o jogador real também teria: patentes já reveladas em combate).
function avaliarRiscoPosicao(b, dono, r, c, tipoPeca) {
  let pontos = 0;
  DIRECOES_ORTOGONAIS.forEach(([dr, dc]) => {
    const rr = r + dr, cc = c + dc;
    if (!dentroTabuleiro(rr, cc) || casaEhLago(rr, cc)) return;
    const vizinho = b[rr][cc];
    if (!vizinho || vizinho.dono === dono || !vizinho.revelada) return;
    if (resolverCombate(vizinho.tipo, tipoPeca) === 'vence') pontos -= VALOR_PATENTE[tipoPeca] * 0.4;
    if (resolverCombate(tipoPeca, vizinho.tipo) === 'vence') pontos += valorDefensor(vizinho.tipo) * 0.15;
  });
  return pontos;
}
function avaliarMovimento(b, mov, dono, cfg) {
  if (!mov.ataque) {
    const linhaAlvo = dono === 'computador' ? TABULEIRO_N - 1 : 0;
    let pontos = (TABULEIRO_N - 1 - Math.abs(mov.para.r - linhaAlvo)) * 0.3;
    if (cfg.pesoAmeaca) {
      const tipoPeca = b[mov.de.r][mov.de.c].tipo;
      pontos += avaliarRiscoPosicao(b, dono, mov.para.r, mov.para.c, tipoPeca) * cfg.pesoAmeaca;
    }
    if (cfg.protegerBase) {
      const bandeira = encontrarBandeira(b, dono);
      if (bandeira && adjacente(mov.de.r, mov.de.c, bandeira.r, bandeira.c) && !adjacente(mov.para.r, mov.para.c, bandeira.r, bandeira.c)) {
        pontos -= 25;
      }
    }
    return pontos;
  }
  const atacante = b[mov.de.r][mov.de.c];
  const defensor = b[mov.para.r][mov.para.c];
  if (defensor.revelada) {
    const resultado = resolverCombate(atacante.tipo, defensor.tipo);
    if (resultado === 'vence') return valorDefensor(defensor.tipo) + (cfg.bonusAtacarFracaRevelada || 0);
    if (resultado === 'perde') return -VALOR_PATENTE[atacante.tipo];
    return -15;
  }
  const pool = poolNaoRevelado(b, oponente(dono));
  return valorEsperadoAtaque(atacante.tipo, pool);
}
function escolherMovimentoIA(b, dono, cfg) {
  const movimentos = movimentosLegais(b, dono);
  if (!movimentos.length) return null;
  if (movimentos.length === 1) return movimentos[0];
  if (cfg.erro && Math.random() < cfg.erro) return movimentos[Math.floor(Math.random() * movimentos.length)];

  const avaliados = movimentos.map((mov) => ({ mov, valor: avaliarMovimento(b, mov, dono, cfg) }));
  const melhorValor = Math.max(...avaliados.map((a) => a.valor));
  const candidatos = avaliados.filter((a) => a.valor >= melhorValor - (cfg.margem || 0));
  return candidatos[Math.floor(Math.random() * candidatos.length)].mov;
}

/* ── SELEÇÃO DE NÍVEL ── */
document.querySelectorAll('.dificuldade-card').forEach((btn) => {
  btn.addEventListener('click', () => { tocar('click'); novoJogo(btn.dataset.nivel); });
});
$('btn-trocar-nivel').addEventListener('click', () => { tocar('click'); abrirSelecaoNivel(); });
$('btn-jogar-de-novo').addEventListener('click', () => { tocar('click'); novoJogo(nivelAtual); });
$('btn-distribuir-aleatorio').addEventListener('click', () => { tocar('click'); distribuirAleatoriamente(); });
$('btn-iniciar-batalha').addEventListener('click', () => { tocar('click'); iniciarBatalha(); });

function abrirSelecaoNivel() {
  Object.keys(NIVEIS).forEach((nivel) => {
    const rec = localStorage.getItem(RECORDE_KEY + nivel);
    const el = $('recorde-' + nivel);
    if (el) el.textContent = rec ? `Melhor tempo: ${fmtTempo(parseFloat(rec))}` : '';
  });
  $('combate-wrap').classList.add('hidden');
  mostrarOverlay('overlay-inicio');
}

/* ── NOVO JOGO / POSICIONAMENTO ── */
function novoJogo(nivel) {
  nivelAtual = nivel;
  board = criarTabuleiroVazio();
  gerarPosicionamentoComputador(board);
  poolHumano = poolInicial();
  selecionadoPosicionamento = null;
  selecionado = null;
  destinosLegais = [];
  faseAtual = 'posicionamento';
  turno = 'humano';
  capturasHumano = 0;
  capturasComputador = 0;
  historicoPosicoes = {};
  jogadasTotais = 0;
  tempoInicio = null;
  pararTimer();
  jogoAtivo = false;

  esconderOverlays();
  $('combate-wrap').classList.remove('hidden');
  renderTabuleiro();
  renderPool();
  renderStats();
}

function clicarPoolHumano(tipo) {
  if (faseAtual !== 'posicionamento' || poolHumano[tipo] <= 0) return;
  tocar('click');
  selecionadoPosicionamento = selecionadoPosicionamento === tipo ? null : tipo;
  renderPool();
}

function clicarCasaPosicionamento(r, c) {
  if (faseAtual !== 'posicionamento' || !casaNaZonaHumano(r, c)) return;
  tocar('click');
  if (board[r][c] && board[r][c].dono === 'humano') {
    poolHumano[board[r][c].tipo]++;
    board[r][c] = null;
  } else if (!board[r][c] && selecionadoPosicionamento && poolHumano[selecionadoPosicionamento] > 0) {
    board[r][c] = { dono: 'humano', tipo: selecionadoPosicionamento, revelada: false };
    poolHumano[selecionadoPosicionamento]--;
    if (poolHumano[selecionadoPosicionamento] === 0) selecionadoPosicionamento = null;
  }
  renderTabuleiro();
  renderPool();
}

function distribuirAleatoriamente() {
  const restantes = [];
  Object.keys(poolHumano).forEach((k) => {
    const tipo = (k === 'bomba' || k === 'bandeira') ? k : Number(k);
    for (let i = 0; i < poolHumano[k]; i++) restantes.push(tipo);
  });
  if (!restantes.length) return;

  const zonaVazia = [];
  for (let r = 6; r < TABULEIRO_N; r++) for (let c = 0; c < TABULEIRO_N; c++) if (!board[r][c]) zonaVazia.push({ r, c });

  const tokensEmbaralhados = embaralhar(restantes);
  const zonaEmbaralhada = embaralhar(zonaVazia).slice(0, tokensEmbaralhados.length);
  tokensEmbaralhados.forEach((tipo, i) => {
    const { r, c } = zonaEmbaralhada[i];
    board[r][c] = { dono: 'humano', tipo, revelada: false };
  });
  poolHumano = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, bomba: 0, bandeira: 0 };
  selecionadoPosicionamento = null;
  renderTabuleiro();
  renderPool();
}

function poolVazio() { return Object.values(poolHumano).every((n) => n === 0); }

function iniciarBatalha() {
  if (!poolVazio()) return;
  faseAtual = 'batalha';
  turno = 'humano';
  jogoAtivo = true;
  tempoInicio = null;
  iniciarTimer();
  renderTabuleiro();
  renderPool();
  renderStats();
}

/* ── FLUXO DE JOGADA ── */
function serializarBoard(b) {
  return b.map((linha) => linha.map((p) => (p ? `${p.dono[0]}${p.tipo}` : '.')).join(',')).join('|');
}

function realizarJogada(mov) {
  if (!tempoInicio) iniciarTimer();
  const donoQueJogou = board[mov.de.r][mov.de.c].dono;

  const resultado = aplicarMovimento(board, mov);
  board = resultado.board;
  jogadasTotais++;
  if (mov.ataque && resultado.resultadoCombate === 'vence') {
    if (donoQueJogou === 'humano') capturasHumano++; else capturasComputador++;
  }

  selecionado = null;
  destinosLegais = [];
  turno = oponente(donoQueJogou);

  renderTabuleiro();
  renderStats();

  if (resultado.potinhoCapturado) {
    finalizarJogo(donoQueJogou === 'humano' ? 'vitoria' : 'derrota');
    return;
  }

  const chave = serializarBoard(board);
  historicoPosicoes[chave] = (historicoPosicoes[chave] || 0) + 1;

  const fim = verificarFimDeJogo();
  if (!fim && turno === 'computador') {
    setTimeout(jogarTurnoComputador, 450 + Math.random() * 250);
  }
}

function jogarTurnoComputador() {
  if (!jogoAtivo || turno !== 'computador') return;
  const mov = escolherMovimentoIA(board, 'computador', NIVEIS[nivelAtual]);
  if (mov) realizarJogada(mov);
}

function verificarFimDeJogo() {
  const chave = serializarBoard(board);
  if (historicoPosicoes[chave] >= 3) { finalizarJogo('empate'); return true; }
  if (jogadasTotais >= LIMITE_PLIES_SEGURANCA) { finalizarJogo('empate'); return true; }
  if (!temMovimentosLegais(board, turno)) {
    finalizarJogo(turno === 'humano' ? 'derrota' : 'vitoria');
    return true;
  }
  return false;
}

/* ── RESULTADO ── */
function finalizarJogo(resultado) {
  jogoAtivo = false;
  pararTimer();
  const tempoFinal = tempoDecorrido();

  if (resultado === 'vitoria') {
    tocar('porta');
    $('resultado-eyebrow').textContent = 'Miau de vitória!';
    $('resultado-titulo').textContent = 'Você capturou o potinho do computador!';
    $('resultado-texto').textContent = 'Seu exército chegou até a base inimiga. Muito bem, general!';
  } else if (resultado === 'derrota') {
    tocar('tranca');
    $('resultado-eyebrow').textContent = 'Ih...';
    $('resultado-titulo').textContent = 'O computador venceu essa batalha!';
    $('resultado-texto').textContent = 'Seu potinho foi capturado ou seu exército ficou sem jogadas. Tente de novo!';
  } else {
    $('resultado-eyebrow').textContent = 'Empate';
    $('resultado-titulo').textContent = 'Deu empate!';
    $('resultado-texto').textContent = 'A mesma posição se repetiu demais — os dois exércitos ficaram travados.';
  }

  $('vit-tempo').textContent = fmtTempo(tempoFinal);
  $('vit-capturas').textContent = capturasHumano;

  if (resultado === 'vitoria') {
    const cfg = NIVEIS[nivelAtual];
    const chaveXp = XP_KEY + nivelAtual;
    if (!localStorage.getItem(chaveXp)) {
      localStorage.setItem(chaveXp, '1');
      $('vit-xp').textContent = `+${cfg.xp} XP`;
      $('vit-xp').classList.remove('hidden');
      if (typeof window._concederXpCombate === 'function') window._concederXpCombate(cfg.xp);
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
  } else {
    $('vit-xp').classList.add('hidden');
    $('vit-recorde').textContent = '';
  }

  mostrarOverlay('overlay-resultado');
}

/* ── RENDER ── */
function renderTabuleiro() {
  const tab = $('tabuleiro');
  tab.innerHTML = '';
  for (let r = 0; r < TABULEIRO_N; r++) {
    for (let c = 0; c < TABULEIRO_N; c++) {
      const lago = casaEhLago(r, c);
      const casa = document.createElement('div');
      casa.className = 'casa ' + (lago ? 'lago' : (squareEscura(r, c) ? 'escura' : 'clara'));

      if (faseAtual === 'posicionamento' && casaNaZonaHumano(r, c)) casa.classList.add('zona-jogavel');
      if (destinosLegais.some((m) => m.para.r === r && m.para.c === c)) casa.classList.add('destino-legal');
      if (selecionado && selecionado.r === r && selecionado.c === c) casa.classList.add('casa-selecionada');

      const peca = board[r][c];
      if (peca) {
        const visivel = peca.dono === 'humano' || peca.revelada;
        const pecaEl = document.createElement('div');
        pecaEl.className = 'peca dono-' + peca.dono + (visivel ? '' : ' oculta');
        if (visivel) {
          if (peca.tipo === 'bomba') {
            pecaEl.innerHTML = `<span class="peca-emoji" title="Bomba">💣</span>`;
          } else if (peca.tipo === 'bandeira') {
            pecaEl.innerHTML = `<span class="peca-emoji" title="Potinho de Ração">🥣</span>`;
          } else {
            const cfg = GATOS_CFG[PATENTES_CFG[peca.tipo].gato];
            pecaEl.innerHTML = `<img src="${cfg.src}" alt="${cfg.nome}" title="${cfg.nome} — ${PATENTES_CFG[peca.tipo].nome} (Patente ${peca.tipo})"><span class="peca-patente">${peca.tipo}</span>`;
          }
        }
        casa.appendChild(pecaEl);
      }

      if (!lago && (
        (faseAtual === 'posicionamento' && casaNaZonaHumano(r, c)) ||
        (faseAtual === 'batalha')
      )) {
        casa.addEventListener('click', () => clicarCasa(r, c));
      }
      tab.appendChild(casa);
    }
  }
}

function renderPool() {
  const pool = $('pool-posicionamento');
  const acoes = $('posicionamento-acoes');
  if (!pool) return;
  pool.innerHTML = '';
  if (faseAtual !== 'posicionamento') {
    pool.classList.add('hidden');
    acoes.classList.add('hidden');
    return;
  }
  pool.classList.remove('hidden');
  acoes.classList.remove('hidden');

  [1, 2, 3, 4, 5, 6, 'bomba', 'bandeira'].forEach((tipo) => {
    const qtde = poolHumano[tipo];
    const el = document.createElement('div');
    el.className = 'pool-item' + (qtde === 0 ? ' esgotado' : '') + (selecionadoPosicionamento === tipo ? ' selecionado' : '');

    let iconeHtml, nome, desc;
    if (tipo === 'bomba' || tipo === 'bandeira') {
      const cfg = OUTROS_CFG[tipo];
      iconeHtml = `<span class="pool-emoji">${cfg.emoji}</span>`;
      nome = cfg.nome;
      desc = cfg.desc;
    } else {
      const patente = PATENTES_CFG[tipo];
      const cfg = GATOS_CFG[patente.gato];
      iconeHtml = `<img src="${cfg.src}" alt="${cfg.nome}">`;
      nome = `${cfg.nome} — ${patente.nome} (P${tipo})`;
      desc = patente.desc;
    }
    el.innerHTML = `${iconeHtml}<span class="pool-nome">${nome}</span><span class="pool-desc">${desc}</span><span class="pool-qtde">${qtde}</span>`;
    el.addEventListener('click', () => clicarPoolHumano(tipo));
    pool.appendChild(el);
  });

  const podeIniciar = poolVazio();
  $('btn-iniciar-batalha').disabled = !podeIniciar;
}

function renderStats() {
  $('stat-tempo').textContent = fmtTempo(tempoDecorrido());
  $('stat-pecas-humano').textContent = pecasDoDono(board, 'humano').length;
  $('stat-pecas-computador').textContent = pecasDoDono(board, 'computador').length;
  const indicador = $('turno-indicador');
  if (faseAtual === 'posicionamento') indicador.textContent = 'Posicione seu exército';
  else if (!jogoAtivo) indicador.textContent = '';
  else indicador.textContent = turno === 'humano' ? 'Sua vez! 🐾' : 'Vez do computador...';
}
function atualizarStats() { renderStats(); }

/* ── INTERAÇÃO ── */
function clicarCasa(r, c) {
  if (faseAtual === 'posicionamento') { clicarCasaPosicionamento(r, c); return; }
  if (!jogoAtivo || turno !== 'humano') return;

  if (selecionado) {
    const candidato = destinosLegais.find((m) => m.para.r === r && m.para.c === c);
    if (candidato) {
      tocar('click');
      realizarJogada(candidato);
      return;
    }
  }

  const peca = board[r][c];
  if (peca && peca.dono === 'humano') {
    tocar('click');
    const legais = gerarMovimentosPeca(board, r, c);
    if (!legais.length) {
      selecionado = null;
      destinosLegais = [];
    } else {
      selecionado = { r, c };
      destinosLegais = legais;
    }
    renderTabuleiro();
    return;
  }

  selecionado = null;
  destinosLegais = [];
  renderTabuleiro();
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
