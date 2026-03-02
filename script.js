// ─── Spilldata ────────────────────────────────────────────────────────────────

const PI_DIGITS = '3141592653589793238462643383279502884197169399375105820974944592307816406286208998628034825342117067982148086513282306647093844609550582231725359408128481117450284102701938521105559644622948954930381964428810975665933446128475648233786783165271201909145648566923460348610454326648213393607260249141273724587006606315588174881520920962829254091715364367892590360011330530548820466521384146951941511609433057270365759591953092186117381932611793105118548074462379962749567351885752724891227938183011949129833673362440656643086021394946395224737190702179860943702770539217176293176752384674818467669405132000568127145263560827785771342757789609173637178721468440901224953430146549585371050792279689258923542019956112129021960864034418159813629774771309960518707211349999998372978049951059731732816096318595024459455346908302642522308253344685035261931188171010003137838752886587533208381420617177669147303598253490428755468731159562863882353787593751957781857780532171226806613001927876611195909216420199';

const MODES = {
  pi: {
    title: 'π – Pi-sifrene',
    description: 'Lær sifrene i pi (3.14159…) i rekkefølge.',
    rules: 'Trykk på riktig neste siffer. Feil gir game over.',
    sequence: () => PI_DIGITS.split('').map(Number),
    separator: '',
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
    separator: ' - ',
  },
  fibonacci: {
    title: 'Fibonacci',
    description: 'Tast inn Fibonacci-tall i stigende rekkefølge.',
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
    description: 'Tast inn trekanttall: 1, 3, 6, 10, 15 …',
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
    btn.addEventListener('click', () => { handleKey(label); });
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
  if (label === '↵') { submitAnswer(); return; }
  const target = seq[seqPos];
  inputBuf += label;
  elInput.value = inputBuf;
  if (!target.startsWith(inputBuf)) { triggerWrong(); return; }
  if (inputBuf === target) { submitAnswer(); return; }
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
      elStatus.textContent = '⏱ Tiden gikk ut! Riktig var: ' + seq[seqPos];
    }
  }, 100);
}

function stopTimer() { clearInterval(timerInterval); timerInterval = null; }

function resetTimer() { if (!timerOn) return; stopTimer(); startTimer(); }

function updateTimerDisplay() { elTimer.textContent = timeLeft.toFixed(1) + 's'; }

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
