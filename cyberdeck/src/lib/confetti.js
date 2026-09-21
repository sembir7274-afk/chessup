import confetti from 'canvas-confetti';

const NEON = ['#22e4ff', '#7df9ff', '#ff2d9b', '#ff5ec4', '#a855f7', '#9dff3d', '#ffb627'];

/**
 * Task-completion burst. Fires from roughly where the task row sits so the
 * particles read as erupting out of the widget rather than the viewport.
 */
export function fireTaskConfetti(origin = { x: 0.5, y: 0.5 }) {
  const shared = {
    origin,
    colors: NEON,
    disableForReducedMotion: true,
    zIndex: 9999,
    scalar: 0.9,
  };

  confetti({ ...shared, particleCount: 46, spread: 62, startVelocity: 38, ticks: 140 });
  confetti({
    ...shared,
    particleCount: 18,
    spread: 110,
    startVelocity: 26,
    decay: 0.92,
    scalar: 1.25,
    shapes: ['square'],
  });
}

/** Bigger celebration for clearing the whole queue. */
export function fireAllClearConfetti() {
  const end = Date.now() + 900;
  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors: NEON,
      disableForReducedMotion: true,
      zIndex: 9999,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors: NEON,
      disableForReducedMotion: true,
      zIndex: 9999,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** Phase-complete pulse for the Pomodoro timer. */
export function firePomodoroConfetti() {
  confetti({
    particleCount: 70,
    spread: 100,
    origin: { x: 0.5, y: 0.45 },
    colors: ['#22e4ff', '#7df9ff', '#a855f7'],
    disableForReducedMotion: true,
    zIndex: 9999,
    startVelocity: 32,
    scalar: 0.85,
  });
}

/** Screen-space origin for an element, for confetti that erupts from it. */
export function originFromElement(element) {
  if (!element) return { x: 0.5, y: 0.5 };
  const rect = element.getBoundingClientRect();
  return {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height / 2) / window.innerHeight,
  };
}
