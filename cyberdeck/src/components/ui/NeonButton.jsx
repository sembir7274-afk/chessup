import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { useSystem } from '../../context/SystemContext';

const VARIANTS = {
  cyan: 'btn-hud',
  pink: 'btn-hud btn-hud-pink',
  danger: 'btn-hud btn-hud-danger',
};

const SIZES = {
  sm: 'px-2 py-1 text-[10px]',
  md: 'px-3 py-1.5 text-[11px]',
  lg: 'px-4 py-2.5 text-xs',
};

/**
 * The deck's primary control. Every press routes through the synthesised
 * sound bus, and hover lifts both the scale and the glow intensity.
 */
export const NeonButton = forwardRef(function NeonButton(
  {
    children,
    className,
    variant = 'cyan',
    size = 'md',
    active = false,
    sound = 'beep',
    icon: Icon,
    onClick,
    type = 'button',
    ...props
  },
  ref,
) {
  const { sfx } = useSystem();

  const handleClick = (event) => {
    if (sound) sfx(sound);
    onClick?.(event);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      whileHover={props.disabled ? undefined : { scale: 1.04 }}
      whileTap={props.disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 520, damping: 26 }}
      onClick={handleClick}
      onHoverStart={() => !props.disabled && sfx('click')}
      className={cn(VARIANTS[variant], SIZES[size], active && 'btn-hud-active', className)}
      {...props}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={2.2} /> : null}
      {children}
    </motion.button>
  );
});

/** Compact square control used in window title bars. */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, className, onClick, sound = 'click', tone = 'cyan', ...props },
  ref,
) {
  const { sfx } = useSystem();

  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 560, damping: 24 }}
      onClick={(event) => {
        if (sound) sfx(sound);
        onClick?.(event);
      }}
      className={cn(
        'btn-icon',
        tone === 'pink' && 'hover:border-pink-400/60 hover:bg-pink-500/10 hover:text-pink-200 hover:shadow-glow-pink',
        tone === 'danger' && 'hover:border-red-400/60 hover:bg-red-500/10 hover:text-red-200 hover:shadow-glow-red',
        className,
      )}
      {...props}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
    </motion.button>
  );
});
