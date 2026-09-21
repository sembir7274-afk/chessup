import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useSystem } from '../context/SystemContext';
import { useMousePosition } from '../hooks/useMousePosition';

const VIDEO_SRC = '/assets/background.mp4';
const IMAGE_SRC = '/assets/background.jpg';

/**
 * The deck's background engine.
 *
 * Three independent media tiers, each falling through to the next when the
 * asset is absent, so the interface never boots onto a blank canvas:
 *   1. a looping Higgsfield video at /public/assets/background.mp4
 *   2. a still frame at /public/assets/background.jpg
 *   3. a procedural CSS city-glow gradient that always renders
 *
 * On top sit the readability layers — a tunable dark mask, a scrolling grid,
 * a radial vignette and film grain — all parallaxed against the pointer at
 * different depths to fake perspective.
 */
export function BackgroundLayer() {
  const { settings } = useSystem();
  const mouse = useMousePosition();
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Springs keep the parallax weighty rather than twitchy.
  const springX = useSpring(rawX, { stiffness: 42, damping: 18, mass: 0.6 });
  const springY = useSpring(rawY, { stiffness: 42, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (!settings.parallax) {
      rawX.set(0);
      rawY.set(0);
      return;
    }
    rawX.set(mouse.x);
    rawY.set(mouse.y);
  }, [mouse.x, mouse.y, settings.parallax, rawX, rawY]);

  // Depth tiers: media drifts most, the grid less, the vignette barely at all.
  const mediaX = useTransform(springX, (v) => v * -26);
  const mediaY = useTransform(springY, (v) => v * -18);
  const mediaRotX = useTransform(springY, (v) => v * 2.2);
  const mediaRotY = useTransform(springX, (v) => v * -2.8);

  const gridX = useTransform(springX, (v) => v * -14);
  const gridY = useTransform(springY, (v) => v * -10);

  const glowX = useTransform(springX, (v) => v * 40);
  const glowY = useTransform(springY, (v) => v * 28);

  const showVideo = !videoFailed;
  const showImage = videoFailed && !imageFailed;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-deck-void"
      aria-hidden="true"
    >
      {/* Tier 3 — procedural fallback. Always painted, always behind. */}
      <motion.div
        className="absolute -inset-[8%]"
        style={{
          x: mediaX,
          y: mediaY,
          background:
            'radial-gradient(70% 55% at 22% 18%, rgba(34,228,255,0.24) 0%, transparent 62%),' +
            'radial-gradient(60% 50% at 82% 72%, rgba(255,45,155,0.22) 0%, transparent 60%),' +
            'radial-gradient(90% 70% at 50% 110%, rgba(168,85,247,0.2) 0%, transparent 64%),' +
            'linear-gradient(170deg, #060a14 0%, #04070f 48%, #0a0715 100%)',
        }}
      />

      {/* Tier 1 / 2 — operator-supplied media. */}
      <motion.div
        className="absolute -inset-[6%] preserve-3d"
        style={{
          x: mediaX,
          y: mediaY,
          rotateX: settings.parallax ? mediaRotX : 0,
          rotateY: settings.parallax ? mediaRotY : 0,
        }}
      >
        {showVideo ? (
          <video
            className="h-full w-full scale-110 object-cover opacity-90"
            src={VIDEO_SRC}
            poster={IMAGE_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
          />
        ) : null}

        {showImage ? (
          <img
            className="h-full w-full scale-110 object-cover opacity-85"
            src={IMAGE_SRC}
            alt=""
            onError={() => setImageFailed(true)}
          />
        ) : null}
      </motion.div>

      {/* Drifting chromatic bloom — keeps a still image from feeling frozen. */}
      <motion.div
        className="absolute -inset-1/4 opacity-60 mix-blend-screen"
        style={{
          x: glowX,
          y: glowY,
          background:
            'radial-gradient(38% 38% at 30% 32%, rgba(34,228,255,0.18), transparent 70%),' +
            'radial-gradient(34% 34% at 72% 64%, rgba(255,45,155,0.16), transparent 70%)',
        }}
      />

      {/* Readability mask — the single most important layer over bright media. */}
      <div
        className="absolute inset-0 bg-deck-void transition-opacity duration-500"
        style={{ opacity: settings.overlayOpacity }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-deck-void/85 via-transparent to-deck-void/90" />

      {/* Perspective grid. */}
      {settings.gridVisible ? (
        <>
          <motion.div
            className="absolute -inset-[10%] bg-grid-fine bg-grid-fine opacity-[0.55]"
            style={{ x: gridX, y: gridY }}
          />
          <motion.div
            className="absolute -inset-[10%] bg-grid-coarse bg-grid-coarse opacity-40"
            style={{ x: gridX, y: gridY }}
          />
        </>
      ) : null}

      {/* Horizon glow line — the "city edge". */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

      {/* Vignette. */}
      {settings.vignette ? <div className="absolute inset-0 bg-vignette" /> : null}

      {/* Grain + CRT scanlines. */}
      <div className="noise-overlay absolute inset-0 opacity-[0.045] mix-blend-overlay" />
      {settings.scanlines ? (
        <>
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.6) 3px, rgba(0,0,0,0.6) 4px)',
            }}
          />
          <div className="absolute inset-x-0 h-40 animate-scanline bg-gradient-to-b from-transparent via-cyan-400/[0.07] to-transparent" />
        </>
      ) : null}
    </div>
  );
}
