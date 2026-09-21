import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const TaskContext = createContext(null);

export const PRIORITIES = {
  CRITICAL: {
    id: 'CRITICAL',
    label: 'CRITICAL',
    rank: 0,
    text: 'text-red-300',
    border: 'border-red-500/50',
    bg: 'bg-red-500/10',
    glow: 'shadow-glow-red',
    bar: 'bg-neon-red',
  },
  HIGH: {
    id: 'HIGH',
    label: 'HIGH',
    rank: 1,
    text: 'text-amber-300',
    border: 'border-amber-500/50',
    bg: 'bg-amber-500/10',
    glow: 'shadow-glow-amber',
    bar: 'bg-neon-amber',
  },
  STABLE: {
    id: 'STABLE',
    label: 'STABLE',
    rank: 2,
    text: 'text-cyan-300',
    border: 'border-cyan-500/50',
    bg: 'bg-cyan-500/10',
    glow: 'shadow-glow-cyan',
    bar: 'bg-neon-cyan',
  },
};

export const PRIORITY_LIST = Object.values(PRIORITIES).sort((a, b) => a.rank - b.rank);

const SEED_TASKS = [
  {
    id: 'seed-1',
    title: 'Patch ICE breaker firmware',
    priority: 'CRITICAL',
    estimate: 45,
    done: false,
    createdAt: Date.now() - 1000 * 60 * 42,
    completedAt: null,
  },
  {
    id: 'seed-2',
    title: 'Reroute district 9 relay traffic',
    priority: 'HIGH',
    estimate: 25,
    done: false,
    createdAt: Date.now() - 1000 * 60 * 30,
    completedAt: null,
  },
  {
    id: 'seed-3',
    title: 'Archive neural sync logs',
    priority: 'STABLE',
    estimate: 15,
    done: true,
    createdAt: Date.now() - 1000 * 60 * 90,
    completedAt: Date.now() - 1000 * 60 * 12,
  },
];

const uid = () => `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Persistent task queue plus the filter state the command centre reads. */
export function TaskProvider({ children }) {
  const [tasks, setTasks] = useLocalStorage('cyberdeck.tasks', SEED_TASKS);
  const [filters, setFilters] = useLocalStorage('cyberdeck.taskFilters', {
    status: 'all',
    priority: 'all',
    query: '',
  });

  const addTask = useCallback(
    ({ title, priority = 'STABLE', estimate = 25 }) => {
      const trimmed = title.trim();
      if (!trimmed) return null;
      const task = {
        id: uid(),
        title: trimmed,
        priority,
        estimate: Number(estimate) || 0,
        done: false,
        createdAt: Date.now(),
        completedAt: null,
      };
      setTasks((prev) => [task, ...prev]);
      return task;
    },
    [setTasks],
  );

  const updateTask = useCallback(
    (id, patch) => {
      setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)));
    },
    [setTasks],
  );

  const deleteTask = useCallback(
    (id) => setTasks((prev) => prev.filter((task) => task.id !== id)),
    [setTasks],
  );

  /** Flips completion and reports the resulting state so callers can celebrate. */
  const toggleTask = useCallback(
    (id) => {
      let becameDone = false;
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== id) return task;
          becameDone = !task.done;
          return {
            ...task,
            done: becameDone,
            completedAt: becameDone ? Date.now() : null,
          };
        }),
      );
      return becameDone;
    },
    [setTasks],
  );

  const moveTask = useCallback(
    (id, direction) => {
      setTasks((prev) => {
        const index = prev.findIndex((task) => task.id === id);
        const target = index + direction;
        if (index === -1 || target < 0 || target >= prev.length) return prev;
        const next = [...prev];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
    },
    [setTasks],
  );

  const clearCompleted = useCallback(() => {
    let removed = 0;
    setTasks((prev) => {
      const next = prev.filter((task) => !task.done);
      removed = prev.length - next.length;
      return next;
    });
    return removed;
  }, [setTasks]);

  const completeAll = useCallback(() => {
    let changed = 0;
    setTasks((prev) =>
      prev.map((task) => {
        if (task.done) return task;
        changed += 1;
        return { ...task, done: true, completedAt: Date.now() };
      }),
    );
    return changed;
  }, [setTasks]);

  const visibleTasks = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (filters.status === 'active' && task.done) return false;
      if (filters.status === 'done' && !task.done) return false;
      if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
      if (query && !task.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [tasks, filters]);

  const stats = useMemo(() => {
    const done = tasks.filter((task) => task.done).length;
    const active = tasks.length - done;
    const remainingMinutes = tasks
      .filter((task) => !task.done)
      .reduce((sum, task) => sum + (Number(task.estimate) || 0), 0);
    const critical = tasks.filter((task) => !task.done && task.priority === 'CRITICAL').length;
    return {
      total: tasks.length,
      done,
      active,
      critical,
      remainingMinutes,
      completion: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    };
  }, [tasks]);

  const value = useMemo(
    () => ({
      tasks,
      visibleTasks,
      filters,
      setFilters,
      stats,
      addTask,
      updateTask,
      deleteTask,
      toggleTask,
      moveTask,
      clearCompleted,
      completeAll,
    }),
    [
      tasks,
      visibleTasks,
      filters,
      setFilters,
      stats,
      addTask,
      updateTask,
      deleteTask,
      toggleTask,
      moveTask,
      clearCompleted,
      completeAll,
    ],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks must be used inside <TaskProvider>');
  return ctx;
}
