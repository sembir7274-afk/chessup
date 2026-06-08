// ===== App logic =====
const GLYPH = {
  K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙',
  k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟'
};

// ===== User & progress =====
let currentUser = JSON.parse(localStorage.getItem('chessupUser') || 'null');
let progress = loadProgress();

function progressKey() {
  return currentUser ? `chessupProgress_${currentUser.sub}` : 'chessupProgress';
}
function loadProgress() {
  const key = currentUser ? `chessupProgress_${currentUser.sub}` : 'chessupProgress';
  return JSON.parse(localStorage.getItem(key) || '{"completed":[]}');
}
function saveProgress() {
  localStorage.setItem(progressKey(), JSON.stringify(progress));
}
let state = null;       // engine state for current lesson
let currentLesson = null;
let selected = null;
let legalForSelected = [];
let lessonDone = false;
let isAIThinking = false;

// ====== MAP RENDERING ======
function renderMap() {
  const container = document.getElementById('unitsContainer');
  container.innerHTML = '';
  let globalIdx = 0;
  const completedSet = new Set(progress.completed);

  UNITS.forEach((unit, uIdx) => {
    const unitEl = document.createElement('div');
    unitEl.className = 'unit';
    unitEl.style.animationDelay = (uIdx * 0.1) + 's';

    const banner = document.createElement('div');
    banner.className = 'unit-banner';
    banner.style.setProperty('--unit-grad', unit.grad);
    banner.innerHTML = `
      <div class="unit-emoji" style="background:${unit.grad}">${unit.emoji}</div>
      <div class="unit-info">
        <h2>יחידה ${uIdx+1}: ${unit.title}</h2>
        <p>${unit.desc}</p>
      </div>
    `;
    unitEl.appendChild(banner);

    const path = document.createElement('div');
    path.className = 'path';

    unit.lessons.forEach((lesson, lIdx) => {
      const gIdx = globalIdx++;
      const isDone = completedSet.has(gIdx);
      const isAvailable = gIdx === 0 || completedSet.has(gIdx - 1);

      const item = document.createElement('div');
      item.className = 'path-item';
      item.style.animationDelay = (uIdx * 0.1 + lIdx * 0.05) + 's';

      const node = document.createElement('button');
      node.className = 'node';
      node.style.setProperty('--unit-grad', unit.grad);
      node.style.animationDelay = (lIdx * 0.08) + 's';
      if (isDone) node.classList.add('completed');
      else if (isAvailable) node.classList.add('available');
      else node.classList.add('locked');

      node.innerHTML = isDone ? '✓' : (lesson.icon || '★');
      if (!node.classList.contains('locked')) {
        node.addEventListener('click', () => openLesson(gIdx));
      }
      item.appendChild(node);

      const label = document.createElement('div');
      label.className = 'node-label';
      label.textContent = lesson.title;
      item.appendChild(label);
      path.appendChild(item);
    });

    unitEl.appendChild(path);
    container.appendChild(unitEl);
  });

  // progress bar
  const total = FLAT_LESSONS.length;
  const done = progress.completed.length;
  document.getElementById('progressTotal').textContent = total;
  document.getElementById('progressDone').textContent = done;
  document.getElementById('streakCount').textContent = done;
  setTimeout(() => {
    document.getElementById('progressFill').style.width = (done / total * 100) + '%';
  }, 100);
}

// ====== OPEN LESSON ======
function openLesson(globalIdx) {
  currentLesson = FLAT_LESSONS[globalIdx];
  currentLesson._userMoves = 0;
  currentLesson._capturedValue = 0;
  lessonDone = false;
  selected = null;
  legalForSelected = [];

  // Build engine state from lesson board
  state = ChessEngine.newState();
  state.board = currentLesson.board.map(r => r.slice());
  state.turn = currentLesson.turn || 'w';
  state.history = [];
  state.castling = { wK: true, wQ: true, bK: true, bQ: true };
  state.enPassant = currentLesson.enPassant || null;
  state.captured = { w: [], b: [] };

  document.getElementById('mapScreen').classList.remove('active');
  document.getElementById('lessonScreen').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });

  document.getElementById('lessonIcon').textContent = currentLesson.icon || '🎯';
  document.getElementById('lessonTitle').textContent = currentLesson.title;
  document.getElementById('lessonDesc').textContent = currentLesson.desc;
  document.getElementById('lessonGoal').textContent = '🎯 ' + currentLesson.goal;
  document.getElementById('lessonFeedback').textContent = '';
  document.getElementById('lessonFeedback').className = 'lesson-feedback';
  document.getElementById('boardHint').textContent = '';
  document.getElementById('lessonStepNum').textContent = `${globalIdx+1} / ${FLAT_LESSONS.length}`;
  document.getElementById('lessonProgressFill').style.width = ((globalIdx+1) / FLAT_LESSONS.length * 100) + '%';

  // Set next button state
  const nextBtn = document.getElementById('nextBtn');
  if (currentLesson.type === 'info') {
    nextBtn.disabled = false;
    nextBtn.textContent = 'הבא ←';
    lessonDone = true;
  } else {
    nextBtn.disabled = true;
    nextBtn.textContent = 'השלם את השלב';
  }

  renderBoard();
}

// ====== BOARD ======
function renderBoard() {
  const boardEl = document.getElementById('lessonBoard');
  boardEl.innerHTML = '';
  const lastMove = state.history[state.history.length - 1];
  const checkPos = ChessEngine.inCheck(state, state.turn) ? findKing(state.turn) : null;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'sq ' + ((r+c) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.r = r;
      sq.dataset.c = c;

      const piece = state.board[r][c];
      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece ' + (ChessEngine.isWhite(piece) ? 'w' : 'b');
        span.textContent = GLYPH[piece];
        sq.appendChild(span);
      }

      if (selected && selected[0] === r && selected[1] === c) sq.classList.add('selected');
      if (lastMove && (
          (lastMove.from[0] === r && lastMove.from[1] === c) ||
          (lastMove.to[0] === r && lastMove.to[1] === c))) {
        sq.classList.add('lastmove');
      }
      if (checkPos && checkPos[0] === r && checkPos[1] === c) sq.classList.add('in-check');

      if (selected) {
        const m = legalForSelected.find(x => x.r === r && x.c === c);
        if (m) sq.classList.add(m.capture || m.enPassant ? 'capture-ring' : 'move-dot');
      }

      sq.addEventListener('click', () => handleClick(r, c));
      boardEl.appendChild(sq);
    }
  }

  // dynamic instruction under the board
  const hintEl = document.getElementById('boardHint');
  if (hintEl) {
    if (isAIThinking) {
      hintEl.textContent = '🤔 המחשב חושב...';
    } else if (lessonDone && currentLesson && currentLesson.type !== 'play') {
      hintEl.textContent = '✓ כל הכבוד! לחץ "הבא" להמשך';
    } else if (selected) {
      hintEl.textContent = legalForSelected.length
        ? '🟢 לחץ על משבצת ירוקה כדי להזיז'
        : '⚠️ לכלי זה אין מהלכים — בחר כלי אחר';
    } else if (currentLesson) {
      hintEl.textContent = buildHint();
    }
  }
}

function buildHint() {
  if (currentLesson.type === 'info') return 'התבונן בלוח ולחץ "הבא" ←';
  const side = state.turn === 'b' ? 'שחור' : 'לבן';
  if (currentLesson.type === 'goal' && currentLesson.objective) {
    const obj = currentLesson.objective;
    const used = currentLesson._userMoves || 0;
    const movesPart = obj.maxMoves ? ` • מהלכים: ${used}/${obj.maxMoves}` : '';
    if (obj.type === 'noPiece') {
      let n = 0;
      for (let r=0;r<8;r++) for (let c=0;c<8;c++) if (state.board[r][c] === obj.piece) n++;
      const names = {p:'חיילים',n:'פרשים',b:'רצים',r:'צריחים',q:'מלכות'};
      return `🎯 נשארו ${n} ${names[obj.piece] || 'כלים'}${movesPart}`;
    }
    if (obj.type === 'survive') {
      const left = obj.moves - used;
      return `⏱️ עוד ${left} מהלכים לשרוד`;
    }
    if (obj.type === 'pieceAt') {
      return `🎯 הגע ליעד${movesPart}`;
    }
    if (obj.type === 'allOnRow') {
      return `👑 הכתר חייל${movesPart}`;
    }
    if (obj.type === 'checkmate') {
      return `♚ עשה מט${movesPart}`;
    }
    if (obj.type === 'captureValue') {
      const cur = currentLesson._capturedValue || 0;
      return `💎 ערך שנתפס: ${cur}/${obj.value}${movesPart}`;
    }
  }
  return `👆 לחץ על כלי ${side}`;
}

function findKing(color) {
  const t = color === 'w' ? 'K' : 'k';
  for (let r=0; r<8; r++) for (let c=0; c<8; c++)
    if (state.board[r][c] === t) return [r, c];
  return null;
}

// ====== CLICK HANDLING ======
function handleClick(r, c) {
  if (lessonDone && currentLesson.type !== 'play') return;
  if (isAIThinking) return;

  const piece = state.board[r][c];

  if (selected) {
    const move = legalForSelected.find(m => m.r === r && m.c === c);
    if (move) {
      makeMove({ from: selected, to: [r, c], flags: move });
      return;
    }
    if (piece && ChessEngine.colorOf(piece) === state.turn) {
      selected = [r, c];
      legalForSelected = ChessEngine.legalMoves(state, r, c);
      renderBoard();
      return;
    }
    selected = null;
    legalForSelected = [];
    renderBoard();
    return;
  }

  if (piece && ChessEngine.colorOf(piece) === state.turn) {
    selected = [r, c];
    legalForSelected = ChessEngine.legalMoves(state, r, c);
    renderBoard();
  }
}

function makeMove(move) {
  if (move.flags?.promo) move.promo = 'Q';
  const beforePiece = state.board[move.from[0]][move.from[1]];
  const capturedSquare = state.board[move.to[0]][move.to[1]];
  ChessEngine.applyMove(state, move);
  selected = null;
  legalForSelected = [];

  // Track captured material value
  if (currentLesson.type === 'goal' && capturedSquare) {
    const VALUES = { P:1, N:3, B:3, R:5, Q:9, K:0 };
    currentLesson._capturedValue = (currentLesson._capturedValue || 0)
      + (VALUES[capturedSquare.toUpperCase()] || 0);
  }

  renderBoard();

  // ===== PLAY type: full game vs AI =====
  if (currentLesson.type === 'play') {
    const status = ChessEngine.gameStatus(state);
    if (status.over) { handlePlayOver(status); return; }
    playAIMove(() => {
      const s2 = ChessEngine.gameStatus(state);
      if (s2.over) handlePlayOver(s2);
    });
    return;
  }

  // ===== GOAL type: keep playing until objective achieved =====
  if (currentLesson.type === 'goal') {
    if (!currentLesson._userMoves) currentLesson._userMoves = 0;
    currentLesson._userMoves++;

    // Check objective immediately after user move
    if (checkObjective()) {
      showFeedback('success', '🏆 הצלחת! יעד הושג!');
      lessonComplete();
      return;
    }

    // Move limit check
    const obj = currentLesson.objective;
    if (obj?.maxMoves && currentLesson._userMoves >= obj.maxMoves && !checkObjective()) {
      showFeedback('error', `❌ עברת את מגבלת ${obj.maxMoves} המהלכים. נסה שוב!`);
      setTimeout(() => resetLesson(), 1600);
      return;
    }

    // Check game over (mate/stalemate)
    const status = ChessEngine.gameStatus(state);
    if (status.over) {
      if (currentLesson.objective?.type === 'checkmate' && status.result === 'w') {
        showFeedback('success', '🏆 מט מושלם!');
        lessonComplete();
      } else if (status.result === 'b') {
        showFeedback('error', '❌ הפסדת! נסה שוב.');
        setTimeout(() => resetLesson(), 1500);
      } else {
        showFeedback('info', '⚖️ תיקו - נסה אחרת.');
        setTimeout(() => resetLesson(), 1500);
      }
      return;
    }

    // Survive objective check
    if (currentLesson.objective?.type === 'survive' &&
        currentLesson._userMoves >= currentLesson.objective.moves) {
      showFeedback('success', '🏆 שרדת!');
      lessonComplete();
      return;
    }

    // No AI opponent: flip turn back so user keeps playing as white
    if (!currentLesson.aiOpponent) {
      state.turn = currentLesson.turn || 'w';
      renderBoard();
      return;
    }

    // Let AI move (if opponent enabled)
    if (currentLesson.aiOpponent) {
      playAIMove(() => {
        // After AI move, re-check objective (e.g., survive: AI may capture)
        const s2 = ChessEngine.gameStatus(state);
        if (s2.over) {
          if (s2.result === 'b') {
            showFeedback('error', '❌ הפסדת. נסה שוב.');
            setTimeout(() => resetLesson(), 1500);
          } else if (s2.result === 'draw') {
            showFeedback('info', '⚖️ תיקו.');
            setTimeout(() => resetLesson(), 1500);
          }
          return;
        }
        // Check if our piece got captured for objectives that need our piece
        if (currentLesson.objective?.type === 'pieceAt' ||
            currentLesson.objective?.type === 'allOnRow') {
          if (!ourPieceStillAlive()) {
            showFeedback('error', '❌ איבדת את הכלי! נסה שוב.');
            setTimeout(() => resetLesson(), 1500);
          }
        }
      });
    }
    return;
  }

  // ===== MOVE / CAPTURE / MATE types: single move validation =====
  const ok = validateMove(beforePiece, move);
  if (ok) {
    showFeedback('success', '✓ מעולה! עשית את זה!');
    lessonComplete();
  } else {
    showFeedback('error', '✗ זה לא המהלך הנכון. נסה שוב!');
    setTimeout(() => resetLesson(), 1200);
  }
}

function playAIMove(after) {
  isAIThinking = true;
  renderBoard();
  setTimeout(() => {
    const aiMove = ChessEngine.bestMove(state, currentLesson.aiDepth || 1);
    if (aiMove) {
      if (aiMove.flags?.promo) aiMove.promo = 'Q';
      ChessEngine.applyMove(state, aiMove);
    }
    isAIThinking = false;
    renderBoard();
    if (after) after();
  }, 500);
}

function checkObjective() {
  const obj = currentLesson.objective;
  if (!obj) return false;

  if (obj.type === 'noPiece') {
    for (let r=0; r<8; r++) for (let c=0; c<8; c++)
      if (state.board[r][c] === obj.piece) return false;
    return true;
  }
  if (obj.type === 'pieceAt') {
    return state.board[obj.square[0]][obj.square[1]] === obj.piece;
  }
  if (obj.type === 'allOnRow') {
    for (let c=0; c<8; c++)
      if (state.board[obj.row][c] === obj.piece) return true;
    return false;
  }
  if (obj.type === 'checkmate') {
    const status = ChessEngine.gameStatus(state);
    return status.over && status.result === 'w';
  }
  if (obj.type === 'survive') {
    return false; // handled separately by move counter
  }
  if (obj.type === 'captureValue') {
    return (currentLesson._capturedValue || 0) >= obj.value;
  }
  return false;
}

function ourPieceStillAlive() {
  const obj = currentLesson.objective;
  if (!obj || !obj.piece) return true;
  const p = obj.piece.toUpperCase();
  for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
    const sq = state.board[r][c];
    if (sq === p) return true;
    // For promotion goals (target piece = Q), an unpromoted pawn still counts
    if (p === 'Q' && sq === 'P') return true;
  }
  return false;
}

function validateMove(piece, move) {
  const v = currentLesson.validate;

  // For 'mate' type with no specific validate - check for check or mate (lenient)
  if (currentLesson.type === 'mate' && !v) {
    const status = ChessEngine.gameStatus(state);
    if (status.over && status.result === 'w') return true;
    // Also accept if delivered check
    return ChessEngine.inCheck(state, state.turn);
  }

  // For 'capture' type with no validate - check that capture happened
  if (currentLesson.type === 'capture' && !v) {
    return !!move.flags?.capture || !!move.flags?.enPassant;
  }

  if (!v) return true;

  // Check from piece
  if (v.fromPiece && piece.toUpperCase() !== v.fromPiece) return false;

  // Check from square
  if (v.fromSquare && (v.fromSquare[0] !== move.from[0] || v.fromSquare[1] !== move.from[1])) return false;

  // Check destination
  if (v.toSquares) {
    const matched = v.toSquares.some(([r,c]) => r === move.to[0] && c === move.to[1]);
    if (!matched) return false;
  }

  // Check destination row
  if (v.toRow !== undefined && move.to[0] !== v.toRow) return false;

  return true;
}

function handlePlayOver(status) {
  if (status.result === 'w') {
    showFeedback('success', '🏆 ניצחת! מט!');
    lessonComplete();
  } else if (status.result === 'b') {
    showFeedback('error', '❌ הפסדת. נסה שוב!');
    setTimeout(() => resetLesson(), 1500);
  } else {
    showFeedback('info', '🤝 תיקו. שווה ניסיון נוסף!');
    setTimeout(() => resetLesson(), 1500);
  }
}

function showFeedback(type, msg) {
  const el = document.getElementById('lessonFeedback');
  el.textContent = msg;
  el.className = 'lesson-feedback ' + type;
}

function lessonComplete() {
  lessonDone = true;
  document.getElementById('nextBtn').disabled = false;
  document.getElementById('nextBtn').textContent = 'הבא ←';

  // Save progress
  if (!progress.completed.includes(currentLesson.globalIdx)) {
    progress.completed.push(currentLesson.globalIdx);
    progress.completed.sort((a,b) => a-b);
    saveProgress();
  }

  // Show success overlay
  setTimeout(() => {
    document.getElementById('successMsg').textContent =
      currentLesson.type === 'play' ? 'ניצחת את המחשב!' : 'סיימת את השלב בהצלחה';
    document.getElementById('successOverlay').classList.add('show');
  }, 700);
}

function resetLesson() {
  openLesson(currentLesson.globalIdx);
}

// ====== EVENT LISTENERS ======
document.getElementById('backBtn').addEventListener('click', () => {
  document.getElementById('lessonScreen').classList.remove('active');
  document.getElementById('mapScreen').classList.add('active');
  renderMap();
});

document.getElementById('nextBtn').addEventListener('click', () => {
  if (!lessonDone) return;
  if (!progress.completed.includes(currentLesson.globalIdx)) {
    progress.completed.push(currentLesson.globalIdx);
    saveProgress();
  }
  const nextIdx = currentLesson.globalIdx + 1;
  if (nextIdx < FLAT_LESSONS.length) {
    // Check if next lesson is in new unit
    const next = FLAT_LESSONS[nextIdx];
    if (next.unitIdx !== currentLesson.unitIdx) {
      document.getElementById('unitDoneTitle').textContent =
        'סיימת את "' + UNITS[currentLesson.unitIdx].title + '"!';
      document.getElementById('unitOverlay').classList.add('show');
    } else {
      openLesson(nextIdx);
    }
  } else {
    // All done!
    document.getElementById('unitDoneTitle').textContent = 'סיימת את כל המסע! אתה מאסטר! 🏆';
    document.getElementById('unitOverlay').classList.add('show');
  }
});

document.getElementById('hintBtn').addEventListener('click', () => {
  if (!currentLesson.validate) {
    showFeedback('info', '💡 ' + (currentLesson.goal || 'חשוב על המהלך הטוב ביותר'));
    return;
  }
  const v = currentLesson.validate;
  let hint = '💡 ';
  if (v.fromPiece) {
    const names = {P:'חייל',N:'פרש',B:'רץ',R:'צריח',Q:'מלכה',K:'מלך'};
    hint += `הזז את ה${names[v.fromPiece]}`;
  } else if (v.fromSquare) {
    hint += 'הזז את הכלי שמסומן';
    // highlight square
    setTimeout(() => {
      const sq = document.querySelector(`.sq[data-r="${v.fromSquare[0]}"][data-c="${v.fromSquare[1]}"]`);
      if (sq) {
        sq.classList.add('hint-target');
        setTimeout(() => sq.classList.remove('hint-target'), 2500);
      }
    }, 100);
  }
  if (v.toSquares && v.toSquares.length === 1) {
    const [r,c] = v.toSquares[0];
    const file = 'abcdefgh'[c];
    const rank = 8 - r;
    hint += ` ל-${file}${rank}`;
    setTimeout(() => {
      const sq = document.querySelector(`.sq[data-r="${r}"][data-c="${c}"]`);
      if (sq) {
        sq.classList.add('hint-target');
        setTimeout(() => sq.classList.remove('hint-target'), 2500);
      }
    }, 100);
  }
  showFeedback('info', hint);
});

document.getElementById('resetLessonBtn').addEventListener('click', resetLesson);

document.getElementById('continueBtn').addEventListener('click', () => {
  document.getElementById('successOverlay').classList.remove('show');
  document.getElementById('nextBtn').click();
});

document.getElementById('unitContinueBtn').addEventListener('click', () => {
  document.getElementById('unitOverlay').classList.remove('show');
  document.getElementById('successOverlay').classList.remove('show');
  const nextIdx = currentLesson.globalIdx + 1;
  if (nextIdx < FLAT_LESSONS.length) {
    document.getElementById('lessonScreen').classList.remove('active');
    document.getElementById('mapScreen').classList.add('active');
    renderMap();
    setTimeout(() => openLesson(nextIdx), 400);
  } else {
    document.getElementById('lessonScreen').classList.remove('active');
    document.getElementById('mapScreen').classList.add('active');
    renderMap();
  }
});

// ============================================================
// 📲 SMART INSTALL BUTTON — single click, auto-detect platform
// ============================================================
let deferredInstallPrompt = null;
const installBtn = document.getElementById('installBtn');
const iosHint = document.getElementById('iosHint');

function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Chrome / Edge / Android — capture native install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (!isInstalled()) installBtn.hidden = false;
});

// iOS — no prompt API, but show button so user can see the hint
const platform = detectPlatform();
if (!isInstalled() && (platform === 'ios' || deferredInstallPrompt)) {
  installBtn.hidden = false;
}
// Always show on iOS (where there's no beforeinstallprompt event)
if (!isInstalled() && platform === 'ios') installBtn.hidden = false;

installBtn.addEventListener('click', async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    if (result.outcome === 'accepted') {
      installBtn.hidden = true;
      setTimeout(() => alert('🎉 האפליקציה הותקנה!'), 300);
    }
    deferredInstallPrompt = null;
  } else if (platform === 'ios') {
    iosHint.classList.add('show');
  } else {
    alert('פתח את האפליקציה ב-Chrome או Edge כדי להתקין.');
  }
});

document.getElementById('iosHintClose').addEventListener('click', () => {
  iosHint.classList.remove('show');
});
iosHint.addEventListener('click', (e) => {
  if (e.target === iosHint) iosHint.classList.remove('show');
});

window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
});

// ============================================================
// 🔐 LOGIN (simple, no external setup)
// ============================================================
const AVATARS = ['♞','♚','♛','♜','♝','♟','🦄','🚀','🎯','🔥','⚡','🏆'];

const googleBtn = document.getElementById('googleBtn');
const profileChip = document.getElementById('profileChip');
const profilePic = document.getElementById('profilePic');
const profileName = document.getElementById('profileName');
const profileMenu = document.getElementById('profileMenu');

const loginModal = document.getElementById('loginModal');
const loginNameInput = document.getElementById('loginName');
const avatarGrid = document.getElementById('avatarGrid');
const loginGo = document.getElementById('loginGo');
const loginClose = document.getElementById('loginClose');

let pickedAvatar = AVATARS[0];

function renderAvatarGrid() {
  avatarGrid.innerHTML = '';
  AVATARS.forEach((emoji, i) => {
    const btn = document.createElement('button');
    btn.className = 'avatar-option' + (emoji === pickedAvatar ? ' selected' : '');
    btn.textContent = emoji;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      pickedAvatar = emoji;
      renderAvatarGrid();
    });
    avatarGrid.appendChild(btn);
  });
}

function applyUser(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem('chessupUser', JSON.stringify(user));
    // Update profile chip — use emoji avatar
    profilePic.style.display = 'none';
    let av = profileChip.querySelector('.avatar-emoji');
    if (!av) {
      av = document.createElement('span');
      av.className = 'avatar-emoji';
      profileChip.insertBefore(av, profileChip.firstChild);
    }
    av.textContent = user.avatar || '♞';
    profileName.textContent = user.name;
    profileChip.hidden = false;
    googleBtn.hidden = true;
  } else {
    localStorage.removeItem('chessupUser');
    profileChip.hidden = true;
    googleBtn.hidden = false;
  }
  progress = loadProgress();
  renderMap();
}

function openLogin() {
  pickedAvatar = AVATARS[0];
  loginNameInput.value = '';
  renderAvatarGrid();
  loginModal.classList.add('show');
  setTimeout(() => loginNameInput.focus(), 200);
}

googleBtn.addEventListener('click', openLogin);

loginGo.addEventListener('click', () => {
  const name = (loginNameInput.value || '').trim();
  if (!name) {
    loginNameInput.focus();
    loginNameInput.style.borderColor = '#ef4444';
    setTimeout(() => loginNameInput.style.borderColor = '', 1500);
    return;
  }
  const user = {
    sub: 'user_' + name.toLowerCase().replace(/\s+/g, '_'),
    name: name,
    avatar: pickedAvatar
  };
  applyUser(user);
  loginModal.classList.remove('show');
});

loginNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginGo.click();
});

loginClose.addEventListener('click', () => loginModal.classList.remove('show'));
loginModal.addEventListener('click', (e) => {
  if (e.target === loginModal) loginModal.classList.remove('show');
});

// Profile chip → menu
profileChip.addEventListener('click', () => {
  profileMenu.hidden = !profileMenu.hidden;
});
document.addEventListener('click', (e) => {
  if (!profileMenu.hidden && !profileChip.contains(e.target) && !profileMenu.contains(e.target)) {
    profileMenu.hidden = true;
  }
});

document.getElementById('signOutBtn').addEventListener('click', () => {
  profileMenu.hidden = true;
  applyUser(null);
});

// Init UI based on saved user
if (currentUser) applyUser(currentUser);

// ===== Init =====
renderMap();
