import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronRight,
  CornerDownLeft,
  ExternalLink,
  Eye,
  Grid3x3,
  Globe,
  LayoutGrid,
  ListPlus,
  Play,
  Radio,
  RotateCcw,
  SkipForward,
  Sparkles,
  Terminal,
  Volume2,
  Waves,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { fuzzyRank } from '../lib/fuzzy';
import { audioEngine, AMBIENT_SOURCES } from '../lib/audioEngine';
import { useSystem } from '../context/SystemContext';
import { useWindows } from '../context/WindowContext';
import { useTasks } from '../context/TaskContext';
import { usePomodoro, MODE_LIST } from '../context/PomodoroContext';
import { WIDGETS } from './widgetRegistry';

const EXTERNAL_LINKS = [
  { id: 'link-higgsfield', label: 'Higgsfield', url: 'https://higgsfield.ai', hint: 'Generate backdrop media' },
  { id: 'link-react', label: 'React Docs', url: 'https://react.dev', hint: 'react.dev' },
  { id: 'link-tailwind', label: 'Tailwind CSS Docs', url: 'https://tailwindcss.com/docs', hint: 'tailwindcss.com' },
  { id: 'link-motion', label: 'Framer Motion Docs', url: 'https://www.framer.com/motion/', hint: 'framer.com/motion' },
  { id: 'link-lucide', label: 'Lucide Icons', url: 'https://lucide.dev/icons/', hint: 'lucide.dev' },
  { id: 'link-mdn', label: 'MDN Web Audio API', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API', hint: 'developer.mozilla.org' },
];

const SECTION_ORDER = ['Directive', 'Panels', 'Neural Sync', 'Task Command', 'Ambient', 'Deck', 'External'];

/** Normalise loose input ("react.dev", "www.x.com") into a navigable URL. */
function toUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed)) return `https://${trimmed}`;
  return null;
}

/**
 * Quick Launcher — the deck's command palette (Ctrl+K / Cmd+K).
 *
 * Search spans every panel, timer action, ambient bed and bookmark. Typing
 * `+ something` drafts a task directly; typing a bare domain offers to launch
 * it in a new tab.
 */
export function CommandPalette({ open, onClose }) {
  const { sfx, update, settings, pushLog, toast, toggleSound } = useSystem();
  const { open: openWindow, resetLayout, windows } = useWindows();
  const { addTask, completeAll, clearCompleted, setFilters, filters } = useTasks();
  const pomodoro = usePomodoro();

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const run = useCallback(
    (action) => {
      sfx('execute');
      onClose();
      // Let the exit animation start before the side effect lands.
      window.setTimeout(action, 60);
    },
    [sfx, onClose],
  );

  const commands = useMemo(() => {
    const items = [];

    // ---- Panels -----------------------------------------------------
    WIDGETS.forEach((widget) => {
      const isOpen = windows[widget.id]?.open;
      items.push({
        id: `panel-${widget.id}`,
        section: 'Panels',
        label: `${isOpen ? 'Focus' : 'Restore'} ${widget.title}`,
        hint: widget.subtitle,
        keywords: `panel window ${widget.id} ${widget.title}`,
        icon: widget.icon,
        perform: () => {
          openWindow(widget.id);
          pushLog(`PANEL FOCUS — ${widget.title.toUpperCase()}`, 'info');
        },
      });
    });

    // ---- Neural Sync -------------------------------------------------
    items.push({
      id: 'timer-toggle',
      section: 'Neural Sync',
      label: pomodoro.running ? 'Hold neural sync timer' : 'Engage neural sync timer',
      hint: pomodoro.modeConfig.label,
      keywords: 'pomodoro timer start pause focus',
      icon: Play,
      perform: pomodoro.toggle,
    });
    items.push({
      id: 'timer-skip',
      section: 'Neural Sync',
      label: 'Skip current phase',
      hint: 'Advance to the next block',
      keywords: 'pomodoro skip next phase',
      icon: SkipForward,
      perform: pomodoro.skip,
    });
    items.push({
      id: 'timer-reset',
      section: 'Neural Sync',
      label: 'Reset timer',
      hint: 'Restore the full duration',
      keywords: 'pomodoro reset restart',
      icon: RotateCcw,
      perform: pomodoro.reset,
    });
    MODE_LIST.forEach((mode) => {
      items.push({
        id: `timer-mode-${mode.id}`,
        section: 'Neural Sync',
        label: `Set mode: ${mode.label}`,
        hint: `${mode.minutes} minutes`,
        keywords: `mode ${mode.id} ${mode.short} ${mode.label}`,
        icon: Sparkles,
        perform: () => pomodoro.selectMode(mode.id),
      });
    });

    // ---- Task Command -------------------------------------------------
    items.push({
      id: 'tasks-complete-all',
      section: 'Task Command',
      label: 'Complete every open directive',
      hint: 'Mark the whole queue done',
      keywords: 'task complete all finish clear',
      icon: ListPlus,
      perform: () => {
        const changed = completeAll();
        sfx('success');
        toast(`${changed} directive(s) marked complete.`, { level: 'ok' });
        pushLog(`BULK COMPLETE — ${changed} RECORD(S)`, 'ok');
      },
    });
    items.push({
      id: 'tasks-purge',
      section: 'Task Command',
      label: 'Purge completed directives',
      hint: 'Delete finished records',
      keywords: 'task purge delete completed clean',
      icon: RotateCcw,
      perform: () => {
        const removed = clearCompleted();
        toast(`${removed} completed record(s) purged.`, { level: 'warn' });
        pushLog(`${removed} COMPLETED RECORD(S) PURGED`, 'warn');
      },
    });
    ['all', 'active', 'done'].forEach((status) => {
      items.push({
        id: `tasks-filter-${status}`,
        section: 'Task Command',
        label: `Filter queue: ${status}`,
        hint: 'Change the visible directive set',
        keywords: `filter status ${status} task`,
        icon: Eye,
        perform: () => setFilters({ ...filters, status }),
      });
    });

    // ---- Ambient --------------------------------------------------------
    AMBIENT_SOURCES.forEach((source) => {
      items.push({
        id: `ambient-${source.id}`,
        section: 'Ambient',
        label: `Toggle ${source.label}`,
        hint: source.description,
        keywords: `ambient sound noise ${source.id} ${source.label}`,
        icon: source.id === 'rain' ? Waves : Radio,
        perform: async () => {
          if (!settings.soundEnabled) {
            toast('Audio bus is muted. Enable sound first.', { level: 'warn' });
            return;
          }
          await audioEngine.unlock();
          const isOn = audioEngine.toggleAmbient(source.id, 0.32);
          pushLog(`AMBIENT ${source.label.toUpperCase()} ${isOn ? 'ONLINE' : 'OFFLINE'}`, 'info');
        },
      });
    });

    // ---- Deck -----------------------------------------------------------
    items.push({
      id: 'deck-sound',
      section: 'Deck',
      label: settings.soundEnabled ? 'Mute audio bus' : 'Unmute audio bus',
      hint: 'Global sound effects',
      keywords: 'sound audio mute volume fx',
      icon: Volume2,
      perform: toggleSound,
    });
    items.push({
      id: 'deck-grid',
      section: 'Deck',
      label: settings.gridVisible ? 'Hide grid overlay' : 'Show grid overlay',
      hint: 'Backdrop perspective grid',
      keywords: 'grid overlay background toggle',
      icon: Grid3x3,
      perform: () => update({ gridVisible: !settings.gridVisible }),
    });
    items.push({
      id: 'deck-scanlines',
      section: 'Deck',
      label: settings.scanlines ? 'Disable scanlines' : 'Enable scanlines',
      hint: 'CRT raster effect',
      keywords: 'scanline crt raster effect',
      icon: Terminal,
      perform: () => update({ scanlines: !settings.scanlines }),
    });
    items.push({
      id: 'deck-parallax',
      section: 'Deck',
      label: settings.parallax ? 'Disable parallax tracking' : 'Enable parallax tracking',
      hint: 'Pointer-driven backdrop depth',
      keywords: 'parallax mouse depth motion',
      icon: Eye,
      perform: () => update({ parallax: !settings.parallax }),
    });
    items.push({
      id: 'deck-utc',
      section: 'Deck',
      label: settings.utcMode ? 'Clock: switch to local time' : 'Clock: switch to UTC',
      hint: 'Status bar chronometer',
      keywords: 'clock utc local time zone',
      icon: Globe,
      perform: () => update({ utcMode: !settings.utcMode }),
    });
    items.push({
      id: 'deck-layout',
      section: 'Deck',
      label: 'Reset window layout',
      hint: 'Restore the default arrangement',
      keywords: 'layout reset windows arrange default',
      icon: LayoutGrid,
      perform: () => {
        resetLayout();
        toast('Window layout restored to defaults.', { level: 'info' });
      },
    });

    // ---- External --------------------------------------------------------
    EXTERNAL_LINKS.forEach((link) => {
      items.push({
        id: link.id,
        section: 'External',
        label: `Launch ${link.label}`,
        hint: link.hint,
        keywords: `open launch url external ${link.label} ${link.url}`,
        icon: ExternalLink,
        perform: () => window.open(link.url, '_blank', 'noopener,noreferrer'),
      });
    });

    return items;
  }, [
    windows,
    openWindow,
    pushLog,
    pomodoro,
    completeAll,
    clearCompleted,
    setFilters,
    filters,
    settings,
    update,
    toggleSound,
    resetLayout,
    toast,
    sfx,
  ]);

  // Contextual commands derived from what the operator is typing.
  const dynamic = useMemo(() => {
    const items = [];
    const trimmed = query.trim();

    if (trimmed.startsWith('+')) {
      const title = trimmed.slice(1).trim();
      if (title) {
        items.push({
          id: 'dynamic-task',
          section: 'Directive',
          label: `Queue directive: "${title}"`,
          hint: 'Adds a HIGH priority task, 25m estimate',
          icon: ListPlus,
          perform: () => {
            addTask({ title, priority: 'HIGH', estimate: 25 });
            sfx('confirm');
            toast(`Directive queued: ${title}`, { level: 'ok' });
            pushLog(`TASK QUEUED — [HIGH] ${title.toUpperCase()}`, 'info');
          },
        });
      }
    }

    const url = toUrl(trimmed);
    if (url) {
      items.push({
        id: 'dynamic-url',
        section: 'Directive',
        label: `Launch ${url}`,
        hint: 'Open in a new tab',
        icon: ExternalLink,
        perform: () => window.open(url, '_blank', 'noopener,noreferrer'),
      });
    }

    return items;
  }, [query, addTask, sfx, toast, pushLog]);

  const { results, scores } = useMemo(() => {
    const searchable = query.trim().startsWith('+') ? [] : commands;
    const ranked = fuzzyRank(searchable, query, (item) => [
      item.label,
      item.section,
      item.hint ?? '',
      item.keywords ?? '',
    ]);

    const scoreMap = new Map(ranked.map((entry) => [entry.item.id, entry.score]));
    // Contextual commands are what the operator just typed — always on top.
    dynamic.forEach((item) => scoreMap.set(item.id, Number.POSITIVE_INFINITY));

    return {
      results: [...dynamic, ...ranked.map((entry) => entry.item)].slice(0, 40),
      scores: scoreMap,
    };
  }, [commands, dynamic, query]);

  const grouped = useMemo(() => {
    const map = new Map();
    results.forEach((item) => {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section).push(item);
    });

    const entries = [...map.entries()];
    if (!query.trim()) {
      return entries.sort(
        (a, b) => SECTION_ORDER.indexOf(a[0]) - SECTION_ORDER.indexOf(b[0]),
      );
    }

    // With a query, sections lead with their best match. Holding the fixed
    // section order here would strand the top hit below weaker ones — and put
    // whatever sits at index 0 one Enter away from running.
    const best = (items) =>
      items.reduce((max, item) => Math.max(max, scores.get(item.id) ?? -1), -1);
    return entries.sort((a, b) => best(b[1]) - best(a[1]));
  }, [results, scores, query]);

  // Flattened in render order so arrow keys traverse what the eye sees.
  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  // Keep the highlighted row in view during keyboard traversal.
  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-index="${cursor}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((prev) => (flat.length === 0 ? 0 : (prev + 1) % flat.length));
      sfx('type');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((prev) => (flat.length === 0 ? 0 : (prev - 1 + flat.length) % flat.length));
      sfx('type');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = flat[cursor];
      if (selected) run(selected.perform);
      else sfx('error');
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="absolute inset-0 bg-deck-void/80 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -24, scale: 0.96, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -16, scale: 0.97, filter: 'blur(8px)' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="glass-panel scanlines relative w-full max-w-2xl border-cyan-400/40 shadow-glow-cyan-lg"
          >
            {/* Input row. */}
            <div className="relative flex items-center gap-2.5 border-b border-cyan-500/25 px-4 py-3">
              <ChevronRight className="h-4 w-4 shrink-0 animate-pulse text-cyan-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  sfx('type');
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search commands, + to queue a directive, or type a URL…"
                aria-label="Command search"
                className="flex-1 bg-transparent font-mono text-sm text-cyan-50 placeholder:text-slate-600 focus:outline-none"
              />
              <kbd className="hidden shrink-0 rounded border border-cyan-500/30 px-1.5 py-0.5 font-mono text-[9px] text-cyan-300/60 sm:block">
                ESC
              </kbd>
            </div>

            {/* Results. */}
            <div ref={listRef} className="max-h-[54vh] overflow-y-auto p-2">
              {grouped.length === 0 ? (
                <p className="px-3 py-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600">
                  No matching command in the index
                </p>
              ) : null}

              {grouped.map(([section, items]) => (
                <div key={section} className="mb-2 last:mb-0">
                  <p className="label-hud px-2 py-1">{section}</p>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const index = flat.indexOf(item);
                      const isActive = index === cursor;
                      const Icon = item.icon ?? Terminal;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-index={index}
                          onMouseEnter={() => setCursor(index)}
                          onClick={() => run(item.perform)}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors duration-150',
                            isActive
                              ? 'border-cyan-400/60 bg-cyan-500/12 shadow-glow-cyan'
                              : 'border-transparent hover:bg-slate-800/50',
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-3.5 w-3.5 shrink-0',
                              isActive ? 'text-cyan-300' : 'text-slate-500',
                            )}
                            strokeWidth={2.2}
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                'block truncate font-sans text-[13px] font-medium',
                                isActive ? 'text-cyan-100' : 'text-slate-300',
                              )}
                            >
                              {item.label}
                            </span>
                            {item.hint ? (
                              <span className="block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-600">
                                {item.hint}
                              </span>
                            ) : null}
                          </span>
                          {isActive ? (
                            <CornerDownLeft className="h-3 w-3 shrink-0 text-cyan-400" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer legend. */}
            <div className="flex items-center justify-between gap-3 border-t border-cyan-500/20 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">
              <span className="flex items-center gap-3">
                <span>↑↓ NAVIGATE</span>
                <span>⏎ EXECUTE</span>
                <span className="hidden sm:inline">+ QUEUE TASK</span>
              </span>
              <span className="text-cyan-500/50">{flat.length} RESULTS</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
