// script.js — full, theme-aware calculator with history persistence and delete/clear controls
(() => {
  const displayEl = document.getElementById('display');
  const buttons = Array.from(document.querySelectorAll('.pad button'));
  const historyList = document.getElementById('history-list');
  const copyBtn = document.getElementById('copy-result');
  const themeToggle = document.getElementById('theme-toggle');
  const clearHistoryBtn = document.getElementById('clear-history');

  let expr = '';
  let history = [];

  // Local storage key
  const STORAGE_KEY = 'calc_history_v1';

  // Light and dark CSS var sets
  const lightVars = {
    '--bg-1': '#f6fbff',
    '--bg-2': '#eef6ff',
    '--card-bg': '#ffffff',
    '--accent-1': '#7b61ff',
    '--accent-2': '#00bcd4',
    '--text': '#0b1220',
    '--muted': '#566573',
    '--glass-border': 'rgba(11,18,32,0.06)',
    '--link': '#1155ff',
    '--btn-bg': 'rgba(11,18,32,0.04)',
    '--btn-text': '#0b1220',
    '--btn-op-bg': 'linear-gradient(180deg, rgba(0,188,212,0.06), rgba(123,97,255,0.04))',
    '--btn-func-bg': 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(245,246,250,0.9))',
    '--display-bg': 'linear-gradient(180deg,#ffffff,#fbfcff)',
    '--display-text': '#0b1220',
    '--history-bg': 'linear-gradient(180deg, rgba(250,250,252,0.8), rgba(250,250,252,0.75))'
  };

  const darkVars = {
    '--bg-1': '#081126',
    '--bg-2': '#05203a',
    '--card-bg': 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
    '--accent-1': '#7b61ff',
    '--accent-2': '#00d4ff',
    '--text': '#eef6ff',
    '--muted': '#9aa3b2',
    '--glass-border': 'rgba(255,255,255,0.06)',
    '--link': '#7bd1ff',
    '--btn-bg': 'rgba(255,255,255,0.02)',
    '--btn-text': '#eef6ff',
    '--btn-op-bg': 'linear-gradient(180deg, rgba(0,212,255,0.06), rgba(123,97,255,0.06))',
    '--btn-func-bg': 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
    '--display-bg': 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
    '--display-text': '#eef6ff',
    '--history-bg': 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))'
  };

  function applyVars(vars) {
    for (const key in vars) {
      document.documentElement.style.setProperty(key, vars[key]);
    }
  }

  applyVars(lightVars); // start in day theme

  // Persistence helpers
  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save history', e);
    }
  }
  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) history = JSON.parse(raw);
    } catch (e) {
      console.warn('Could not load history', e);
      history = [];
    }
    refreshHistoryUI();
  }

  // Rendering & helpers
  function renderDisplay() { displayEl.value = expr || '0'; }

  function safeAppend(token) { expr += String(token); renderDisplay(); }

  function clearAll() { expr = ''; renderDisplay(); }

  function backspace() { if (!expr) return; expr = expr.slice(0, -1); renderDisplay(); }

  function pushHistory(e, r) {
    history.unshift({ expr: e, result: r });
    if (history.length > 30) history.pop();
    saveHistory();
    refreshHistoryUI();
  }

  function refreshHistoryUI() {
    historyList.innerHTML = '';
    history.forEach((item, i) => {
      const li = document.createElement('li');

      // reuse button (click to reuse result)
      const reuseBtn = document.createElement('button');
      reuseBtn.type = 'button';
      reuseBtn.className = 'reuse';
      reuseBtn.textContent = `${item.expr} = ${item.result}`;
      reuseBtn.title = 'Click to reuse';
      reuseBtn.addEventListener('click', () => {
        expr = String(item.result);
        renderDisplay();
      });

      // delete button for this entry
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'history-delete';
      delBtn.title = 'Delete entry';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        history.splice(i, 1);
        saveHistory();
        refreshHistoryUI();
      });

      li.appendChild(reuseBtn);
      li.appendChild(delBtn);
      historyList.appendChild(li);
    });
  }

  function formatResult(value) {
    if (typeof value === 'number' && isFinite(value)) {
      const abs = Math.abs(value);
      if ((abs !== 0 && (abs < 1e-6 || abs >= 1e12))) {
        return Number.parseFloat(value.toExponential(8)).toString();
      }
      return Number.parseFloat(value.toPrecision(12)).toString();
    }
    return String(value);
  }

  function applyPercentToLastNumber() {
    const match = expr.match(/(\d+(\.\d+)?)(?!.*\d)/);
    if (!match) return;
    const numStr = match[1];
    try {
      const value = math.evaluate(numStr) / 100;
      expr = expr.slice(0, -numStr.length) + String(value);
      renderDisplay();
    } catch {
      flashError('Error');
    }
  }

  function applySqrtToLastNumber() {
    const match = expr.match(/(\d+(\.\d+)?)(?!.*\d)/);
    if (!match) return;
    const numStr = match[1];
    const num = Number(numStr);
    if (isNaN(num) || num < 0) { flashError('Error'); return; }
    const value = Math.sqrt(num);
    expr = expr.slice(0, -numStr.length) + String(value);
    renderDisplay();
  }

  function flashError(msg = 'Error') {
    const original = displayEl.value;
    displayEl.value = msg;
    setTimeout(() => renderDisplay(), 900);
  }

  async function calculate() {
    if (!expr) return;
    try {
      const result = math.evaluate(expr);
      const formatted = formatResult(result);
      pushHistory(expr, formatted);
      expr = String(formatted);
      renderDisplay();
    } catch (err) {
      console.error('Calculation error:', err);
      flashError('Error');
    }
  }

  // Buttons
  buttons.forEach(btn => {
    const action = btn.dataset.action;
    const value = btn.dataset.value;
    btn.addEventListener('click', () => {
      if (action === 'clear') clearAll();
      else if (action === 'backspace') backspace();
      else if (action === 'calculate') calculate();
      else if (action === 'percent') applyPercentToLastNumber();
      else if (action === 'sqrt') applySqrtToLastNumber();
      else if (action === 'mod') safeAppend(' mod ');
      else if (value !== undefined) safeAppend(value);
    });
  });

  // Clear entire history
  clearHistoryBtn?.addEventListener('click', () => {
    if (!history.length) return;
    const ok = confirm('Clear all history? This cannot be undone.');
    if (!ok) return;
    history = [];
    saveHistory();
    refreshHistoryUI();
  });

  // Keyboard support
  window.addEventListener('keydown', (e) => {
    if (/^[0-9+\-*/().,^%]$/.test(e.key)) { e.preventDefault(); safeAppend(e.key); return; }
    if (e.key === 'Enter') { e.preventDefault(); calculate(); }
    else if (e.key === 'Backspace') { e.preventDefault(); backspace(); }
    else if (e.key === 'Escape') { e.preventDefault(); clearAll(); }
    else if (e.key === '%') { e.preventDefault(); applyPercentToLastNumber(); }
    else if (e.key.toLowerCase() === 'm') { e.preventDefault(); safeAppend(' mod '); }
  });

  // Copy result
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(displayEl.value);
      copyBtn.textContent = '✓';
      setTimeout(() => (copyBtn.textContent = '📋'), 900);
    } catch {
      copyBtn.textContent = '✕';
      setTimeout(() => (copyBtn.textContent = '📋'), 900);
    }
  });

  // Theme toggle
  themeToggle?.addEventListener('click', () => {
    const pressed = themeToggle.getAttribute('aria-pressed') === 'true';
    themeToggle.setAttribute('aria-pressed', String(!pressed));
    if (!pressed) {
      applyVars(darkVars);
      themeToggle.textContent = '☀️';
    } else {
      applyVars(lightVars);
      themeToggle.textContent = '🌙';
    }
  });

  // Initialize
  loadHistory();
  clearAll();
})();