// ─────────────────────────────────────────────────────────────────────────────
// Insight Eleven Virtual Scout — Frontend App
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ── State ──
  const state = {
    currentMode: 'single',       // single | ranking | premium
    rankingPlayers: [],
    currentMarkdown: '',
    isLoading: false,
    history: JSON.parse(localStorage.getItem('ie_scout_history') || '[]'),
  };

  // ── DOM Elements ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const welcomeScreen = $('#welcome-screen');
  const loadingScreen = $('#loading-screen');
  const resultScreen  = $('#result-screen');
  const scoutReport   = $('#scout-report');

  const formSingle   = $('#search-form-single');
  const formRanking  = $('#search-form-ranking');
  const inputPlayer  = $('#input-player-name');
  const inputRanking = $('#input-ranking-player');
  const rankingTags  = $('#ranking-tags');
  const loadingName  = $('#loading-player-name');
  const quickExamples = $('#quick-examples-single');

  // ── Screens ──
  function showScreen(screen) {
    [welcomeScreen, loadingScreen, resultScreen].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
    if (screen === resultScreen) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Mode Selector ──
  $$('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentMode = btn.dataset.mode;

      formSingle.classList.remove('active');
      formRanking.classList.remove('active');
      quickExamples.style.display = 'none';

      if (state.currentMode === 'single' || state.currentMode === 'premium') {
        formSingle.classList.add('active');
        quickExamples.style.display = 'flex';
        const submitBtn = formSingle.querySelector('.search-submit span');
        submitBtn.textContent = state.currentMode === 'premium' ? 'Dossier Premium' : 'Analizza';
        inputPlayer.placeholder = state.currentMode === 'premium'
          ? 'Cerca un giocatore per il dossier premium...'
          : 'Cerca un giocatore... (es. Lamine Yamal)';
      } else {
        formRanking.classList.add('active');
      }
    });
  });

  // ── Loading Animation Steps ──
  function animateLoadingSteps() {
    const steps = [1, 2, 3, 4];
    let i = 0;
    const interval = setInterval(() => {
      if (i > 0) $(`#step-${steps[i - 1]}`).classList.replace('active', 'done');
      if (i < steps.length) {
        $(`#step-${steps[i]}`).classList.add('active');
        i++;
      } else {
        clearInterval(interval);
      }
    }, 2000);
    return interval;
  }

  function resetLoadingSteps() {
    for (let i = 1; i <= 4; i++) {
      const step = $(`#step-${i}`);
      step.classList.remove('active', 'done');
    }
    $('#step-1').classList.add('active');
  }

  // ── Stream Scout Response ──
  async function fetchScoutStream(endpoint, body) {
    state.isLoading = true;
    state.currentMarkdown = '';
    showScreen(loadingScreen);
    resetLoadingSteps();
    const stepInterval = animateLoadingSteps();

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore di rete.');
      }

      clearInterval(stepInterval);
      for (let i = 1; i <= 4; i++) $(`#step-${i}`).classList.add('done');

      // Show result and begin streaming
      showScreen(resultScreen);
      scoutReport.innerHTML = '<span class="typing-cursor"></span>';

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let data;
          try {
            data = JSON.parse(raw);
          } catch (e) {
            continue;
          }

          if (data.type === 'text') {
            state.currentMarkdown += data.content;
            renderMarkdown();
          } else if (data.type === 'error') {
            throw new Error(data.message);
          }
        }
      }

      // Final render without cursor
      renderMarkdown(false);
      saveToHistory(body);

    } catch (error) {
      clearInterval(stepInterval);
      console.error('Error:', error);
      showScreen(resultScreen);
      scoutReport.innerHTML = `
        <div style="text-align:center;padding:40px;">
          <p style="color:var(--danger);font-size:1.1rem;font-weight:600;">⚠️ Errore</p>
          <p style="color:var(--text-secondary);margin-top:8px;">${error.message}</p>
          <button onclick="location.reload()" style="margin-top:20px;padding:10px 24px;background:var(--bg-glass);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);color:var(--text-primary);cursor:pointer;font-family:var(--font-main);">Riprova</button>
        </div>`;
    } finally {
      state.isLoading = false;
    }
  }

  // ── Render Markdown ──
  function renderMarkdown(showCursor = true) {
    const html = marked.parse(state.currentMarkdown, {
      breaks: true,
      gfm: true,
    });
    scoutReport.innerHTML = html + (showCursor ? '<span class="typing-cursor"></span>' : '');
  }

  // ── Form Submissions ──
  formSingle.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = inputPlayer.value.trim();
    if (!name || state.isLoading) return;

    loadingName.textContent = name;
    const endpoint = state.currentMode === 'premium' ? '/api/premium' : '/api/scout';
    fetchScoutStream(endpoint, { playerName: name });
  });

  formRanking.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.rankingPlayers.length < 2 || state.isLoading) return;

    loadingName.textContent = `${state.rankingPlayers.length} giocatori`;
    fetchScoutStream('/api/ranking', { players: state.rankingPlayers });
  });

  // ── Ranking Tag Input ──
  inputRanking.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const name = inputRanking.value.trim();
      if (!name || state.rankingPlayers.includes(name)) return;

      state.rankingPlayers.push(name);
      renderRankingTags();
      inputRanking.value = '';
    }
  });

  function renderRankingTags() {
    rankingTags.innerHTML = state.rankingPlayers.map((p, i) => `
      <div class="ranking-tag">
        <span>${p}</span>
        <button type="button" data-index="${i}">&times;</button>
      </div>
    `).join('');

    rankingTags.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        state.rankingPlayers.splice(parseInt(btn.dataset.index), 1);
        renderRankingTags();
      });
    });
  }

  // ── Quick Examples ──
  $$('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      inputPlayer.value = btn.dataset.player;
      formSingle.dispatchEvent(new Event('submit'));
    });
  });

  // ── Back Button ──
  $('#btn-back').addEventListener('click', () => {
    showScreen(welcomeScreen);
    inputPlayer.value = '';
    state.currentMarkdown = '';
    scoutReport.innerHTML = '';
  });

  // ── Copy Button ──
  $('#btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.currentMarkdown);
      const btn = $('#btn-copy');
      btn.classList.add('copied');
      btn.querySelector('span').textContent = 'Copiato!';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.querySelector('span').textContent = 'Copia';
      }, 2000);
    } catch (e) { console.error('Copy failed:', e); }
  });

  // ── Print Button ──
  $('#btn-print').addEventListener('click', () => window.print());

  // ── History ──
  function saveToHistory(body) {
    const entry = {
      id: Date.now(),
      mode: state.currentMode,
      query: body.playerName || body.players?.join(', ') || '',
      markdown: state.currentMarkdown,
      date: new Date().toLocaleString('it-IT'),
    };
    state.history.unshift(entry);
    if (state.history.length > 30) state.history = state.history.slice(0, 30);
    localStorage.setItem('ie_scout_history', JSON.stringify(state.history));
    renderHistory();
  }

  function renderHistory() {
    const list = $('#history-list');
    if (state.history.length === 0) {
      list.innerHTML = `<div class="empty-history">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <p>Nessuna ricerca ancora.</p></div>`;
      return;
    }
    list.innerHTML = state.history.map(h => `
      <div class="history-item" data-id="${h.id}">
        <div class="history-item-name">
          <span class="history-item-mode">${h.mode === 'single' ? 'Scout' : h.mode === 'ranking' ? 'Ranking' : 'Premium'}</span>
          ${h.query}
        </div>
        <div class="history-item-meta">${h.date}</div>
      </div>
    `).join('');

    list.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const entry = state.history.find(h => h.id === parseInt(item.dataset.id));
        if (!entry) return;
        state.currentMarkdown = entry.markdown;
        renderMarkdown(false);
        showScreen(resultScreen);
        closeSidebar();
      });
    });
  }

  function closeSidebar() {
    $('#history-sidebar').classList.remove('open');
    $('#overlay').classList.remove('active');
  }

  $('#btn-history').addEventListener('click', () => {
    $('#history-sidebar').classList.add('open');
    $('#overlay').classList.add('active');
  });
  $('#btn-close-history').addEventListener('click', closeSidebar);
  $('#overlay').addEventListener('click', closeSidebar);

  $('#btn-clear-history').addEventListener('click', () => {
    state.history = [];
    localStorage.removeItem('ie_scout_history');
    renderHistory();
  });

  // ── Init ──
  renderHistory();
  inputPlayer.focus();

})();
