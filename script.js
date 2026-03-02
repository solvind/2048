// ─── Spilldata ────────────────────────────────────────────────────────────────

const elScore      = document.getElementById('score');
const elHighscore  = document.getElementById('highscore');
const elTimer      = document.getElementById('timer');
const elTimerToggle= document.getElementById('timer-toggle');
const elStatus     = document.getElementById('status');
const elKeypad     = document.getElementById('keypad');
const elEntryWrap  = document.getElementById('entry-wrapper');
const elInput      = document.getElementById('entry-input');
const elRulesToggle= document.getElementById('rules-toggle');
const elRulesPanel = document.getElementById('rules-panel');
const elGameTitle  = document.getElementById('game-title');
const elGameDesc   = document.getElementById('game-description');
const elGameRules  = document.getElementById('game-rules');
const elRestart    = document.getElementById('restart');
const elLines      = [
  document.getElementById('sequence-line-1'),
  document.getElementById('sequence-line-2'),
  document.getElementById('sequence-line-3'),
];

// ─── Init ─────────────────────────────────────────────────────────────────────

function loadHighscores() {
  try {
    const saved = JSON.parse(localStorage.getItem('tallknuser_hs') || '{}');
    Object.keys(MODES).forEach(k => { highscores[k] = saved[k] || 1; });
  } catch { Object.keys(MODES).forEach(k => { highscores[k] = 1; }); }
}

function saveHighscores() {
  try { localStorage.setItem('tallknuser_hs', JSON.stringify(highscores)); } catch {}
}

function startGame() {
  gameOver = false;
  const modeData = MODES[mode];
  seq = modeData.sequence().map(String);
  seqPos = 0;
  inputBuf = '';
  score = 1;
  elScore.textContent = score;
  elHighscore.textContent = highscores[mode] || 1;
  elStatus.textContent = '';
  elStatus.style.color = '';
  elKeypad.classList.remove('disabled');
  elEntryWrap.hidden = false;
  elInput.value = '';
  stopTimer();
  if (timerOn) startTimer();
  renderSequence();
  buildKeypad();
}

// ─── Sekvensvisning ───────────────────────────────────────────────────────────

function renderSequence() {
  const sep = MODES[mode].separator;
  const answered = seq.slice(0, seqPos);
  const current = inputBuf || '_';

  let historyStr = answered.length === 0 ? '' : answered.join(sep) + sep;
  const fullStr = historyStr + current;

  const maxLen = 30;
  const display = fullStr.length > maxLen ? '…' + fullStr.slice(fullStr.length - maxLen) : fullStr;
  const inputStart = display.length - current.length;

  elLines[0].innerHTML =
    '<span style="color:#9ea3ba">' + display.slice(0, inputStart) + '</span>' +
    '<span style="color:#6a7cff;font-weight:bold">' + display.slice(inputStart) + '</span>';  

  elLines[1].textContent = '';
  elLines[2].textContent = '';
}

// ─── Tastatur ─────────────────────────────────────────────────────────────────

function buildKeypad() {
  elKeypad.innerHTML = '';
  const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','↵'];
  keys.forEach(label => {
    const btn = document.createElement('button');
    btn.className = 'key' + (label === '↵' ? ' enter-key' : '');
    btn.textContent = label;
    btn.setAttribute('type', 'button');
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      handleKey(label);
    });
    elKeypad.appendChild(btn);
  });
}

// ─── Inntasting ───────────────────────────────────────────────────────────────

function handleKey(label) {
  if (gameOver) return;
  if (label === '⌫') {
    inputBuf = inputBuf.slice(0, -1);
    elInput.value = inputBuf;
    renderSequence();
    return;
  }
  if (label === '↵') {
    submitAnswer();
    return;
  }
  const digit = label;
  const target = seq[seqPos];

  inputBuf += digit;
  elInput.value = inputBuf;

  if (!target.startsWith(inputBuf)) {
    triggerWrong();
    return;
  }

  if (inputBuf === target) {
    submitAnswer();
    return;
  }

  resetTimer();
  renderSequence();
}

function submitAnswer() {
  const target = seq[seqPos];
  if (inputBuf !== target) {
    if (inputBuf === '') return;
    triggerWrong();
    return;
  }
  seqPos++;
  score = seqPos + 1;
  elScore.textContent = score;
  if (score > (highscores[mode] || 1)) {
    highscores[mode] = score;
    elHighscore.textContent = score;
    saveHighscores();
  }
  inputBuf = '';
  elInput.value = '';
  elStatus.textContent = '';
  resetTimer();
  renderSequence();
}

function triggerWrong() {
  gameOver = true;
  stopTimer();
  elKeypad.classList.add('disabled');
  elStatus.textContent = '✗ Feil! Riktig var: ' + seq[seqPos];
  elStatus.style.color = '#ff6b6b';
  elInput.value = inputBuf;
}

// ─── Timer ────────────────────────────────────────────────────────────────────

function startTimer() {
  timeLeft = TIME_LIMIT;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 0.1);
    updateTimerDisplay();
    if (timeLeft <= 0) {
      stopTimer();
      inputBuf = seq[seqPos];
      triggerWrong();
      elStatus.textContent = '⏱ Tiden gikk ut! Riktig var: ' + seq[seqPos - (gameOver ? 0 : 1)];
    }
  }, 100);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  if (!timerOn) return;
  stopTimer();
  startTimer();
}

function updateTimerDisplay() {
  elTimer.textContent = timeLeft.toFixed(1) + 's';
}

// ─── Regler-panel ─────────────────────────────────────────────────────────────

function updateRulesPanel() {
  const m = MODES[mode];
  elGameTitle.textContent = m.title;
  elGameDesc.textContent = m.description;
  elGameRules.textContent = m.rules;
}

// ─── Event listeners ──────────────────────────────────────────────────────────

document.querySelectorAll('.mode-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-tab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    mode = btn.dataset.mode;
    updateRulesPanel();
    startGame();
  });
});

elRestart.addEventListener('click', startGame);

elTimerToggle.addEventListener('click', () => {
  timerOn = !timerOn;
  elTimerToggle.textContent = timerOn ? 'På' : 'Av';
  elTimerToggle.setAttribute('aria-pressed', timerOn);
  elTimerToggle.classList.toggle('active', timerOn);
  if (timerOn) startTimer(); else { stopTimer(); elTimer.textContent = '–'; }
});

elRulesToggle.addEventListener('click', () => {
  const hidden = elRulesPanel.hidden;
  elRulesPanel.hidden = !hidden;
  elRulesToggle.setAttribute('aria-expanded', hidden);
});

// ─── Start ────────────────────────────────────────────────────────────────────

loadHighscores();
updateRulesPanel();
startGame();
