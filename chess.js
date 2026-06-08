// Chess engine — full rules: castling, en passant, promotion, check/checkmate/stalemate.
// Board representation: 8x8 array, [0][0] = a8, [7][7] = h1
// Pieces: 'P','N','B','R','Q','K' uppercase = white; lowercase = black; '' = empty

const ChessEngine = (() => {

  function initialBoard() {
    return [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['','','','','','','',''],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ];
  }

  function newState() {
    return {
      board: initialBoard(),
      turn: 'w',
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null, // [r,c] target square
      halfmove: 0,
      fullmove: 1,
      history: [],
      captured: { w: [], b: [] } // pieces captured by white / by black
    };
  }

  const isWhite = p => p && p === p.toUpperCase() && p !== '';
  const isBlack = p => p && p === p.toLowerCase() && p !== '';
  const colorOf = p => !p ? null : (isWhite(p) ? 'w' : 'b');
  const inBoard = (r,c) => r>=0 && r<8 && c>=0 && c<8;

  function cloneState(s) {
    return {
      board: s.board.map(r => r.slice()),
      turn: s.turn,
      castling: {...s.castling},
      enPassant: s.enPassant ? [...s.enPassant] : null,
      halfmove: s.halfmove,
      fullmove: s.fullmove,
      history: s.history.slice(),
      captured: { w: s.captured.w.slice(), b: s.captured.b.slice() }
    };
  }

  // Get raw moves for piece at (r,c), ignoring check.
  function rawMoves(s, r, c) {
    const p = s.board[r][c];
    if (!p) return [];
    const color = colorOf(p);
    const enemy = color === 'w' ? 'b' : 'w';
    const moves = [];
    const piece = p.toUpperCase();

    const addSlide = (dr,dc) => {
      let nr=r+dr, nc=c+dc;
      while (inBoard(nr,nc)) {
        const t = s.board[nr][nc];
        if (!t) moves.push({r:nr,c:nc});
        else { if (colorOf(t) === enemy) moves.push({r:nr,c:nc,capture:true}); break; }
        nr+=dr; nc+=dc;
      }
    };

    if (piece === 'P') {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      const promoRow = color === 'w' ? 0 : 7;
      // one forward
      if (inBoard(r+dir,c) && !s.board[r+dir][c]) {
        moves.push({r:r+dir,c,promo: r+dir===promoRow});
        if (r === startRow && !s.board[r+2*dir][c]) {
          moves.push({r:r+2*dir,c,double:true});
        }
      }
      // captures
      for (const dc of [-1,1]) {
        const nr = r+dir, nc = c+dc;
        if (!inBoard(nr,nc)) continue;
        const t = s.board[nr][nc];
        if (t && colorOf(t) === enemy) moves.push({r:nr,c:nc,capture:true,promo: nr===promoRow});
        // en passant
        if (s.enPassant && s.enPassant[0] === nr && s.enPassant[1] === nc) {
          moves.push({r:nr,c:nc,capture:true,enPassant:true});
        }
      }
    }
    else if (piece === 'N') {
      for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr=r+dr, nc=c+dc;
        if (!inBoard(nr,nc)) continue;
        const t = s.board[nr][nc];
        if (!t) moves.push({r:nr,c:nc});
        else if (colorOf(t) === enemy) moves.push({r:nr,c:nc,capture:true});
      }
    }
    else if (piece === 'B') { addSlide(-1,-1); addSlide(-1,1); addSlide(1,-1); addSlide(1,1); }
    else if (piece === 'R') { addSlide(-1,0); addSlide(1,0); addSlide(0,-1); addSlide(0,1); }
    else if (piece === 'Q') {
      addSlide(-1,-1); addSlide(-1,1); addSlide(1,-1); addSlide(1,1);
      addSlide(-1,0); addSlide(1,0); addSlide(0,-1); addSlide(0,1);
    }
    else if (piece === 'K') {
      for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
        if (!dr && !dc) continue;
        const nr=r+dr, nc=c+dc;
        if (!inBoard(nr,nc)) continue;
        const t = s.board[nr][nc];
        if (!t) moves.push({r:nr,c:nc});
        else if (colorOf(t) === enemy) moves.push({r:nr,c:nc,capture:true});
      }
      // Castling
      const row = color === 'w' ? 7 : 0;
      if (r === row && c === 4 && !isSquareAttacked(s, row, 4, enemy)) {
        const kSide = color === 'w' ? s.castling.wK : s.castling.bK;
        const qSide = color === 'w' ? s.castling.wQ : s.castling.bQ;
        if (kSide && !s.board[row][5] && !s.board[row][6] &&
            s.board[row][7] === (color === 'w' ? 'R' : 'r') &&
            !isSquareAttacked(s, row, 5, enemy) && !isSquareAttacked(s, row, 6, enemy)) {
          moves.push({r:row,c:6,castle:'K'});
        }
        if (qSide && !s.board[row][1] && !s.board[row][2] && !s.board[row][3] &&
            s.board[row][0] === (color === 'w' ? 'R' : 'r') &&
            !isSquareAttacked(s, row, 3, enemy) && !isSquareAttacked(s, row, 2, enemy)) {
          moves.push({r:row,c:2,castle:'Q'});
        }
      }
    }
    return moves;
  }

  function isSquareAttacked(s, r, c, byColor) {
    for (let rr=0; rr<8; rr++) for (let cc=0; cc<8; cc++) {
      const p = s.board[rr][cc];
      if (!p || colorOf(p) !== byColor) continue;
      // For attack checks, skip king's castling moves to avoid recursion
      if (p.toUpperCase() === 'P') {
        const dir = byColor === 'w' ? -1 : 1;
        if (rr+dir === r && (cc-1 === c || cc+1 === c)) return true;
      } else if (p.toUpperCase() === 'K') {
        if (Math.abs(rr-r) <= 1 && Math.abs(cc-c) <= 1 && (rr !== r || cc !== c)) return true;
      } else {
        const moves = rawMoves(s, rr, cc);
        if (moves.some(m => m.r === r && m.c === c)) return true;
      }
    }
    return false;
  }

  function findKing(s, color) {
    const target = color === 'w' ? 'K' : 'k';
    for (let r=0; r<8; r++) for (let c=0; c<8; c++)
      if (s.board[r][c] === target) return [r,c];
    return null;
  }

  function inCheck(s, color) {
    const k = findKing(s, color);
    if (!k) return false;
    return isSquareAttacked(s, k[0], k[1], color === 'w' ? 'b' : 'w');
  }

  // Get all legal moves (filtered through check) for piece at (r,c)
  function legalMoves(s, r, c) {
    const p = s.board[r][c];
    if (!p || colorOf(p) !== s.turn) return [];
    const raw = rawMoves(s, r, c);
    return raw.filter(m => {
      const test = cloneState(s);
      applyMove(test, {from:[r,c], to:[m.r,m.c], flags:m, promo:'Q'}, true);
      return !inCheck(test, s.turn);
    });
  }

  function allLegalMoves(s) {
    const all = [];
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
      const p = s.board[r][c];
      if (!p || colorOf(p) !== s.turn) continue;
      const moves = legalMoves(s, r, c);
      for (const m of moves) all.push({from:[r,c], to:[m.r,m.c], flags:m});
    }
    return all;
  }

  // Apply move, mutating state
  function applyMove(s, move, silent=false) {
    const [fr,fc] = move.from;
    const [tr,tc] = move.to;
    const piece = s.board[fr][fc];
    const captured = s.board[tr][tc];
    const flags = move.flags || {};

    // Record captured for display
    if (captured && !silent) {
      const owner = colorOf(captured) === 'w' ? 'b' : 'w';
      s.captured[owner].push(captured);
    }
    if (flags.enPassant && !silent) {
      const epRow = s.turn === 'w' ? tr+1 : tr-1;
      const epP = s.board[epRow][tc];
      if (epP) s.captured[s.turn].push(epP);
    }

    // Move piece
    s.board[tr][tc] = piece;
    s.board[fr][fc] = '';

    // En passant capture removes pawn
    if (flags.enPassant) {
      const epRow = s.turn === 'w' ? tr+1 : tr-1;
      s.board[epRow][tc] = '';
    }

    // Castling - move rook
    if (flags.castle === 'K') {
      s.board[tr][5] = s.board[tr][7]; s.board[tr][7] = '';
    } else if (flags.castle === 'Q') {
      s.board[tr][3] = s.board[tr][0]; s.board[tr][0] = '';
    }

    // Promotion
    if (flags.promo) {
      const promo = (move.promo || 'Q');
      s.board[tr][tc] = s.turn === 'w' ? promo.toUpperCase() : promo.toLowerCase();
    }

    // Update castling rights
    if (piece === 'K') { s.castling.wK = false; s.castling.wQ = false; }
    if (piece === 'k') { s.castling.bK = false; s.castling.bQ = false; }
    if (piece === 'R') {
      if (fr === 7 && fc === 0) s.castling.wQ = false;
      if (fr === 7 && fc === 7) s.castling.wK = false;
    }
    if (piece === 'r') {
      if (fr === 0 && fc === 0) s.castling.bQ = false;
      if (fr === 0 && fc === 7) s.castling.bK = false;
    }
    if (tr === 0 && tc === 0) s.castling.bQ = false;
    if (tr === 0 && tc === 7) s.castling.bK = false;
    if (tr === 7 && tc === 0) s.castling.wQ = false;
    if (tr === 7 && tc === 7) s.castling.wK = false;

    // En passant target
    s.enPassant = flags.double ? [(fr+tr)/2, tc] : null;

    // Halfmove
    if (piece.toUpperCase() === 'P' || captured || flags.enPassant) s.halfmove = 0;
    else s.halfmove++;

    if (s.turn === 'b') s.fullmove++;
    s.turn = s.turn === 'w' ? 'b' : 'w';

    if (!silent) {
      s.history.push({
        piece, from:[fr,fc], to:[tr,tc], captured, flags, promo: move.promo
      });
    }
  }

  function gameStatus(s) {
    const moves = allLegalMoves(s);
    const check = inCheck(s, s.turn);
    if (moves.length === 0) {
      return check ? { over:true, result: s.turn === 'w' ? 'b' : 'w', reason: 'מט' }
                   : { over:true, result: 'draw', reason: 'פט (תיקו)' };
    }
    if (s.halfmove >= 100) return { over:true, result:'draw', reason:'חוק 50 מהלכים' };
    if (insufficientMaterial(s)) return { over:true, result:'draw', reason:'חומר לא מספיק' };
    return { over:false, check };
  }

  function insufficientMaterial(s) {
    const pieces = [];
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
      const p = s.board[r][c];
      if (p) pieces.push(p.toUpperCase());
    }
    if (pieces.length === 2) return true; // K vs K
    if (pieces.length === 3 && (pieces.includes('B') || pieces.includes('N'))) return true;
    return false;
  }

  // Algebraic notation
  function squareName(r, c) {
    return 'abcdefgh'[c] + (8-r);
  }
  function moveNotation(s_before, move) {
    const piece = s_before.board[move.from[0]][move.from[1]];
    const flags = move.flags || {};
    if (flags.castle === 'K') return 'O-O';
    if (flags.castle === 'Q') return 'O-O-O';
    const symbol = { P:'', N:'♘', B:'♗', R:'♖', Q:'♕', K:'♔' }[piece.toUpperCase()];
    const capture = s_before.board[move.to[0]][move.to[1]] || flags.enPassant ? 'x' : '';
    const dest = squareName(move.to[0], move.to[1]);
    const promo = flags.promo ? '=' + (move.promo || 'Q') : '';
    const from = piece.toUpperCase() === 'P' && capture ? 'abcdefgh'[move.from[1]] : '';
    return symbol + from + capture + dest + promo;
  }

  // ====== Simple AI (minimax with alpha-beta) ======
  const VALUES = { P:1, N:3, B:3.2, R:5, Q:9, K:0 };
  function evaluate(s) {
    let score = 0;
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
      const p = s.board[r][c];
      if (!p) continue;
      const v = VALUES[p.toUpperCase()];
      score += isWhite(p) ? v : -v;
      // small center bonus
      if (r >= 3 && r <= 4 && c >= 3 && c <= 4) score += isWhite(p) ? 0.1 : -0.1;
    }
    return score;
  }

  function bestMove(s, depth) {
    const maximizing = s.turn === 'w';
    let best = null, bestScore = maximizing ? -Infinity : Infinity;
    const moves = allLegalMoves(s);
    // shuffle for variety
    for (let i = moves.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [moves[i], moves[j]] = [moves[j], moves[i]];
    }
    for (const m of moves) {
      const test = cloneState(s);
      applyMove(test, m, true);
      const sc = minimax(test, depth-1, -Infinity, Infinity, !maximizing);
      if (maximizing ? sc > bestScore : sc < bestScore) {
        bestScore = sc; best = m;
      }
    }
    return best;
  }

  function minimax(s, depth, alpha, beta, maximizing) {
    if (depth === 0) return evaluate(s);
    const moves = allLegalMoves(s);
    if (moves.length === 0) {
      if (inCheck(s, s.turn)) return maximizing ? -1000 : 1000;
      return 0;
    }
    if (maximizing) {
      let best = -Infinity;
      for (const m of moves) {
        const test = cloneState(s);
        applyMove(test, m, true);
        best = Math.max(best, minimax(test, depth-1, alpha, beta, false));
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) {
        const test = cloneState(s);
        applyMove(test, m, true);
        best = Math.min(best, minimax(test, depth-1, alpha, beta, true));
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  return {
    newState, cloneState, legalMoves, allLegalMoves, applyMove,
    gameStatus, inCheck, squareName, moveNotation, bestMove, colorOf, isWhite, isBlack
  };
})();
