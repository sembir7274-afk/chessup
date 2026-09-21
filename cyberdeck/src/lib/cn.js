import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Conditional class names with conflict-aware Tailwind merging.
 * `cn('p-2', condition && 'p-4')` resolves to the last-wins `p-4`.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
