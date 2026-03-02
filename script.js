// ─── Spilldata ────────────────────────────────────────────────────────────────

const PI_DIGITS = '31415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679';

const MODES = {
  pi: {
    title: 'π – Pi-sifrene',
    description: 'Lær sifrene i pi (3.14159…) i rekkefølge.',
    rules: 'Trykk på riktig neste siffer. Feil gir game over.',
    sequence: () => PI_DIGITS.split('').map(Number),
  },
  prime: {
    title: 'Prime – Primtall',
    description: 'Tast inn primtall i stigende rekkefølge.',
    rules: 'Start på 2. Feil tast gir game over.',
    sequence: () => {
      const primes = [];
      for (let n = 2; primes.length < 200; n++) {
        let ok = true;
        for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) { ok = false; break; }
        if (ok) primes.push(n);
      }
      return primes;
    },
  },
  fibonacci: {
    title: 'Fibonacci',
    description: 'Tast inn Fibonacci-tall i stigende rekkefølge.',
    rules: 'Start på 1. Feil tast gir game over.',
    sequence: () => {
      const fibs = [1, 1];
      while (fibs.length < 80) fibs.push(fibs[fibs.length - 1] + fibs[fibs.length - 2]);
      return fibs;
    },
  },
  pyramid: {
    title: 'Pyramid – Kvadrattall',
    description: 'Tast inn kvadrattall: 1, 4, 9, 16, 25 …',
    rules: 'Feil tast gir game over.',
    sequence: () => Array.from({ length: 100 }, (_, i) => (i + 1) ** 2),
  },
};

// ─── Tilstand ─────────────────────────────────────────────────────────────────

let mode = 'pi';
let seq = [];           // full sekvens av tall/sifre som strenger
let seqPos = 0;         // neste posisjon i seq
let inputBuf = '';      // hva brukeren har tastet så langt for gjeldende tall
let score = 1;
let highscores = {};    // { pi: 1, prime: 1, ... }
let timerOn = false;
let timerInterval = null;
let timeLeft = 3.0;
const TIME_LIMIT = 3.0;
let gameOver = false;

// ─── DOM-referanser ───────────────────────────────────────────────────────────

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

function getDisplayItems() {
  // Vis gjeldende og neste to tall
  return [seqPos, seqPos + 1, seqPos + 2]
    .map(i => (i < seq.length ? seq[i] : ''));
}

function renderSequence() {
  const items = getDisplayItems();
  elLines.forEach((el, i) => {
    if (i === 0) {
      // Gjeldende tall: vis hva som er tastet, skjul resten med understrek
      const target = items[0];
      const typed = inputBuf;
      const hiddenCount = target.length - typed.length;
      const placeholder = '_'.repeat(hiddenCount);
      el.innerHTML =
        `<span style="color:#6a7cff">${typed}</span>` +
        `<span style="color:#555b75">${placeholder}</span>`;
    } else {
      el.textContent = items[i] ? '?' .repeat(items[i].length) : '';
      el.style.color = '#555b75';
    }
  });
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
  // Siffer
  const digit = label;
  const target = seq[seqPos];

  // For flersifrede tall: bygg opp buffer
  inputBuf += digit;
  elInput.value = inputBuf;

  // Sjekk om bufferet matcher starten av target
  if (!target.startsWith(inputBuf)) {
    triggerWrong();
    return;
  }

  // Hvis bufferet er komplett
  if (inputBuf === target) {
    submitAnswer();
    return;
  }

  // Delvis riktig – fortsett
  resetTimer();
  renderSequence();
}

function submitAnswer() {
  const target = seq[seqPos];
  if (inputBuf !== target) {
    if (inputBuf === '') return; // ingenting tastet
    triggerWrong();
    return;
  }
  // Riktig!
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
  elStatus.textContent = `✗ Feil! Riktig var: ${seq[seqPos]}`;
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
      inputBuf = seq[seqPos]; // vis riktig svar
      triggerWrong();
      elStatus.textContent = `⏱ Tiden gikk ut! Riktig var: ${seq[seqPos - (gameOver ? 0 : 1)]}`;
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

// Modusfaner
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

// Restart
elRestart.addEventListener('click', startGame);

// Tidtaker-toggle
elTimerToggle.addEventListener('click', () => {
  timerOn = !timerOn;
  elTimerToggle.textContent = timerOn ? 'På' : 'Av';
  elTimerToggle.setAttribute('aria-pressed', timerOn);
  elTimerToggle.classList.toggle('active', timerOn);
  if (timerOn) startTimer(); else { stopTimer(); elTimer.textContent = '–'; }
});

// Regler-toggle
elRulesToggle.addEventListener('click', () => {
  const hidden = elRulesPanel.hidden;
  elRulesPanel.hidden = !hidden;
  elRulesToggle.setAttribute('aria-expanded', hidden);
});

// ─── Start ────────────────────────────────────────────────────────────────────

loadHighscores();
updateRulesPanel();
startGame();