// IronTrack extra: salvar dados, editor de programas e biblioteca de exercícios.
// Carregue DEPOIS do script principal: <script src="exercicios.js"></script><script src="irontrack-extra.js"></script>
(function () {
  const KEY = 'irontrack_v1', $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const LIB = EXERCICIOS.map(x => ({ f: x[0], n: x[1], g: x[2], e: x[3], k: norm(x[1] + ' ' + x[2] + ' ' + x[3]) }));
  const GRUPOS = ['Todos', ...new Set(LIB.map(x => x.g))];
  const PLAY = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';

  // ---------- Persistência ----------
  function salvar() { try { localStorage.setItem(KEY, JSON.stringify({ programas, treinosRealizados })); } catch (e) {} }
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d) { programas = d.programas; treinosRealizados = d.treinosRealizados; } else { treinosRealizados = []; }
  } catch (e) { treinosRealizados = []; }

  // ---------- CSS + overlays ----------
  document.head.insertAdjacentHTML('beforeend', `<style>
  .ed-box{background:#1C1C27;border-radius:16px;padding:16px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto}
  .mini{background:#13131A;border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#F0F0F0;padding:8px;width:100%;font-size:16px;outline:none}
  .lbl{font-size:11px;color:#6B6B80;flex:1}.gs{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px}.gs .pill{flex:none}
  .lrow{background:#13131A;border:1px solid rgba(255,255,255,.05);border-radius:12px;padding:10px 12px;margin-bottom:8px}
  .lrow img,.pvimg{width:100%;border-radius:12px;margin-top:8px;background:#fff}
  .ib{border:none;border-radius:8px;width:36px;height:36px;font-size:16px;cursor:pointer;background:#1C1C27;color:#F0F0F0;flex:none}
  .ib.ac{background:#C8FF00;color:#0A0A0F;font-weight:700}
  </style>`);
  document.body.insertAdjacentHTML('beforeend', `
  <div class="modal-overlay" id="ed"><div class="ed-box" id="ed-box"></div></div>
  <div class="modal-overlay" id="lib" style="z-index:300"><div class="ed-box" id="lib-box"></div></div>
  <div class="modal-overlay" id="pv" style="z-index:400" onclick="this.classList.remove('active')"><div class="ed-box" id="pv-box"></div></div>`);

  // ---------- Editor de programa ----------
  let EP = null, L = { di: 0, q: '', g: 'Todos', n: 40, list: [] };
  window.editPrograma = id => { EP = programas.find(p => p.id === id); renderEd(); $('ed').classList.add('active'); };
  function renderEd() {
    $('ed-box').innerHTML = `<div class="flex gap-2 mb-3"><input class="input-dark" value="${esc(EP.nome)}" onchange="IT.nomeProg(this.value)"><button class="pill active" onclick="IT.fechar()">Concluir</button></div>` +
      EP.dias.map((d, di) => `<div class="card mb-3"><div class="flex gap-2 mb-3"><input class="mini" value="${esc(d.nome)}" onchange="IT.nomeDia(${di},this.value)"><button class="ib" onclick="IT.delDia(${di})">🗑</button></div>` +
        d.exercicios.map((e, ei) => `<div style="border-top:1px solid rgba(255,255,255,.05);padding:10px 0"><div class="flex items-center justify-between mb-2"><span class="text-sm font-medium" style="color:${e.img ? '#C8FF00' : '#F0F0F0'};${e.img ? 'cursor:pointer' : ''}" ${e.img ? `onclick="IT.prev(${di},${ei})"` : ''}>${e.img ? '▶ ' : ''}${esc(e.nome)}</span><button class="ib" onclick="IT.delEx(${di},${ei})">✕</button></div>
          <div class="flex gap-2"><label class="lbl">Séries<input class="mini" type="number" min="1" value="${e.series}" onchange="IT.setEx(${di},${ei},'series',this.value)"></label><label class="lbl">Reps<input class="mini" value="${esc(e.reps)}" onchange="IT.setEx(${di},${ei},'reps',this.value)"></label><label class="lbl">Kg<input class="mini" type="number" step="0.5" value="${e.cargaInicial}" onchange="IT.setEx(${di},${ei},'cargaInicial',this.value)"></label></div></div>`).join('') +
        `<button class="btn-primary w-full" style="justify-content:center;margin-top:8px" onclick="IT.abrirLib(${di})">+ Exercício</button></div>`).join('') +
      `<button class="pill w-full py-3" onclick="IT.addDia()">+ Novo dia de treino</button>`;
  }

  // ---------- Biblioteca ----------
  function renderLib(keepQ) {
    const q = norm(L.q.trim()).split(/\s+/).filter(Boolean);
    L.list = LIB.filter(x => (L.g === 'Todos' || x.g === L.g) && q.every(w => x.k.includes(w)));
    $('lib-box').innerHTML = `<div class="flex gap-2 mb-3"><input class="input-dark" id="lib-q" placeholder="Buscar entre ${LIB.length} exercícios" value="${esc(L.q)}" oninput="IT.busca(this.value)"><button class="pill active" onclick="IT.fecharLib()">OK</button></div>
      <div class="gs">${GRUPOS.map(g => `<button class="pill${g === L.g ? ' active' : ''}" onclick="IT.grupo('${g}')">${g}</button>`).join('')}</div>
      <button class="pill w-full mb-3" onclick="IT.custom()">+ Criar exercício próprio</button>
      <p class="text-xs secondary-text mb-2">${L.list.length} resultados · toque no nome para ver a animação</p>` +
      L.list.slice(0, L.n).map((x, i) => `<div class="lrow"><div class="flex items-center gap-2"><div class="flex-1 min-w-0" style="cursor:pointer" onclick="IT.togImg(this,${i})"><p class="text-sm font-medium" style="color:#F0F0F0">${esc(x.n)}</p><p class="text-xs secondary-text">${x.g} · ${x.e}</p></div><button class="ib ac" onclick="IT.add(${i},this)">+</button></div></div>`).join('') +
      (L.list.length > L.n ? `<button class="pill w-full py-3" onclick="IT.mais()">Mostrar mais</button>` : '');
    if (keepQ) { const i = $('lib-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }
  const novoId = () => 'x-' + Date.now() + Math.random().toString(36).slice(2, 6);
  const base = (nome, grupo, img) => ({ id: novoId(), nome, grupo, series: 3, reps: '8-12', cargaInicial: 0, ...(img ? { img } : {}) });
  const verImg = (nome, src) => { $('pv-box').innerHTML = `<p class="font-display font-bold" style="color:#F0F0F0">${esc(nome)}</p><img class="pvimg" src="${src}"><p class="text-xs secondary-text text-center mt-2">Toque para fechar</p>`; $('pv').classList.add('active'); };
  window.verImg = e => verImg(e.nome, e.img);

  window.IT = {
    nomeProg: v => { EP.nome = v.trim() || EP.nome; salvar(); },
    nomeDia: (di, v) => { EP.dias[di].nome = v.trim() || EP.dias[di].nome; salvar(); },
    addDia: () => { EP.dias.push({ id: novoId(), nome: 'Dia ' + (EP.dias.length + 1), exercicios: [] }); salvar(); renderEd(); },
    delDia: di => { if (confirm('Excluir este dia?')) { EP.dias.splice(di, 1); salvar(); renderEd(); } },
    delEx: (di, ei) => { EP.dias[di].exercicios.splice(ei, 1); salvar(); renderEd(); },
    setEx: (di, ei, k, v) => { const e = EP.dias[di].exercicios[ei]; e[k] = k === 'reps' ? (v.trim() || '10') : k === 'series' ? Math.max(1, parseInt(v) || 1) : (parseFloat(v) || 0); salvar(); },
    prev: (di, ei) => window.verImg(EP.dias[di].exercicios[ei]),
    fechar: () => { $('ed').classList.remove('active'); salvar(); renderProgramas(); renderHome(); },
    abrirLib: di => { L = { di, q: '', g: 'Todos', n: 40, list: [] }; renderLib(); $('lib').classList.add('active'); },
    fecharLib: () => { $('lib').classList.remove('active'); renderEd(); },
    busca: v => { L.q = v; L.n = 40; renderLib(true); },
    grupo: g => { L.g = g; L.n = 40; renderLib(); },
    mais: () => { L.n += 40; renderLib(); },
    togImg: (el, i) => { const row = el.parentNode.parentNode, im = row.querySelector('img'); if (im) im.remove(); else row.insertAdjacentHTML('beforeend', `<img loading="lazy" src="${IMG_DIR + L.list[i].f}.webp">`); },
    add: (i, btn) => { const x = L.list[i]; EP.dias[L.di].exercicios.push(base(x.n, x.g, IMG_DIR + x.f + '.webp')); salvar(); btn.textContent = '✓'; setTimeout(() => btn.textContent = '+', 900); },
    custom: () => { const n = prompt('Nome do exercício:'); if (!n || !n.trim()) return; EP.dias[L.di].exercicios.push(base(n.trim(), L.g === 'Todos' ? 'Outro' : L.g)); salvar(); IT.fecharLib(); }
  };

  // ---------- Ajustes no app original ----------
  const _fin = finalizarTreino; finalizarTreino = function () { _fin(); salvar(); };
  const _del = deletePrograma; deletePrograma = function (id) { if (!confirm('Excluir este programa?')) return; _del(id); salvar(); };
  const _add = addPrograma; addPrograma = function () { const n = programas.length; _add(); if (programas.length > n) { salvar(); editPrograma(programas[n].id); } };
  const _ini = iniciarTreino; iniciarTreino = function (p, d) {
    const dia = (programas.find(x => x.id === p) || { dias: [] }).dias.find(x => x.id === d);
    if (!dia || !dia.exercicios.length) { alert('Este dia ainda não tem exercícios. Use o lápis do programa para adicionar.'); return; }
    _ini(p, d);
  };
  const _re = renderExercicios; renderExercicios = function () {
    _re();
    const dia = programas.find(p => p.id === programaAtivo).dias.find(d => d.id === diaAtivo);
    document.querySelectorAll('#exercicios-list > .card-elevated').forEach((c, i) => {
      const e = dia.exercicios[i], t = c.querySelector('p');
      if (e && e.img && t) { t.style.cssText += ';cursor:pointer;color:#C8FF00'; t.textContent = '▶ ' + e.nome; t.onclick = () => window.verImg(e); }
    });
  };
  // Próximo treino: segue a sequência do último programa treinado
  const _rh = renderHome; renderHome = function () {
    _rh();
    const u = treinosRealizados[0];
    let prog = programas.find(p => u && p.id === u.programaId) || programas.find(p => p.dias.some(d => d.exercicios.length));
    const dias = prog ? prog.dias.filter(d => d.exercicios.length) : [];
    const i = u ? dias.findIndex(d => d.id === u.diaId) : -1, dia = dias[(i + 1) % (dias.length || 1)];
    const btn = document.querySelector('#screen-home .card-elevated button'), tags = $('proximo-tags');
    tags.innerHTML = '';
    if (!dia) { $('proximo-nome').textContent = 'Nenhum treino cadastrado'; $('proximo-count').textContent = 0; btn.onclick = () => showScreen('programas'); return; }
    $('proximo-nome').textContent = dia.nome; $('proximo-count').textContent = dia.exercicios.length;
    btn.onclick = () => iniciarTreino(prog.id, dia.id);
    dia.exercicios.slice(0, 4).forEach(ex => { const s = document.createElement('span'); s.style.cssText = 'font-size:12px;padding:4px 8px;border-radius:8px;background:#13131A;color:#6B6B80;border:1px solid rgba(255,255,255,0.05)'; s.textContent = ex.nome; tags.appendChild(s); });
  };
  // Timer: respeita o tempo escolhido (o original sempre usava 90s)
  let tBase = 90;
  setTimer = function (s) { tBase = s; resetTimer(); document.querySelectorAll('#timer-presets .pill').forEach((b, i) => b.classList.toggle('active', [30, 60, 90, 120][i] === s)); };
  resetTimer = function () { clearInterval(timerInterval); timerRunning = false; timerSeconds = tBase; updateTimerDisplay(); $('timer-play-btn').innerHTML = PLAY; };
  updateTimerDisplay = function () { $('timer-display').textContent = formatTimer(timerSeconds); $('timer-circle').style.strokeDashoffset = 364.4 * (1 - timerSeconds / tBase); };
  setTimer(90);
  salvar();
})();
