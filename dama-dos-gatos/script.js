/* ── DAMA DOS GATOS — KiFácil (dama 6×6, humano vs computador) ──────────── */

const GATOS_CFG = {
  chico:    { nome: 'Chico',    src: '../imagens-animais/chico-em-pe.png' },
  pitu:     { nome: 'Pitu',     src: '../imagens-animais/pitu-em-pe.png' },
  teti:     { nome: 'Teti',     src: '../imagens-animais/teti.png' },
  bentinho: { nome: 'Bentinho', src: '../imagens-animais/bentinho-em-pe.png' },
  lolo:     { nome: 'Lolo',     src: '../imagens-animais/lolo.png' },
  lanlan:   { nome: 'Lanlan',   src: '../imagens-animais/lanlan.png' },
};
const TODOS_GATOS = Object.keys(GATOS_CFG);

const NIVEIS = {
  facil:   { profundidade: 1, erro: 0.3, margem: 0,  xp: 20 },
  medio:   { profundidade: 3, erro: 0,   margem: 15, xp: 35 },
  dificil: { profundidade: 5, erro: 0,   margem: 0,  xp: 55 },
};
const RECORDE_KEY = 'kf_dama_recorde_';
const XP_KEY = 'kf_dama_xp_';
const DIRECOES_DIAGONAIS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const TABULEIRO_N = 6;
const PLIES_SEM_PROGRESSO_LIMITE = 40;

const $ = (id) => document.getElementById(id);

/* ── ESTADO ── */
let nivelAtual = null;
let board = null;
let turno = 'humano';
let selecionado = null;
let destinosLegais = [];
let capturasHumano = 0;
let capturasComputador = 0;
let pliesSemProgresso = 0;
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

function dentroTabuleiro(r, c) { return r >= 0 && r < TABULEIRO_N && c >= 0 && c < TABULEIRO_N; }
function squareEscura(r, c) { return (r + c) % 2 === 1; }
function oponente(dono) { return dono === 'humano' ? 'computador' : 'humano'; }
function clonarBoard(b) { return b.map((linha) => linha.map((p) => (p ? { ...p } : null))); }

/* ── MOTOR DE REGRAS ── */
function criarTabuleiroInicial() {
  const b = [];
  for (let r = 0; r < TABULEIRO_N; r++) b.push(new Array(TABULEIRO_N).fill(null));

  const casasComputador = [[0, 1], [0, 3], [0, 5], [1, 0], [1, 2], [1, 4]];
  const casasHumano = [[4, 1], [4, 3], [4, 5], [5, 0], [5, 2], [5, 4]];
  const catsComputador = embaralhar(TODOS_GATOS);
  const catsHumano = embaralhar(TODOS_GATOS);

  casasComputador.forEach(([r, c], i) => { b[r][c] = { dono: 'computador', cat: catsComputador[i], rei: false }; });
  casasHumano.forEach(([r, c], i) => { b[r][c] = { dono: 'humano', cat: catsHumano[i], rei: false }; });
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

function gerarMovimentosSimples(b, dono) {
  const resultados = [];
  const dr = dono === 'humano' ? -1 : 1;
  const linhaPromocao = dono === 'humano' ? 0 : TABULEIRO_N - 1;

  pecasDoDono(b, dono).forEach(({ r, c }) => {
    const peca = b[r][c];
    if (peca.rei) {
      DIRECOES_DIAGONAIS.forEach(([ddr, ddc]) => {
        let rr = r + ddr, cc = c + ddc;
        while (dentroTabuleiro(rr, cc) && !b[rr][cc]) {
          resultados.push({ de: { r, c }, para: { r: rr, c: cc }, capturas: [], viraRei: false });
          rr += ddr; cc += ddc;
        }
      });
    } else {
      [-1, 1].forEach((ddc) => {
        const rr = r + dr, cc = c + ddc;
        if (dentroTabuleiro(rr, cc) && !b[rr][cc]) {
          resultados.push({ de: { r, c }, para: { r: rr, c: cc }, capturas: [], viraRei: rr === linhaPromocao });
        }
      });
    }
  });
  return resultados;
}

// Sequência de captura obrigatória: peça continua capturando enquanto houver captura
// disponível a partir da nova casa. Se promover no meio do caminho, a cadeia para ali
// (simplificação: uma peça recém-coroada não continua capturando como dama na mesma jogada).
function gerarCapturasDaPeca(boardOriginal, origemR, origemC) {
  const pecaOriginal = boardOriginal[origemR][origemC];
  const donoPeca = pecaOriginal.dono;
  const rei = pecaOriginal.rei;
  const linhaPromocao = donoPeca === 'humano' ? 0 : TABULEIRO_N - 1;
  const resultados = [];

  function dfs(r, c, b, capturas) {
    let achouCaptura = false;

    if (rei) {
      DIRECOES_DIAGONAIS.forEach(([dr, dc]) => {
        let rr = r + dr, cc = c + dc;
        while (dentroTabuleiro(rr, cc) && !b[rr][cc]) { rr += dr; cc += dc; }
        if (!dentroTabuleiro(rr, cc) || !b[rr][cc] || b[rr][cc].dono === donoPeca) return;
        if (capturas.some((p) => p.r === rr && p.c === cc)) return;
        let lr = rr + dr, lc = cc + dc;
        while (dentroTabuleiro(lr, lc) && !b[lr][lc]) {
          achouCaptura = true;
          const novoBoard = clonarBoard(b);
          novoBoard[r][c] = null;
          novoBoard[lr][lc] = pecaOriginal;
          dfs(lr, lc, novoBoard, capturas.concat([{ r: rr, c: cc }]));
          lr += dr; lc += dc;
        }
      });
    } else {
      DIRECOES_DIAGONAIS.forEach(([dr, dc]) => {
        const mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc;
        if (!dentroTabuleiro(lr, lc)) return;
        const alvo = dentroTabuleiro(mr, mc) ? b[mr][mc] : null;
        if (!alvo || alvo.dono === donoPeca || b[lr][lc]) return;
        if (capturas.some((p) => p.r === mr && p.c === mc)) return;
        achouCaptura = true;
        const novasCapturas = capturas.concat([{ r: mr, c: mc }]);
        if (lr === linhaPromocao) {
          resultados.push({ de: { r: origemR, c: origemC }, para: { r: lr, c: lc }, capturas: novasCapturas, viraRei: true });
        } else {
          const novoBoard = clonarBoard(b);
          novoBoard[r][c] = null;
          novoBoard[lr][lc] = pecaOriginal;
          dfs(lr, lc, novoBoard, novasCapturas);
        }
      });
    }

    if (!achouCaptura && capturas.length > 0) {
      resultados.push({ de: { r: origemR, c: origemC }, para: { r, c }, capturas, viraRei: false });
    }
  }

  dfs(origemR, origemC, boardOriginal, []);
  return resultados;
}

function gerarTodasCapturas(b, dono) {
  let resultados = [];
  pecasDoDono(b, dono).forEach(({ r, c }) => {
    resultados = resultados.concat(gerarCapturasDaPeca(b, r, c));
  });
  return resultados;
}

function movimentosLegais(b, dono) {
  const capturas = gerarTodasCapturas(b, dono);
  return capturas.length ? capturas : gerarMovimentosSimples(b, dono);
}

function temMovimentosLegais(b, dono) { return movimentosLegais(b, dono).length > 0; }

function aplicarMovimento(b, mov) {
  const novoBoard = clonarBoard(b);
  const peca = novoBoard[mov.de.r][mov.de.c];
  novoBoard[mov.de.r][mov.de.c] = null;
  mov.capturas.forEach((p) => { novoBoard[p.r][p.c] = null; });
  novoBoard[mov.para.r][mov.para.c] = mov.viraRei ? { ...peca, rei: true } : peca;
  return novoBoard;
}

/* ── IA: negamax com poda alpha-beta ── */
function avaliarTabuleiro(b, dono) {
  let pontuacao = 0;
  for (let r = 0; r < TABULEIRO_N; r++) {
    for (let c = 0; c < TABULEIRO_N; c++) {
      const p = b[r][c];
      if (!p) continue;
      let valor = p.rei ? 160 : 100;
      if (!p.rei) valor += (p.dono === 'humano' ? (TABULEIRO_N - 1 - r) : r) * 3;
      if (c === 2 || c === 3) valor += 4;
      pontuacao += p.dono === dono ? valor : -valor;
    }
  }
  const mobProprio = movimentosLegais(b, dono).length;
  const mobOponente = movimentosLegais(b, oponente(dono)).length;
  pontuacao += (mobProprio - mobOponente) * 2;
  return pontuacao;
}

function negamax(b, dono, profundidade, alpha, beta) {
  const movimentos = movimentosLegais(b, dono);
  if (movimentos.length === 0) return -9000 - profundidade;
  if (profundidade === 0) return avaliarTabuleiro(b, dono);

  let melhor = -Infinity;
  for (const mov of movimentos) {
    const novoBoard = aplicarMovimento(b, mov);
    const valor = -negamax(novoBoard, oponente(dono), profundidade - 1, -beta, -alpha);
    if (valor > melhor) melhor = valor;
    if (melhor > alpha) alpha = melhor;
    if (alpha >= beta) break;
  }
  return melhor;
}

function escolherMovimentoIA(b, dono, cfg) {
  const movimentos = movimentosLegais(b, dono);
  if (!movimentos.length) return null;
  if (movimentos.length === 1) return movimentos[0];
  if (cfg.erro && Math.random() < cfg.erro) {
    return movimentos[Math.floor(Math.random() * movimentos.length)];
  }

  const ordenados = movimentos.slice().sort((a, c) => c.capturas.length - a.capturas.length);
  const avaliados = ordenados.map((mov) => {
    const novoBoard = aplicarMovimento(b, mov);
    const valor = -negamax(novoBoard, oponente(dono), cfg.profundidade - 1, -Infinity, Infinity);
    return { mov, valor };
  });
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

function abrirSelecaoNivel() {
  Object.keys(NIVEIS).forEach((nivel) => {
    const rec = localStorage.getItem(RECORDE_KEY + nivel);
    const el = $('recorde-' + nivel);
    if (el) el.textContent = rec ? `Melhor tempo: ${fmtTempo(parseFloat(rec))}` : '';
  });
  $('dama-wrap').classList.add('hidden');
  mostrarOverlay('overlay-inicio');
}

/* ── NOVO JOGO ── */
function novoJogo(nivel) {
  nivelAtual = nivel;
  board = criarTabuleiroInicial();
  turno = 'humano';
  selecionado = null;
  destinosLegais = [];
  capturasHumano = 0;
  capturasComputador = 0;
  pliesSemProgresso = 0;
  tempoInicio = null;
  pararTimer();
  jogoAtivo = true;

  renderTabuleiro();
  renderStats();
  esconderOverlays();
  $('dama-wrap').classList.remove('hidden');
}

/* ── FLUXO DE JOGADA ── */
function realizarJogada(mov) {
  if (!tempoInicio) iniciarTimer();
  const donoQueJogou = board[mov.de.r][mov.de.c].dono;

  board = aplicarMovimento(board, mov);
  if (mov.capturas.length > 0 || mov.viraRei) pliesSemProgresso = 0;
  else pliesSemProgresso++;
  if (mov.capturas.length > 0) {
    if (donoQueJogou === 'humano') capturasHumano += mov.capturas.length;
    else capturasComputador += mov.capturas.length;
  }

  selecionado = null;
  destinosLegais = [];
  turno = oponente(donoQueJogou);

  renderTabuleiro();
  renderStats();

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
  if (pliesSemProgresso >= PLIES_SEM_PROGRESSO_LIMITE) {
    finalizarJogo('empate');
    return true;
  }
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
    $('resultado-titulo').textContent = 'Você venceu a Dama dos Gatos!';
    $('resultado-texto').textContent = 'Os gatos do computador ficaram sem jogadas. Muito bem!';
  } else if (resultado === 'derrota') {
    tocar('tranca');
    $('resultado-eyebrow').textContent = 'Ih...';
    $('resultado-titulo').textContent = 'O computador venceu dessa vez!';
    $('resultado-texto').textContent = 'Seus gatos ficaram sem jogadas. Bora tentar de novo?';
  } else {
    $('resultado-eyebrow').textContent = 'Empate';
    $('resultado-titulo').textContent = 'Deu empate!';
    $('resultado-texto').textContent = 'Muitas jogadas em fila sem nenhuma captura — ninguém levou vantagem.';
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
      if (typeof window._concederXpDama === 'function') window._concederXpDama(cfg.xp);
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
      const escura = squareEscura(r, c);
      const casa = document.createElement('div');
      casa.className = 'casa ' + (escura ? 'escura' : 'clara');

      if (destinosLegais.some((m) => m.para.r === r && m.para.c === c)) casa.classList.add('destino-legal');
      if (selecionado && selecionado.r === r && selecionado.c === c) casa.classList.add('casa-selecionada');

      const peca = board[r][c];
      if (peca) {
        const cfg = GATOS_CFG[peca.cat];
        const pecaEl = document.createElement('div');
        pecaEl.className = 'peca dono-' + peca.dono + (peca.rei ? ' rei' : '');
        pecaEl.innerHTML = `<img src="${cfg.src}" alt="${cfg.nome}" title="${cfg.nome}${peca.rei ? ' (Dama)' : ''}">`;
        casa.appendChild(pecaEl);
      }

      if (escura) casa.addEventListener('click', () => clicarCasa(r, c));
      tab.appendChild(casa);
    }
  }
}

function renderStats() {
  $('stat-tempo').textContent = fmtTempo(tempoDecorrido());
  $('stat-pecas-humano').textContent = pecasDoDono(board, 'humano').length;
  $('stat-pecas-computador').textContent = pecasDoDono(board, 'computador').length;
  $('turno-indicador').textContent = !jogoAtivo ? '' : (turno === 'humano' ? 'Sua vez! 🐾' : 'Vez do computador...');
}
function atualizarStats() { renderStats(); }

/* ── INTERAÇÃO ── */
function clicarCasa(r, c) {
  if (!jogoAtivo || turno !== 'humano') return;

  if (selecionado) {
    const candidatos = destinosLegais.filter((m) => m.para.r === r && m.para.c === c);
    if (candidatos.length) {
      tocar('click');
      const melhor = candidatos.reduce((a, b) => (b.capturas.length > a.capturas.length ? b : a));
      realizarJogada(melhor);
      return;
    }
  }

  const peca = board[r][c];
  if (peca && peca.dono === 'humano') {
    const legaisDaPeca = movimentosLegais(board, 'humano').filter((m) => m.de.r === r && m.de.c === c);
    tocar('click');
    if (!legaisDaPeca.length) {
      selecionado = null;
      destinosLegais = [];
    } else {
      selecionado = { r, c };
      destinosLegais = legaisDaPeca;
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
