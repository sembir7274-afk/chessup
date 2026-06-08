// ===== Lessons data =====
// Goal types:
//   { type:'noPiece', piece, maxMoves? }
//   { type:'pieceAt', piece, square:[r,c], maxMoves? }
//   { type:'allOnRow', piece, row, maxMoves? }
//   { type:'checkmate', maxMoves? }
//   { type:'survive', moves }
//   { type:'captureValue', value, maxMoves? }  — capture enemy material worth N

const empty = () => Array(8).fill(0).map(() => Array(8).fill(''));
const put = (b, list) => { list.forEach(([p,r,c]) => b[r][c] = p); return b; };

const initial = () => [
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R']
];

const UNITS = [
  // ============ UNIT 1: WELCOME ============
  {
    title: 'ברוכים הבאים',
    desc: 'הכרת הבסיס',
    emoji: '👋',
    grad: 'linear-gradient(135deg, #7c5cff, #ec4899)',
    lessons: [
      {
        type: 'info', icon: '🎯', title: 'מה זה שחמט?',
        desc: 'משחק חשיבה ל-2 שחקנים. המטרה: מט - לתפוס את המלך במצב שאי אפשר לחלץ אותו ממנו.',
        goal: 'לחץ "הבא"',
        board: put(empty(), [['K',7,4],['k',0,4],['Q',7,3],['q',0,3]])
      },
      {
        type: 'move', icon: '👆', title: 'הזזה ראשונה',
        desc: 'הזז את החייל הלבן 2 משבצות קדימה.',
        goal: 'חייל מ-e2 ל-e4',
        board: initial(),
        turn: 'w',
        validate: { fromSquare: [6,4], toSquares: [[4,4]] }
      },
      {
        type: 'move', icon: '🐎', title: 'פתיחת פרש',
        desc: 'הוצא את הפרש ל-f3 - מהלך פתיחה קלאסי.',
        goal: 'פרש מ-g1 ל-f3',
        board: initial(),
        turn: 'w',
        validate: { fromSquare: [7,6], toSquares: [[5,5]] }
      }
    ]
  },

  // ============ UNIT 2: PAWN ============
  {
    title: 'אתגרי החייל',
    desc: 'מירוצים ותפיסות',
    emoji: '♟',
    grad: 'linear-gradient(135deg, #4ade80, #22d3ee)',
    lessons: [
      {
        type: 'capture', icon: '⚔️', title: 'אכילה באלכסון',
        desc: 'אכול את החייל השחור באלכסון.',
        goal: 'אכול את החייל',
        board: put(empty(), [['P',6,4],['p',5,3],['K',7,4],['k',0,4]]),
        turn: 'w',
        validate: { fromPiece: 'P', toSquares: [[5,3]] }
      },
      {
        type: 'goal', icon: '🎯', title: 'אכול 4 חיילים ב-6 מהלכים',
        desc: 'יש לך 3 חיילים נגד 4 שחורים. אכול את כולם תוך 6 מהלכים בלבד!',
        goal: 'אכול את 4 החיילים ב-6 מהלכים',
        board: put(empty(), [
          ['P',6,1],['P',6,3],['P',6,5],
          ['p',5,0],['p',5,2],['p',5,4],['p',5,6],
          ['K',7,7],['k',0,7]
        ]),
        turn: 'w',
        aiOpponent: false,
        objective: { type: 'noPiece', piece: 'p', maxMoves: 6 }
      },
      {
        type: 'goal', icon: '🏃', title: 'מירוץ דחוף',
        desc: 'הכתר את החייל לפני שהצריח השחור תופס אותו. AI חזק!',
        goal: 'הכתר תוך 5 מהלכים',
        board: put(empty(), [['P',3,0],['r',7,7],['K',7,2],['k',0,4]]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'allOnRow', piece: 'Q', row: 0, maxMoves: 5 }
      },
      {
        type: 'goal', icon: '🏁', title: 'מירוץ 2 חיילים',
        desc: 'יש לך 2 חיילים מתחרים. נגד צריח שחור חכם. הכתר אחד מהם!',
        goal: 'הכתר חייל',
        board: put(empty(), [
          ['P',3,2],['P',3,5],['r',6,0],
          ['K',7,7],['k',0,4]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'allOnRow', piece: 'Q', row: 0, maxMoves: 6 }
      }
    ]
  },

  // ============ UNIT 3: ROOK ============
  {
    title: 'אתגרי הצריח',
    desc: 'קווים ופינות',
    emoji: '♜',
    grad: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    lessons: [
      {
        type: 'move', icon: '↔️', title: 'תנועת הצריח',
        desc: 'הצריח זז ישר בלבד. הזז אותו לשורה 5 (כל מקום).',
        goal: 'צריח לשורה 5',
        board: put(empty(), [['R',7,0],['K',7,4],['k',0,4]]),
        turn: 'w',
        validate: { fromPiece: 'R', toRow: 3 }
      },
      {
        type: 'goal', icon: '🍴', title: 'אכול 5 חיילים ב-8 מהלכים',
        desc: 'צריח אחד נגד 5 חיילים פזורים. מצא את הסדר הנכון!',
        goal: '5 חיילים ב-8 מהלכים',
        board: put(empty(), [
          ['R',7,0],
          ['p',1,1],['p',2,4],['p',3,6],['p',5,3],['p',4,7],
          ['K',7,4],['k',0,4]
        ]),
        turn: 'w',
        aiOpponent: false,
        objective: { type: 'noPiece', piece: 'p', maxMoves: 8 }
      },
      {
        type: 'goal', icon: '🎯', title: 'תפוס את המלכה הבורחת',
        desc: 'המלכה השחורה תנסה לברוח עם AI חכם (רמה 2). תפוס אותה!',
        goal: 'אכול את המלכה תוך 6 מהלכים',
        board: put(empty(), [
          ['R',7,0],['R',7,7],['q',3,3],
          ['K',7,4],['k',0,4]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'noPiece', piece: 'q', maxMoves: 6 }
      },
      {
        type: 'goal', icon: '🏆', title: 'מט ב-2 צריחים',
        desc: 'מט ה"סולם" - שני צריחים דוחפים את המלך. AI יברח עם המלך השחור. עשה מט!',
        goal: 'מט תוך 8 מהלכים',
        board: put(empty(), [['R',7,0],['R',7,7],['K',5,4],['k',0,4]]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'checkmate', maxMoves: 8 }
      },
      {
        type: 'mate', icon: '⭐', title: 'מט בצריח - פאזל',
        desc: 'יש מט במהלך אחד! מצא את הריבוע הנכון.',
        goal: 'מצא את המט',
        board: put(empty(), [
          ['R',7,1],['K',2,4],['k',0,4],
          ['p',1,3],['p',1,4],['p',1,5]
        ]),
        turn: 'w',
        validate: { fromPiece: 'R', toSquares: [[0,1]] }
      }
    ]
  },

  // ============ UNIT 4: BISHOP ============
  {
    title: 'אתגרי הרץ',
    desc: 'אלכסונים בלבד',
    emoji: '♝',
    grad: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    lessons: [
      {
        type: 'move', icon: '↗️', title: 'תנועת הרץ',
        desc: 'הרץ זז באלכסון בלבד. הזז אותו.',
        goal: 'הזז את הרץ',
        board: put(empty(), [['B',7,2],['K',7,4],['k',0,4]]),
        turn: 'w',
        validate: { fromPiece: 'B' }
      },
      {
        type: 'goal', icon: '💎', title: 'אכול 4 חיילים ב-7 מהלכים',
        desc: 'רץ אחד נגד 4 חיילים. תזכור - הוא נשאר על אותו צבע משבצת!',
        goal: '4 חיילים ב-7 מהלכים',
        board: put(empty(), [
          ['B',7,2],
          ['p',2,3],['p',4,5],['p',5,4],['p',3,0],
          ['K',7,7],['k',0,7]
        ]),
        turn: 'w',
        aiOpponent: false,
        objective: { type: 'noPiece', piece: 'p', maxMoves: 7 }
      },
      {
        type: 'goal', icon: '👯', title: 'זוג רצים נגד צריח',
        desc: 'שני רצים שלך נגד צריח שחור חכם. אכול את הצריח!',
        goal: 'אכול את הצריח',
        board: put(empty(), [
          ['B',7,2],['B',7,5],['r',3,3],
          ['K',7,4],['k',0,7]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'noPiece', piece: 'r', maxMoves: 6 }
      },
      {
        type: 'goal', icon: '🎪', title: 'מלכה ורץ - מט',
        desc: 'יש לך מלכה ורץ נגד מלך בודד. עשה מט תוך 7 מהלכים!',
        goal: 'מט תוך 7 מהלכים',
        board: put(empty(), [['Q',5,3],['B',5,5],['K',6,4],['k',0,4]]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'checkmate', maxMoves: 7 }
      },
      {
        type: 'mate', icon: '⚡', title: 'פאזל - מצא את המט בעזרת רץ',
        desc: 'יש מט במהלך אחד עם הרץ. שים לב לכל הכלים.',
        goal: 'מט בלחיצה אחת',
        board: put(empty(), [
          ['B',4,4],['Q',1,3],['K',2,4],['k',0,5],
          ['p',1,5]
        ]),
        turn: 'w',
        validate: { fromPiece: 'B', toSquares: [[2,6]] }
      }
    ]
  },

  // ============ UNIT 5: KNIGHT TOUR ============
  {
    title: 'מסעות הפרש',
    desc: 'אתגרי קפיצות מורכבים',
    emoji: '♞',
    grad: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
    lessons: [
      {
        type: 'move', icon: '🔀', title: 'תנועה בצורת L',
        desc: 'הפרש זז 2+1 בצורת L. הוא היחיד שקופץ.',
        goal: 'הזז את הפרש',
        board: put(empty(), [['N',7,1],['K',7,4],['k',0,4]]),
        turn: 'w',
        validate: { fromPiece: 'N' }
      },
      {
        type: 'goal', icon: '🎯', title: 'מסע פרש - 4 קפיצות',
        desc: 'הגע מ-b1 ל-h8 תוך 4 קפיצות בלבד. תכנן בקפידה!',
        goal: 'הגע ל-h8 ב-4 מהלכים',
        board: put(empty(), [['N',7,1],['K',7,4],['k',0,0]]),
        turn: 'w',
        aiOpponent: false,
        objective: { type: 'pieceAt', piece: 'N', square: [0,7], maxMoves: 4 }
      },
      {
        type: 'goal', icon: '⭐', title: 'אכול 4 חיילים ב-7 מהלכים',
        desc: 'הפרש נגד 4 חיילים בעמדות מסוכנות. חשב את המסלול האופטימלי!',
        goal: '4 חיילים ב-7 מהלכים',
        board: put(empty(), [
          ['N',7,1],
          ['p',3,3],['p',2,5],['p',5,5],['p',4,2],
          ['K',7,4],['k',0,7]
        ]),
        turn: 'w',
        aiOpponent: false,
        objective: { type: 'noPiece', piece: 'p', maxMoves: 7 }
      },
      {
        type: 'goal', icon: '🌟', title: 'מסע פרש - 5 קפיצות',
        desc: 'מאמצע הלוח ל-a8 ב-5 קפיצות בלבד.',
        goal: 'הגע ל-a8 ב-5 מהלכים',
        board: put(empty(), [['N',4,4],['K',7,4],['k',0,7]]),
        turn: 'w',
        aiOpponent: false,
        objective: { type: 'pieceAt', piece: 'N', square: [0,0], maxMoves: 5 }
      },
      {
        type: 'capture', icon: '🍴', title: 'פורק קלאסי',
        desc: 'הזז את הפרש ל-d4 - הוא יתקוף את המלך והמלכה בו זמנית!',
        goal: 'פרש ל-d4',
        board: put(empty(), [['N',6,4],['k',2,2],['q',2,4],['K',7,4]]),
        turn: 'w',
        validate: { fromPiece: 'N', toSquares: [[4,3]] }
      },
      {
        type: 'goal', icon: '👹', title: 'פורק כפול',
        desc: 'יש 2 פרשים שחורים יקרים. תפוס לפחות אחד מהם בעזרת הפרש שלך.',
        goal: 'אכול פרש שחור',
        board: put(empty(), [
          ['N',5,3],['n',2,2],['n',2,6],
          ['K',7,4],['k',0,4]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'noPiece', piece: 'n', maxMoves: 5 }
      }
    ]
  },

  // ============ UNIT 6: QUEEN ============
  {
    title: 'המלכה משחקת',
    desc: 'הכלי הכי חזק',
    emoji: '♛',
    grad: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    lessons: [
      {
        type: 'move', icon: '👑', title: 'המלכה - אלופת הכלים',
        desc: 'המלכה זזה לכל הכיוונים.',
        goal: 'הזז את המלכה',
        board: put(empty(), [['Q',7,3],['K',7,4],['k',0,4]]),
        turn: 'w',
        validate: { fromPiece: 'Q' }
      },
      {
        type: 'goal', icon: '💥', title: 'אכול 6 חיילים ב-8 מהלכים',
        desc: 'מלכה אחת נגד 6 חיילים פזורים. נצל את הכוח שלה!',
        goal: '6 חיילים ב-8 מהלכים',
        board: put(empty(), [
          ['Q',7,3],
          ['p',2,1],['p',3,4],['p',4,2],['p',5,5],['p',2,6],['p',5,0],
          ['K',7,7],['k',0,0]
        ]),
        turn: 'w',
        aiOpponent: false,
        objective: { type: 'noPiece', piece: 'p', maxMoves: 8 }
      },
      {
        type: 'goal', icon: '⚔️', title: 'דו-קרב מלכות',
        desc: 'המלכה השחורה חכמה (AI רמה 3). תפוס אותה ראשון!',
        goal: 'אכול את המלכה',
        board: put(empty(), [
          ['Q',7,3],['q',0,3],
          ['K',7,4],['k',0,4]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 3,
        objective: { type: 'noPiece', piece: 'q', maxMoves: 8 }
      },
      {
        type: 'goal', icon: '🏆', title: 'מט המלכה והמלך',
        desc: 'מלכה + מלך נגד מלך בודד. עשה מט תוך 10 מהלכים.',
        goal: 'מט תוך 10 מהלכים',
        board: put(empty(), [['Q',7,3],['K',7,4],['k',0,3]]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'checkmate', maxMoves: 10 }
      },
      {
        type: 'mate', icon: '⚡', title: 'פאזל מלכה',
        desc: 'מט במהלך אחד. חשוב!',
        goal: 'מצא את המט',
        board: put(empty(), [['Q',7,0],['K',2,5],['k',0,7]]),
        turn: 'w',
        validate: { fromPiece: 'Q', toSquares: [[1,6]] }
      }
    ]
  },

  // ============ UNIT 7: KING & SURVIVAL ============
  {
    title: 'הגנת המלך',
    desc: 'שח, הצלה ושרידה',
    emoji: '♚',
    grad: 'linear-gradient(135deg, #f59e0b, #f43f5e)',
    lessons: [
      {
        type: 'move', icon: '🏃', title: 'ברח משח!',
        desc: 'המלך הלבן בשח. ברח למקום בטוח.',
        goal: 'הזז את המלך',
        board: put(empty(), [['K',4,4],['q',4,0],['k',0,4]]),
        turn: 'w',
        validate: { fromPiece: 'K' }
      },
      {
        type: 'capture', icon: '🛡️', title: 'אכול את התוקף',
        desc: 'הצריח השחור מאיים. אכול אותו עם הצריח שלך.',
        goal: 'אכול את הצריח',
        board: put(empty(), [['K',7,4],['R',5,0],['r',7,0],['k',0,4]]),
        turn: 'w',
        validate: { fromPiece: 'R', toSquares: [[7,0]] }
      },
      {
        type: 'goal', icon: '🧗', title: 'שרוד 6 מהלכים',
        desc: '2 צריחים שחורים רודפים את המלך שלך! AI חזק. שרוד!',
        goal: 'שרוד 6 מהלכים',
        board: put(empty(), [['K',5,3],['r',0,0],['r',0,7],['k',1,4]]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'survive', moves: 6 }
      },
      {
        type: 'capture', icon: '🚪', title: 'חסום את השח',
        desc: 'הצריח עושה שח. חסום אותו בעזרת הרץ.',
        goal: 'חסום עם הרץ',
        board: put(empty(), [['K',7,4],['B',5,2],['r',7,0],['k',0,4]]),
        turn: 'w',
        validate: { fromPiece: 'B', toSquares: [[7,0],[7,3]] }
      },
      {
        type: 'goal', icon: '⚖️', title: 'תיקו על ידי שרידה',
        desc: 'אתה במצב נחות - שרוד 8 מהלכים נגד מלכה שחורה!',
        goal: 'שרוד 8 מהלכים',
        board: put(empty(), [['K',6,4],['q',1,3],['k',0,4]]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'survive', moves: 8 }
      }
    ]
  },

  // ============ UNIT 8: CAPTURE CHALLENGES ============
  {
    title: 'אתגרי טקטיקה',
    desc: 'מארבים ומלכודות',
    emoji: '⚔️',
    grad: 'linear-gradient(135deg, #f97316, #ef4444)',
    lessons: [
      {
        type: 'goal', icon: '🎯', title: 'תפוס מלכה ב-2 מהלכים',
        desc: 'פורק עם הפרש - מצא איך לתפוס את המלכה!',
        goal: 'אכול את המלכה ב-3 מהלכים',
        board: put(empty(), [
          ['N',5,3],['q',2,4],
          ['K',7,4],['k',0,4]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'noPiece', piece: 'q', maxMoves: 3 }
      },
      {
        type: 'goal', icon: '🪤', title: 'מלכודת הפרש',
        desc: 'הפרש השחור באמצע הלוח. תפוס אותו!',
        goal: 'אכול את הפרש',
        board: put(empty(), [
          ['R',7,0],['B',6,2],['n',3,3],
          ['K',7,4],['k',0,4]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'noPiece', piece: 'n', maxMoves: 4 }
      },
      {
        type: 'goal', icon: '👹', title: 'תפוס 2 פרשים',
        desc: 'יש 2 פרשים שחורים. תפוס את שניהם!',
        goal: 'אכול 2 פרשים',
        board: put(empty(), [
          ['Q',6,3],['R',7,0],['n',2,2],['n',2,6],
          ['K',7,4],['k',0,4]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'noPiece', piece: 'n', maxMoves: 6 }
      },
      {
        type: 'goal', icon: '🎪', title: 'אריה הפינה',
        desc: '4 חיילים שחורים מקיפים את המלך השחור. פרוץ ועשה נזק!',
        goal: 'אכול 3 חיילים',
        board: put(empty(), [
          ['Q',7,3],['B',6,5],
          ['p',1,2],['p',1,5],['p',2,3],['p',2,6],
          ['K',7,7],['k',0,4]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'captureValue', value: 3, maxMoves: 6 }
      },
      {
        type: 'mate', icon: '⭐', title: 'מט בצריח ופרש',
        desc: 'מצא את המהלך שעושה מט מיד.',
        goal: 'מט במהלך אחד',
        board: put(empty(), [
          ['R',1,4],['N',2,5],['K',6,4],['k',0,4],
          ['p',1,3]
        ]),
        turn: 'w',
        validate: { fromPiece: 'R', toSquares: [[0,4]] }
      }
    ]
  },

  // ============ UNIT 9: SPECIAL MOVES ============
  {
    title: 'מהלכים מיוחדים',
    desc: 'הצרחה, אן פסאן, הכתרה',
    emoji: '✨',
    grad: 'linear-gradient(135deg, #f97316, #fbbf24)',
    lessons: [
      {
        type: 'move', icon: '🏰', title: 'הצרחה קצרה',
        desc: 'המלך זז 2 משבצות, הצריח קופץ לצדו. הזז את המלך ל-g1.',
        goal: 'הצרחה קצרה',
        board: put(empty(), [['K',7,4],['R',7,7],['k',0,4]]),
        turn: 'w',
        validate: { fromPiece: 'K', toSquares: [[7,6]] }
      },
      {
        type: 'move', icon: '🏯', title: 'הצרחה ארוכה',
        desc: 'הצרח לצד שמאל - מלך ל-c1.',
        goal: 'הצרחה ארוכה',
        board: put(empty(), [['K',7,4],['R',7,0],['k',0,4]]),
        turn: 'w',
        validate: { fromPiece: 'K', toSquares: [[7,2]] }
      },
      {
        type: 'move', icon: '🎭', title: 'אן פסאן',
        desc: 'החייל השחור קפץ 2 משבצות וצמוד לחייל שלך. אכול אן פסאן!',
        goal: 'אן פסאן',
        board: put(empty(), [['P',3,4],['p',3,5],['K',7,4],['k',0,4]]),
        turn: 'w',
        enPassant: [2,5],
        validate: { fromPiece: 'P', toSquares: [[2,5]] }
      },
      {
        type: 'goal', icon: '👑', title: 'מירוץ הכתרה - קשה',
        desc: 'דחוף את החייל ל-8 בעוד 2 צריחים שחורים רודפים אותך!',
        goal: 'הכתר תוך 5 מהלכים',
        board: put(empty(), [['P',2,2],['r',6,7],['r',5,0],['K',7,4],['k',0,4]]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'allOnRow', piece: 'Q', row: 0, maxMoves: 5 }
      }
    ]
  },

  // ============ UNIT 10: REAL TACTICS ============
  {
    title: 'פאזלי טקטיקה אמיתיים',
    desc: 'מט-ב-2 ופורקים',
    emoji: '🧠',
    grad: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    lessons: [
      {
        type: 'capture', icon: '📌', title: 'קיבוע (Pin)',
        desc: 'הפרש השחור מקובע למלך. אכול אותו עם הרץ!',
        goal: 'אכול את הפרש',
        board: put(empty(), [['B',4,0],['n',3,1],['r',2,2],['K',7,4],['k',0,4]]),
        turn: 'w',
        validate: { fromPiece: 'B', toSquares: [[3,1]] }
      },
      {
        type: 'move', icon: '🍢', title: 'שיפוד מושלם',
        desc: 'הזז את הצריח כך שיתקוף את המלך ויחשוף את הצריח השחור.',
        goal: 'צריח ל-a4',
        board: put(empty(), [['R',7,0],['k',4,4],['r',4,7],['K',7,7]]),
        turn: 'w',
        validate: { fromPiece: 'R', toSquares: [[4,0]] }
      },
      {
        type: 'goal', icon: '💥', title: 'פאזל - השג יתרון חומרי',
        desc: 'תפוס לפחות 5 נקודות שווי חומר (צריח=5, פרש/רץ=3, חייל=1) תוך 4 מהלכים.',
        goal: '5+ נקודות תוך 4 מהלכים',
        board: put(empty(), [
          ['N',4,3],['Q',6,4],
          ['r',2,2],['n',2,5],['p',3,4],
          ['K',7,4],['k',0,4]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'captureValue', value: 5, maxMoves: 4 }
      },
      {
        type: 'goal', icon: '🎯', title: 'מט ב-2 מהלכים',
        desc: 'פאזל קלאסי: מצא את הסידרה שעושה מט תוך 2 מהלכים בדיוק.',
        goal: 'מט תוך 2 מהלכים',
        board: put(empty(), [
          ['Q',5,5],['B',6,2],['K',7,4],
          ['k',0,7],['p',1,6],['p',1,7]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'checkmate', maxMoves: 2 }
      },
      {
        type: 'goal', icon: '⭐', title: 'מט ב-3 מהלכים',
        desc: 'תרגיל אקדמי: מט ב-3 מהלכים. תכנן את כל הסדרה!',
        goal: 'מט תוך 3 מהלכים',
        board: put(empty(), [
          ['Q',3,3],['R',7,0],['K',6,4],
          ['k',0,4],['p',1,3],['p',1,5]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'checkmate', maxMoves: 3 }
      },
      {
        type: 'mate', icon: '🏆', title: 'מט אנסטסיה',
        desc: 'מט מפורסם של פרש ומלכה. מצא אותו!',
        goal: 'פרש ל-e7',
        board: put(empty(), [
          ['N',3,4],['Q',3,7],['K',7,4],
          ['k',0,7],['p',1,6],['p',1,5]
        ]),
        turn: 'w',
        validate: { fromPiece: 'N', toSquares: [[1,5]] }
      }
    ]
  },

  // ============ UNIT 11: STRATEGY ============
  {
    title: 'אסטרטגיה במשחק',
    desc: 'פתיחה ואמצע',
    emoji: '🧠',
    grad: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
    lessons: [
      {
        type: 'goal', icon: '🎯', title: 'פתיחה מלאה - 4 מהלכים',
        desc: 'שחק 4 מהלכים נגד AI: מרכז, פרשים, רץ, הצרחה.',
        goal: 'שחק 4 מהלכים',
        board: initial(),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'survive', moves: 4 }
      },
      {
        type: 'goal', icon: '⚔️', title: 'אמצע משחק - שרוד 8',
        desc: 'מערכת מאוזנת. שרוד 8 מהלכים מבלי לאבד יותר מ-2 כלים.',
        goal: 'שרוד 8 מהלכים',
        board: [
          ['r','','b','q','k','b','','r'],
          ['p','p','p','','','p','p','p'],
          ['','','n','','','n','',''],
          ['','','','p','p','','',''],
          ['','','','P','P','','',''],
          ['','','N','','','N','',''],
          ['P','P','P','','','P','P','P'],
          ['R','','B','Q','K','B','','R']
        ],
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'survive', moves: 8 }
      },
      {
        type: 'goal', icon: '🏁', title: 'סוף משחק - חיילים',
        desc: 'סוף משחק קלאסי - חיילים בלבד. הכתר אחד מהחיילים שלך.',
        goal: 'הכתר חייל',
        board: put(empty(), [
          ['P',4,0],['P',4,3],['P',4,5],
          ['p',3,1],['p',3,4],['p',3,7],
          ['K',7,4],['k',0,4]
        ]),
        turn: 'w',
        aiOpponent: true, aiDepth: 2,
        objective: { type: 'allOnRow', piece: 'Q', row: 0, maxMoves: 12 }
      }
    ]
  },

  // ============ UNIT 12: REAL GAMES ============
  {
    title: 'משחקים מלאים',
    desc: 'נגד מאסטרים דיגיטליים',
    emoji: '🎮',
    grad: 'linear-gradient(135deg, #ec4899, #f59e0b)',
    lessons: [
      {
        type: 'play', icon: '🤖', title: 'משחק נגד מתחיל',
        desc: 'משחק מלא נגד AI ברמה 1. הראה למחשב מה למדת.',
        goal: 'נצח את ה-AI',
        board: initial(),
        turn: 'w',
        aiDepth: 2
      },
      {
        type: 'play', icon: '⚔️', title: 'משחק נגד חובב',
        desc: 'AI ברמה 2. נדרשת אסטרטגיה אמיתית.',
        goal: 'נצח את ה-AI',
        board: initial(),
        turn: 'w',
        aiDepth: 3
      },
      {
        type: 'play', icon: '🏆', title: 'אתגר המאסטר',
        desc: 'AI ברמה 3. הקרב הסופי. רק מאסטרים אמיתיים מנצחים פה.',
        goal: 'נצח את המאסטר',
        board: initial(),
        turn: 'w',
        aiDepth: 3
      }
    ]
  }
];

const FLAT_LESSONS = [];
UNITS.forEach((u, ui) => {
  u.lessons.forEach((l, li) => {
    FLAT_LESSONS.push({ ...l, unitIdx: ui, lessonIdx: li, globalIdx: FLAT_LESSONS.length });
  });
});
