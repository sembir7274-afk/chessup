import { Activity, ListChecks, Radio, Timer, Waves } from 'lucide-react';
import { TaskCenter } from './widgets/TaskCenter';
import { PomodoroTimer } from './widgets/PomodoroTimer';
import { SystemMonitor } from './widgets/SystemMonitor';
import { AudioVisualizer } from './widgets/AudioVisualizer';
import { Soundboard } from './widgets/Soundboard';

/**
 * Single source of truth for the deck's widgets. The window manager, the dock
 * and the command palette all derive their entries from this list, so adding a
 * widget here wires it into every surface at once.
 */
export const WIDGETS = [
  {
    id: 'tasks',
    title: 'Task Command',
    subtitle: 'Directive queue',
    icon: ListChecks,
    accent: 'cyan',
    component: TaskCenter,
  },
  {
    id: 'pomodoro',
    title: 'Neural Sync',
    subtitle: 'Focus cycle timer',
    icon: Timer,
    accent: 'pink',
    component: PomodoroTimer,
  },
  {
    id: 'system',
    title: 'Diagnostics',
    subtitle: 'Core telemetry',
    icon: Activity,
    accent: 'violet',
    component: SystemMonitor,
  },
  {
    id: 'visualizer',
    title: 'Spectrum',
    subtitle: 'Audio analyser',
    icon: Waves,
    accent: 'amber',
    component: AudioVisualizer,
  },
  {
    id: 'soundboard',
    title: 'Ambient Bay',
    subtitle: 'Sound synthesis',
    icon: Radio,
    accent: 'pink',
    component: Soundboard,
  },
];

export const WIDGET_IDS = WIDGETS.map((widget) => widget.id);

export const WIDGET_MAP = WIDGETS.reduce((acc, widget) => {
  acc[widget.id] = widget;
  return acc;
}, {});
