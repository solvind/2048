// ─── Spilldata ────────────────────────────────────────────────────────────────

const PI_DIGITS = '314159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196442881097566593344612847564823378678316527120190914564856692346034861045432664821339360726024914127372458700660631558817488152092096282925409171536436789259036001133053054882046652138414695194151160943305727036575959195309218611738193261179310511854807446237996274956735188575272489122793818301194912983367336244065664308602139494639522473719070217986094370277053921717629317675238467481846766940513200056812714526356082778577134275778960917363717872146844090122495343014654958537105079227968925892354201995611212902196086403441815981362977477130996051870721134999999837297804995105973173281609631859502445945534690830264252230825334468503526193118817101000313783875288658753320838142061717766914730359825349042875546873115956286388235378759375195778185778053217122680661300192787661119590921642019';

const MODES = {
  pi: {
    title: 'π – Pi-sifrene',
    description: 'Hvor mange siffer av pi klarer du? Og tørr du på tid?',
    rules: 'Trykk på riktig neste siffer. Feil gir game over.',
    sequence: () => PI_DIGITS.split('').map(Number),
    separator: '',
    prefix: '3.',
  },
  prime: {
    title: 'Prime – Primtall',
    description: 'Orimtall i rekkefølge.',
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
    separator: ' - ',
  },
  fibonacci: {
    title: 'Fibonacci',
    description: 'Fibonacci-tall!',
    rules: 'Start på 1. Feil tast gir game over.',
    sequence: () => {
      const fibs = [1, 1];
      while (fibs.length < 200) fibs.push(fibs[fibs.length - 1] + fibs[fibs.length - 2]);
      return fibs;
    },
    separator: ' - ',
  },
  pyramid: {
    title: 'Pyramid – Trekanttall',
    description: 'Kan du trekanttallene?',
    rules: 'Feil tast gir game over.',
    sequence: () => Array.from({ length: 200 }, (_, i) => (i + 1) * (i + 2) / 2),
    separator: ' - ',
  },
};

// ─── Tilstand ─────────────────────────────────────────────────────────────────

let mode = 'pi';
let seq = [];
let seqPos = 0;
let inputBuf = '';
let score = 1;
let highscores = {};
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

function renderSequence() {
  const modeData = MODES[mode];
  const sep = modeData.separator;
  const prefix = modeData.prefix || '';
  const answered = seq.slice(0, seqPos);
  const current = inputBuf || '_';

  let historyStr = answered.length === 0 ? '' : answered.join(sep) + sep;
  const fullStr = prefix + historyStr + current;

  const maxLen = 30;
  const display = fullStr.length > maxLen ? '…' + fullStr.slice(fullStr.length - maxLen) : fullStr;

  // The answered part includes the prefix at the start (only when not truncated)
  const answeredWithPrefix = prefix + historyStr;
  const answeredDisplay = answeredWithPrefix.length > maxLen
    ? '…' + answeredWithPrefix.slice(answeredWithPrefix.length - maxLen)
    : answeredWithPrefix;
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
