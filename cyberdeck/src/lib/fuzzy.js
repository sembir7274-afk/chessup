/**
 * Subsequence scorer for the command palette.
 *
 * Returns a score (higher is better) or -1 when the query is not a
 * subsequence of the target. Consecutive matches and word-boundary hits are
 * rewarded, so "ptm" ranks "Pomodoro Timer" above "Purge Task Metadata".
 */
export function fuzzyScore(query, target) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t.includes(q)) {
    // Exact substring: big bonus, extra if it starts the string.
    return 1000 - t.indexOf(q) * 4 + (t.startsWith(q) ? 120 : 0);
  }

  let score = 0;
  let ti = 0;
  let streak = 0;

  for (let qi = 0; qi < q.length; qi += 1) {
    const char = q[qi];
    let found = -1;
    for (let i = ti; i < t.length; i += 1) {
      if (t[i] === char) {
        found = i;
        break;
      }
    }
    if (found === -1) return -1;

    const isBoundary = found === 0 || /[\s\-_/:.]/.test(t[found - 1]);
    streak = found === ti ? streak + 1 : 0;
    score += 10 + streak * 6 + (isBoundary ? 14 : 0) - Math.min(8, found - ti);
    ti = found + 1;
  }

  return score;
}

/**
 * Rank `items` by the best score across their searchable fields, returning
 * `{ item, score }` pairs sorted best-first. Callers that need the scores —
 * to order groups by match quality, say — use this directly.
 */
export function fuzzyRank(items, query, getFields) {
  if (!query.trim()) return items.map((item) => ({ item, score: 0 }));
  return items
    .map((item) => {
      const fields = getFields(item);
      const best = fields.reduce((max, field) => Math.max(max, fuzzyScore(query, field)), -1);
      return { item, score: best };
    })
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);
}

/** `fuzzyRank` without the scores. */
export function fuzzyFilter(items, query, getFields) {
  return fuzzyRank(items, query, getFields).map((entry) => entry.item);
}
