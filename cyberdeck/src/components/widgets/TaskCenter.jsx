import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleDashed,
  Clock3,
  Filter,
  Plus,
  Search,
  Trash2,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatMinutes } from '../../lib/format';
import { fireAllClearConfetti, fireTaskConfetti, originFromElement } from '../../lib/confetti';
import { useSystem } from '../../context/SystemContext';
import { PRIORITIES, PRIORITY_LIST, useTasks } from '../../context/TaskContext';
import { NeonButton } from '../ui/NeonButton';

const STATUS_FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'active', label: 'ACTIVE' },
  { id: 'done', label: 'DONE' },
];

const ESTIMATE_PRESETS = [5, 15, 25, 45, 90];

/** One row of the queue. Memo-free by design — the list is short and animated. */
function TaskRow({ task, onToggle, onDelete, onMove, onRename, index }) {
  const { sfx } = useSystem();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const rowRef = useRef(null);
  const priority = PRIORITIES[task.priority] ?? PRIORITIES.STABLE;

  const commitRename = () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === task.title) {
      setDraft(task.title);
      return;
    }
    onRename(task.id, trimmed);
    sfx('confirm');
  };

  return (
    <motion.li
      ref={rowRef}
      layout
      layoutId={task.id}
      initial={{ opacity: 0, x: -28, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{
        opacity: 0,
        x: 42,
        scale: 0.9,
        filter: 'blur(8px)',
        transition: { duration: 0.22 },
      }}
      transition={{ type: 'spring', stiffness: 420, damping: 32, delay: index * 0.015 }}
      className={cn(
        'group relative flex items-start gap-2 rounded-md border bg-slate-950/50 p-2 pr-1.5',
        'transition-colors duration-200 hover:bg-slate-900/60',
        task.done ? 'border-slate-700/40 opacity-55' : priority.border,
      )}
    >
      {/* Priority rail. */}
      <span
        className={cn(
          'absolute left-0 top-1.5 h-[calc(100%-0.75rem)] w-[2px] rounded-full',
          task.done ? 'bg-slate-600' : priority.bar,
        )}
      />

      <button
        type="button"
        aria-label={task.done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        aria-pressed={task.done}
        onClick={() => onToggle(task, rowRef.current)}
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all duration-200',
          task.done
            ? 'border-lime-400/70 bg-lime-400/20 text-lime-300 shadow-glow-lime'
            : 'border-cyan-500/50 text-transparent hover:border-cyan-300 hover:bg-cyan-400/15 hover:shadow-glow-cyan',
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitRename();
              if (event.key === 'Escape') {
                setDraft(task.title);
                setEditing(false);
              }
            }}
            className="input-hud px-1.5 py-0.5 text-[12px]"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setEditing(true)}
            title="Double-click to edit"
            className={cn(
              'block w-full break-words text-left font-sans text-[13px] font-medium leading-snug',
              task.done ? 'text-slate-500 line-through' : 'text-slate-100',
            )}
          >
            {task.title}
          </button>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={cn('chip', priority.border, priority.bg, priority.text)}>
            [{priority.label}]
          </span>
          <span className="chip border-slate-600/40 bg-slate-800/40 text-slate-400">
            <Clock3 className="h-2.5 w-2.5" />
            {formatMinutes(task.estimate)}
          </span>
        </div>
      </div>

      {/* Row controls fade in on hover / focus. */}
      <div className="flex shrink-0 flex-col gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          aria-label="Move task up"
          onClick={() => onMove(task.id, -1)}
          className="btn-icon h-5 w-5"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          aria-label="Move task down"
          onClick={() => onMove(task.id, 1)}
          className="btn-icon h-5 w-5"
        >
          <ArrowDown className="h-3 w-3" />
        </button>
        <button
          type="button"
          aria-label="Delete task"
          onClick={() => onDelete(task)}
          className="btn-icon h-5 w-5 hover:border-red-400/60 hover:bg-red-500/10 hover:text-red-300 hover:shadow-glow-red"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </motion.li>
  );
}

/**
 * Cyber Task Command Center — the deck's work queue.
 *
 * Completing a task fires a neon confetti burst anchored to the row itself
 * plus the success arpeggio, so the reward is both visual and audible.
 */
export function TaskCenter() {
  const { sfx, pushLog, toast } = useSystem();
  const {
    visibleTasks,
    stats,
    filters,
    setFilters,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    moveTask,
    clearCompleted,
  } = useTasks();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [estimate, setEstimate] = useState(25);
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    const created = addTask({ title, priority, estimate });
    if (!created) {
      sfx('error');
      toast('Task designation cannot be empty.', { level: 'warn' });
      return;
    }
    setTitle('');
    sfx('confirm');
    pushLog(`TASK QUEUED — [${priority}] ${created.title.toUpperCase()}`, 'info');
  };

  const handleToggle = useCallback(
    (task, element) => {
      const becameDone = toggleTask(task.id);
      if (becameDone) {
        sfx('success');
        fireTaskConfetti(originFromElement(element));
        pushLog(`TASK CLEARED — ${task.title.toUpperCase()}`, 'ok');

        // Everything in the queue done? Escalate the celebration.
        if (stats.active === 1) {
          fireAllClearConfetti();
          toast('QUEUE CLEAR. All objectives neutralised.', { level: 'ok' });
        }
      } else {
        sfx('toggleOff');
        pushLog(`TASK REOPENED — ${task.title.toUpperCase()}`, 'warn');
      }
    },
    [toggleTask, sfx, pushLog, stats.active, toast],
  );

  const handleDelete = useCallback(
    (task) => {
      deleteTask(task.id);
      sfx('error');
      pushLog(`TASK PURGED — ${task.title.toUpperCase()}`, 'warn');
    },
    [deleteTask, sfx, pushLog],
  );

  const handleMove = useCallback(
    (id, direction) => {
      moveTask(id, direction);
      sfx('click');
    },
    [moveTask, sfx],
  );

  const handleRename = useCallback(
    (id, nextTitle) => updateTask(id, { title: nextTitle }),
    [updateTask],
  );

  const activeFilterCount = useMemo(
    () =>
      (filters.status !== 'all' ? 1 : 0) +
      (filters.priority !== 'all' ? 1 : 0) +
      (filters.query ? 1 : 0),
    [filters],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {/* ---- Composer ------------------------------------------------ */}
      <form onSubmit={handleSubmit} className="glass-inset shrink-0 space-y-2 p-2">
        <div className="flex gap-1.5">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="New directive…"
            aria-label="Task designation"
            className="input-hud py-1.5 text-[12px]"
          />
          <NeonButton type="submit" icon={Plus} sound={null} className="shrink-0 px-2.5">
            ADD
          </NeonButton>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PRIORITY_LIST.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPriority(item.id);
                sfx('click');
              }}
              className={cn(
                'chip transition-all duration-200',
                priority === item.id
                  ? cn(item.border, item.bg, item.text, item.glow)
                  : 'border-slate-700/50 bg-slate-900/40 text-slate-500 hover:border-slate-500',
              )}
            >
              [{item.label}]
            </button>
          ))}

          <span className="ml-auto flex items-center gap-1">
            <Clock3 className="h-3 w-3 text-slate-500" />
            {ESTIMATE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setEstimate(preset);
                  sfx('click');
                }}
                className={cn(
                  'rounded-sm border px-1 py-0.5 font-mono text-[9px] transition-all duration-200',
                  estimate === preset
                    ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-200 shadow-glow-cyan'
                    : 'border-slate-700/50 text-slate-500 hover:border-cyan-500/40 hover:text-cyan-300',
                )}
              >
                {preset}m
              </button>
            ))}
          </span>
        </div>
      </form>

      {/* ---- Filter bar ---------------------------------------------- */}
      <div className="shrink-0 space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-600" />
            <input
              value={filters.query}
              onChange={(event) => setFilters({ ...filters, query: event.target.value })}
              placeholder="Filter queue…"
              aria-label="Search tasks"
              className="input-hud py-1 pl-7 text-[11px]"
            />
          </div>
          <NeonButton
            icon={Filter}
            size="sm"
            active={showFilters || activeFilterCount > 0}
            onClick={() => setShowFilters((prev) => !prev)}
            className="shrink-0"
          >
            {activeFilterCount > 0 ? activeFilterCount : ''}
          </NeonButton>
        </div>

        <AnimatePresence initial={false}>
          {showFilters ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="glass-inset space-y-2 p-2">
                <div className="flex flex-wrap gap-1">
                  <span className="label-hud w-14 self-center">STATUS</span>
                  {STATUS_FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFilters({ ...filters, status: item.id });
                        sfx('click');
                      }}
                      className={cn(
                        'chip transition-all duration-200',
                        filters.status === item.id
                          ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-200 shadow-glow-cyan'
                          : 'border-slate-700/50 text-slate-500 hover:border-cyan-500/40',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="label-hud w-14 self-center">PRIORITY</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ ...filters, priority: 'all' });
                      sfx('click');
                    }}
                    className={cn(
                      'chip transition-all duration-200',
                      filters.priority === 'all'
                        ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-200 shadow-glow-cyan'
                        : 'border-slate-700/50 text-slate-500 hover:border-cyan-500/40',
                    )}
                  >
                    ALL
                  </button>
                  {PRIORITY_LIST.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFilters({ ...filters, priority: item.id });
                        sfx('click');
                      }}
                      className={cn(
                        'chip transition-all duration-200',
                        filters.priority === item.id
                          ? cn(item.border, item.bg, item.text, item.glow)
                          : 'border-slate-700/50 text-slate-500 hover:border-slate-500',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* ---- Queue ---------------------------------------------------- */}
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleTasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              index={index}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onMove={handleMove}
              onRename={handleRename}
            />
          ))}
        </AnimatePresence>

        {visibleTasks.length === 0 ? (
          <motion.li
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2 py-8 text-center"
          >
            <CircleDashed className="h-7 w-7 animate-spin-slow text-cyan-500/40" />
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600">
              {activeFilterCount > 0 ? 'No matches in queue' : 'Queue empty — deck idle'}
            </p>
          </motion.li>
        ) : null}
      </ul>

      {/* ---- Footer stats ---------------------------------------------- */}
      <div className="shrink-0 space-y-1.5 border-t border-cyan-500/15 pt-2">
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.15em]">
          <span className="text-cyan-300/70">
            {stats.active} ACTIVE / {stats.total} TOTAL
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <Zap className="h-3 w-3 text-amber-400" />
            {formatMinutes(stats.remainingMinutes)} LEFT
          </span>
        </div>

        <div className="h-1 overflow-hidden rounded-full bg-slate-800/70">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-pink-500"
            animate={{ width: `${stats.completion}%` }}
            transition={{ type: 'spring', stiffness: 160, damping: 26 }}
            style={{ boxShadow: '0 0 10px rgba(34,228,255,0.7)' }}
          />
        </div>

        {stats.done > 0 ? (
          <NeonButton
            size="sm"
            variant="pink"
            icon={Trash2}
            sound="error"
            onClick={() => {
              const removed = clearCompleted();
              pushLog(`${removed} COMPLETED RECORD(S) PURGED`, 'warn');
            }}
            className="w-full"
          >
            PURGE {stats.done} COMPLETED
          </NeonButton>
        ) : null}
      </div>
    </div>
  );
}
