import { AnimatePresence } from 'framer-motion';
import { useIsCompact } from '../hooks/useMediaQuery';
import { Window } from './Window';
import { WIDGETS } from './widgetRegistry';

/**
 * The window surface.
 *
 * Wide viewports get the free-floating, draggable arrangement. Below 1024px
 * the deck degrades to a scrolling stack — dragging pixel-positioned panels on
 * a phone is hostile, so the frames keep their chrome but drop their geometry.
 */
export function Desktop() {
  const compact = useIsCompact();

  const frames = (
    <AnimatePresence>
      {WIDGETS.map((widget, index) => {
        const Component = widget.component;
        return (
          <Window
            key={widget.id}
            id={widget.id}
            title={widget.title}
            subtitle={widget.subtitle}
            icon={widget.icon}
            accent={widget.accent}
            index={index}
            compact={compact}
          >
            <Component />
          </Window>
        );
      })}
    </AnimatePresence>
  );

  if (compact) {
    return (
      <main className="relative z-10 flex-1 space-y-3 overflow-y-auto px-3 py-3">{frames}</main>
    );
  }

  return (
    // The flex child reserves the space between header and dock; the window
    // layer itself is viewport-anchored so panel geometry, drag clamping and
    // maximise all share one coordinate space.
    <main className="relative z-10 flex-1 overflow-hidden" aria-label="Widget desktop">
      <div className="pointer-events-none fixed inset-0 z-10">{frames}</div>
    </main>
  );
}
