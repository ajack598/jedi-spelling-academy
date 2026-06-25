/*
  Main game logic for Jedi Spelling Academy.
  Depends on src/words.js being loaded first.
*/

// ═══════════════════════════════════════════
// WORD DATA
// ═══════════════════════════════════════════
// Word list is loaded from src/words.js.

// ═══════════════════════════════════════════
// RANKS
// ═══════════════════════════════════════════
const RANKS = [
  { min: 0,  label: 'YOUNGLING',      badge: 'YOUNGLING' },
  { min: 3,  label: 'JEDI INITIATE',  badge: 'INITIATE' },
  { min: 7,  label: 'PADAWAN',        badge: 'PADAWAN' },
  { min: 12, label: 'JEDI KNIGHT',    badge: 'KNIGHT' },
  { min: 20, label: 'JEDI MASTER',    badge: 'MASTER' },
  { min: 30, label: 'JEDI GRAND MASTER', badge: 'GRAND MASTER' },
];

function getRank(streak) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (streak >= r.min) rank = r; }
  return rank;
}

const MESSAGES = {
  correct: [
    "The Force is strong with you! ⚡",
    "Excellent, Padawan! Master Yoda would be proud.",
    "Your lightsaber glows bright! Keep it up.",
    "Impressive. Most impressive.",
    "The Jedi Archives smile upon you!",
    "You strike true, young one!",
    "That's the way of the Force!",
  ],
  wrong: [
    "Even Skywalker fell before he rose again. Try again!",
    "The dark side of spelling claimed you — this time.",
    "Obi-Wan would say: trust your training next time.",
    "A Jedi does not give up. Study and return.",
    "The Force was disrupted — your streak has ended.",
  ]
};

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let playerName = '';
let streak = 0;
let bestStreak = 0;
let queue = [];
let currentWord = null;
let answered = false;
let wordNumber = 0;

// ═══════════════════════════════════════════
// LEADERBOARD (localStorage)
// ═══════════════════════════════════════════
const LB_KEY = 'jedi_spelling_lb';

function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; } catch { return []; }
}

function saveToLeaderboard(name, score) {
  if (score === 0) return;
  const lb = loadLeaderboard();
  lb.push({ name, score, date: new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'2-digit' }), time: new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) });
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem(LB_KEY, JSON.stringify(lb.slice(0, 20)));
}

function getBestForPlayer(name) {
  const lb = loadLeaderboard();
  const entries = lb.filter(e => e.name.toLowerCase() === name.toLowerCase());
  return entries.length ? Math.max(...entries.map(e => e.score)) : 0;
}

function clearLeaderboard() {
  if (confirm('Purge the Jedi Archives? This cannot be undone.')) {
    localStorage.removeItem(LB_KEY);
    renderLeaderboard(document.getElementById('lb-list'));
  }
}

// ═══════════════════════════════════════════
// STARS
// ═══════════════════════════════════════════
function makeStars() {
  const container = document.getElementById('stars');
  for (let i = 0; i < 120; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    s.style.cssText = `
      width:${size}px; height:${size}px;
      top:${Math.random()*100}%;
      left:${Math.random()*100}%;
      --dur:${(Math.random()*3+1.5).toFixed(1)}s;
      animation-delay:${(Math.random()*4).toFixed(1)}s;
    `;
    container.appendChild(s);
  }
}

// ═══════════════════════════════════════════
// HINT GENERATION
// ═══════════════════════════════════════════
function generateHint(word) {
  const w = word.toUpperCase();
  const len = w.length;
  // Reveal 2 or 3 letters depending on length
  const revealCount = len <= 5 ? 2 : len <= 9 ? 2 : 3;
  
  // Always reveal first letter; pick remaining from non-adjacent positions
  const revealed = new Set([0]);
  
  // Pick random interior positions (not first or last)
  const interior = [];
  for (let i = 1; i < len - 1; i++) {
    if (w[i] !== ' ') interior.push(i);
  }
  // Shuffle interior
  for (let i = interior.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [interior[i], interior[j]] = [interior[j], interior[i]];
  }
  // Add extra revealed letters (not adjacent to already revealed)
  for (const idx of interior) {
    if (revealed.size >= revealCount) break;
    // Check not adjacent to existing revealed
    const tooClose = [...revealed].some(r => Math.abs(r - idx) <= 1);
    if (!tooClose) revealed.add(idx);
  }
  // Fallback: if we still don't have enough, add from interior
  for (const idx of interior) {
    if (revealed.size >= revealCount) break;
    revealed.add(idx);
  }

  return { revealed, word: w };
}

function renderHint(word) {
  const { revealed, word: w } = generateHint(word);
  const container = document.getElementById('hint-display');
  container.innerHTML = '';
  for (let i = 0; i < w.length; i++) {
    const span = document.createElement('span');
    if (w[i] === ' ') {
      span.className = 'hint-char space-char';
      span.textContent = ' ';
    } else if (revealed.has(i)) {
      span.className = 'hint-char';
      span.textContent = w[i];
    } else {
      span.className = 'hint-char blank';
      span.textContent = '_';
    }
    container.appendChild(span);
  }
}

// ═══════════════════════════════════════════
// SABER PIPS
// ═══════════════════════════════════════════
function updateSaberPips() {
  const track = document.getElementById('saber-track');
  track.innerHTML = '';
  const show = Math.min(streak + 1, 10);
  for (let i = 0; i < show; i++) {
    const pip = document.createElement('div');
    const lit = i < streak;
    pip.className = 'saber-pip' + (lit ? (streak >= 20 ? ' lit fire' : ' lit') : '');
    track.appendChild(pip);
  }
}

// ═══════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ═══════════════════════════════════════════
// GAME FLOW
// ═══════════════════════════════════════════
function startGame() {
  const nameInput = document.getElementById('player-name-input');
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); nameInput.style.borderColor = 'var(--red)'; return; }
  playerName = name;
  bestStreak = getBestForPlayer(name);
  streak = 0;
  wordNumber = 0;
  queue = shuffleArray([...WORDS]);
  document.getElementById('hud-name').textContent = playerName.toUpperCase();
  document.getElementById('hud-best').textContent = bestStreak;
  showScreen('screen-game');
  loadNextWord();
}

function restartGame() {
  streak = 0;
  wordNumber = 0;
  queue = shuffleArray([...WORDS]);
  bestStreak = getBestForPlayer(playerName);
  document.getElementById('hud-best').textContent = bestStreak;
  showScreen('screen-game');
  loadNextWord();
}

function loadNextWord() {
  if (queue.length === 0) queue = shuffleArray([...WORDS]);
  currentWord = queue.pop();
  wordNumber++;
  answered = false;

  document.getElementById('word-count').textContent = `Word ${wordNumber}`;
  document.getElementById('definition-text').textContent = currentWord.definition;

  renderHint(currentWord.word);

  const input = document.getElementById('answer-input');
  input.value = '';
  input.className = '';
  input.disabled = false;
  input.focus();

  document.getElementById('submit-btn').disabled = false;
  document.getElementById('feedback').className = 'feedback';
  document.getElementById('feedback').innerHTML = '';
  document.getElementById('example-area').className = 'example-area';
  document.getElementById('next-area').style.display = 'none';
  document.getElementById('record-banner').classList.remove('show');

  updateHUD();
  updateSaberPips();
}

function updateHUD() {
  document.getElementById('hud-streak').textContent = streak;
  document.getElementById('hud-best').textContent = Math.max(bestStreak, streak);
  const rank = getRank(streak);
  document.getElementById('rank-title').textContent = rank.label;
  document.getElementById('rank-badge').textContent = rank.badge;
}

function submitAnswer() {
  if (answered) return;
  const input = document.getElementById('answer-input');
  const userAnswer = input.value.trim().toLowerCase();
  const correct = currentWord.word.toLowerCase();
  if (!userAnswer) { input.focus(); return; }

  answered = true;
  input.disabled = true;
  document.getElementById('submit-btn').disabled = true;

  const isCorrect = userAnswer === correct;
  const feedback = document.getElementById('feedback');
  const example = document.getElementById('example-area');

  if (isCorrect) {
    streak++;
    input.className = 'correct';
    feedback.className = 'feedback correct-fb show';
    const msg = MESSAGES.correct[Math.floor(Math.random() * MESSAGES.correct.length)];
    feedback.innerHTML = `✅ ${msg}`;

    // Check for new personal best
    if (streak > bestStreak) {
      bestStreak = streak;
      document.getElementById('record-banner').classList.add('show');
    }

    updateHUD();
    updateSaberPips();
    example.className = 'example-area show';
    example.textContent = `"${currentWord.example}"`;
    document.getElementById('next-area').style.display = 'flex';
  } else {
    input.className = 'wrong';
    feedback.className = 'feedback wrong-fb show';
    const msg = MESSAGES.wrong[Math.floor(Math.random() * MESSAGES.wrong.length)];
    feedback.innerHTML = `❌ ${msg}<br>The word was: <span class="answer-reveal">${currentWord.word.toUpperCase()}</span>`;
    example.className = 'example-area show';
    example.textContent = `"${currentWord.example}"`;

    // Save streak to leaderboard
    saveToLeaderboard(playerName, streak);

    setTimeout(() => showGameOver(streak, currentWord.word), 1600);
  }
}

function nextWord() {
  loadNextWord();
}

function showGameOver(finalStreak, wrongWord) {
  document.getElementById('go-score').textContent = finalStreak;
  const rank = getRank(finalStreak);

  let message = '';
  if (finalStreak === 0) message = "You were struck down before you could begin. Rise, Padawan!";
  else if (finalStreak < 5)  message = `${rank.label} — a promising start. The Jedi path is long.`;
  else if (finalStreak < 10) message = `${rank.label} — your training serves you well.`;
  else if (finalStreak < 20) message = `${rank.label} — the Council takes notice of your skill!`;
  else message = `${rank.label} — your mastery of language rivals the great Jedi of legend!`;

  document.getElementById('go-message').textContent = message;
  document.getElementById('go-wrong').innerHTML = `You were caught out by: <span>${wrongWord.toUpperCase()}</span>`;
  if (finalStreak === 0) document.getElementById('go-wrong').style.display = 'none';
  else document.getElementById('go-wrong').style.display = 'block';

  // Mini leaderboard in game over
  const goLb = document.getElementById('go-leaderboard');
  goLb.innerHTML = '';
  const lb = loadLeaderboard();
  if (lb.length) {
    const panel = document.createElement('div');
    panel.className = 'leaderboard-panel';
    panel.style.marginTop = '16px';
    const title = document.createElement('div');
    title.className = 'lb-title';
    title.style.marginBottom = '12px';
    title.textContent = '⚡ Jedi Archives';
    panel.appendChild(title);
    const list = document.createElement('ul');
    list.className = 'lb-list';
    renderLeaderboard(list, 5);
    panel.appendChild(list);
    goLb.appendChild(panel);
  }

  showScreen('screen-gameover');
}

function showLeaderboard() {
  renderLeaderboard(document.getElementById('lb-list'));
  showScreen('screen-leaderboard');
}

function renderLeaderboard(listEl, maxRows) {
  const lb = loadLeaderboard();
  listEl.innerHTML = '';
  if (!lb.length) {
    listEl.innerHTML = '<li class="lb-empty">The Archives are empty — be the first to set a record.</li>';
    return;
  }
  const rows = maxRows ? lb.slice(0, maxRows) : lb;
  rows.forEach((entry, i) => {
    const rankClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const li = document.createElement('li');
    li.className = 'lb-row';
    li.innerHTML = `
      <span class="lb-rank ${rankClass}">${i + 1}</span>
      <span class="lb-name">${escHtml(entry.name)}</span>
      <span class="lb-streak">${entry.score}</span>
      <span class="lb-date">${entry.date} ${entry.time || ''}</span>
    `;
    listEl.appendChild(li);
  });
}

// ═══════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const nameScreen = document.getElementById('screen-name');
    const gameScreen = document.getElementById('screen-game');
    if (nameScreen.classList.contains('active')) {
      startGame();
    } else if (gameScreen.classList.contains('active')) {
      if (!answered) submitAnswer();
      else if (document.getElementById('next-area').style.display !== 'none') nextWord();
    }
  }
});

document.getElementById('player-name-input').addEventListener('input', function() {
  this.style.borderColor = '';
});

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
makeStars();
document.getElementById('player-name-input').focus();
