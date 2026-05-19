'use client';

import { User, Users } from 'lucide-react';
import { useAppMode } from '../context/AppModeContext';

export function ModeToggle() {
  const { mode, setMode } = useAppMode();
  const isCrew = mode === 'crew';

  return (
    <div
      className="flex items-center bg-slate-950 border p-0.5"
      style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.35)' }}
    >
      <button
        onClick={() => setMode('personal')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all"
        style={
          !isCrew
            ? {
                backgroundColor: 'var(--accent)',
                color: 'rgb(2,6,23)',
                boxShadow: '0 0 10px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
              }
            : { color: 'rgb(100,116,139)' }
        }
      >
        <User size={12} />
        Personal
      </button>
      <button
        onClick={() => setMode('crew')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all"
        style={
          isCrew
            ? {
                backgroundColor: 'var(--accent)',
                color: 'rgb(2,6,23)',
                boxShadow: '0 0 10px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
              }
            : { color: 'rgb(100,116,139)' }
        }
      >
        <Users size={12} />
        Crew
      </button>
    </div>
  );
}