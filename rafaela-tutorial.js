/* ── TUTORIAL DA RAFAELA — componente compartilhado entre os jogos ──
   Uso: iniciarTutorialRafaela(['passo 1', 'passo 2', ...], funcaoQuandoTerminar);
*/
function iniciarTutorialRafaela(passos, aoTerminar) {
  let passoAtual = 0;
  let jaSaiu = false;

  const overlay = document.createElement('div');
  overlay.id = 'rafaela-overlay';
  overlay.innerHTML = `
    <div class="rafaela-card">
      <div class="rafaela-img-wrap"><img src="../personagens/rafa-explicando.jpg" alt="Rafaela"></div>
      <div class="rafaela-nome">Professora Rafaela</div>
      <div class="rafaela-balao" id="rafaela-texto"></div>
      <div class="rafaela-pontos" id="rafaela-pontos"></div>
      <div class="rafaela-acoes">
        <button class="rafaela-btn-nav" id="rafaela-voltar">‹ Voltar</button>
        <button class="rafaela-btn-principal" id="rafaela-proximo"></button>
      </div>
      <button class="rafaela-pular" id="rafaela-pular">Pular explicação e jogar</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const $texto = overlay.querySelector('#rafaela-texto');
  const $pontos = overlay.querySelector('#rafaela-pontos');
  const $voltar = overlay.querySelector('#rafaela-voltar');
  const $proximo = overlay.querySelector('#rafaela-proximo');
  const $pular = overlay.querySelector('#rafaela-pular');

  passos.forEach((_, i) => {
    const ponto = document.createElement('div');
    ponto.className = 'rafaela-ponto';
    ponto.dataset.i = i;
    $pontos.appendChild(ponto);
  });

  function render() {
    $texto.textContent = passos[passoAtual];
    $voltar.disabled = passoAtual === 0;
    $proximo.textContent = passoAtual === passos.length - 1 ? '🐾 Vamos jogar!' : 'Próximo ›';
    $pontos.querySelectorAll('.rafaela-ponto').forEach((p, i) => {
      p.classList.toggle('ativo', i === passoAtual);
    });
  }

  function terminar() {
    if (jaSaiu) return;
    jaSaiu = true;
    overlay.remove();
    aoTerminar();
  }

  $voltar.addEventListener('click', () => {
    if (passoAtual > 0) { passoAtual--; render(); }
  });
  $proximo.addEventListener('click', () => {
    if (passoAtual < passos.length - 1) { passoAtual++; render(); }
    else terminar();
  });
  $pular.addEventListener('click', terminar);

  render();
}
