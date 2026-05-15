'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Contact, Task, loadData, saveData } from '../../lib/storage';

const formatIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const getWeekStart = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getWeekDates = (start: Date) => {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    dates.push(next);
  }
  return dates;
};

const normalizeTaskDate = (value: string) => {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return formatIsoDate(parsed);
  }
  return value.slice(0, 10);
};

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// Returns a Set of task IDs that overlap with at least one other task on the same day
const getOverlappingIds = (dayTasks: Task[]): Set<string> => {
  const timed = dayTasks.filter((t) => t.startTime && t.endTime);
  const overlapping = new Set<string>();
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const b = timed[j];
      const aStart = toMinutes(a.startTime!);
      const aEnd = toMinutes(a.endTime!);
      const bStart = toMinutes(b.startTime!);
      const bEnd = toMinutes(b.endTime!);
      if (aStart < bEnd && aEnd > bStart) {
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }
  return overlapping;
};

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<string>(formatIsoDate(new Date()));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const currentDate = useMemo(() => new Date(selectedDate), [selectedDate]);
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const hours = Array.from({ length: 16 }, (_, index) => 6 + index);

  useEffect(() => {
    const data = loadData();
    setTasks(data.tasks);
    setContacts(data.contacts);
  }, []);

  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const moveWeek = (offset: number) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + offset * 7);
    setSelectedDate(formatIsoDate(next));
  };

  const tasksForDay = (date: Date) => {
    const key = formatIsoDate(date);
    return tasks.filter((task) => normalizeTaskDate(task.date) === key);
  };

  const weekTaskCount = tasks.filter((task) =>
    weekDates.some((date) => normalizeTaskDate(task.date) === formatIsoDate(date)),
  ).length;

  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeTask = tasks.find((task) => task.id === activeTaskId);
  const activeContact = activeTask ? contacts.find((contact) => contact.id === activeTask.contactId) : undefined;

  const handleDeleteTask = () => {
    if (!activeTaskId) return;
    const updatedTasks = tasks.filter((t) => t.id !== activeTaskId);
    setTasks(updatedTasks);
    const data = loadData();
    saveData({ ...data, tasks: updatedTasks });
    setActiveTaskId(null);
    setConfirmDelete(false);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black text-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.18),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.25),_transparent_18%)] pointer-events-none" />
      <div className="relative z-10 w-full max-w-[1180px] rounded-[36px] border border-cyan-500/40 bg-slate-950/95 p-6 sm:p-8 shadow-[0_0_60px_rgba(6,182,212,0.12)]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white [text-shadow:0_0_10px_rgba(34,211,238,0.3)]">Weekly Schedule</h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Horizontal weekly view with hours on the left and details on the right.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-400 hover:bg-slate-800 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              Back to Dashboard
            </Link>
            <Link href="/create-task" className="rounded-3xl bg-cyan-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] hover:shadow-[0_0_25px_rgba(34,211,238,0.8)]">
              Create New Task
            </Link>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-3xl border border-cyan-500/40 bg-slate-900 p-4 text-sm text-slate-300">
            <div>Week: {weekLabel}</div>
            <div className="mt-1 text-slate-400">Tasks this week: {weekTaskCount}</div>
          </div>

          {/* Overlap legend */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm bg-cyan-500" />
              Normal
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" />
              Overlapping
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => moveWeek(-1)}
              className="rounded-3xl bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800 border border-slate-700 hover:border-cyan-400"
            >
              Previous Week
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(formatIsoDate(new Date()))}
              className="rounded-3xl bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800 border border-slate-700 hover:border-cyan-400"
            >
              Today
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40"
            />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-cyan-500/40 bg-slate-950 p-4 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950">
              <div className="min-w-[1040px]">
                <div className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))] text-xs">
                  <div className="border-b border-slate-800 bg-slate-950" />
                  {weekDates.map((date) => (
                    <div key={date.toISOString()} className="border-l border-b border-slate-800 px-3 py-3 text-center text-sm uppercase tracking-[0.18em] text-slate-400">
                      <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{date.getDate()}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))] text-sm">
                  <div className="bg-slate-950">
                    {hours.map((hour) => (
                      <div
                        key={`label-${hour}`}
                        className="h-[60px] border-r border-b border-slate-800 px-3 py-2 text-right text-sm text-slate-400"
                      >
                        {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </div>
                    ))}
                  </div>

                  {weekDates.map((date) => {
                    const dayTasks = tasksForDay(date);
                    const overlappingIds = getOverlappingIds(dayTasks);

                    return (
                      <div key={`column-${date.toISOString()}`} className="relative border-l border-slate-800 bg-slate-950/70">
                        {hours.map((hour) => (
                          <div
                            key={`${date.toISOString()}-${hour}`}
                            className="h-[60px] border-r border-b border-slate-800 bg-slate-950/70"
                          />
                        ))}

                        {dayTasks
                          .filter((task) => task.startTime && task.endTime)
                          .sort((a, b) => Number(a.startTime!.replace(':', '')) - Number(b.startTime!.replace(':', '')))
                          .map((task) => {
                            const [startHour, startMinute] = task.startTime!.split(':').map(Number);
                            const [endHour, endMinute] = task.endTime!.split(':').map(Number);
                            const startOffset = (startHour - 6) * 60 + startMinute;
                            const blockHeight = endHour * 60 + endMinute - (startHour * 60 + startMinute);
                            const isOverlapping = overlappingIds.has(task.id);

                            return (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => setActiveTaskId(task.id)}
                                className={`absolute left-2 right-2 rounded-3xl border p-3 text-left text-sm shadow transition
                                  ${isOverlapping
                                    ? 'border-amber-400 bg-amber-400/90 text-slate-900 shadow-[0_0_15px_rgba(251,191,36,0.5)] hover:bg-amber-300 hover:shadow-[0_0_25px_rgba(251,191,36,0.8)]'
                                    : 'border-cyan-400 bg-cyan-500/90 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.7)]'
                                  }`}
                                style={{ top: `${startOffset}px`, height: `${Math.max(blockHeight, 48)}px` }}
                              >
                                <div className="font-bold truncate">{task.title}</div>
                                <div className={`mt-1 text-xs font-semibold ${isOverlapping ? 'text-slate-700' : 'text-black/70'}`}>
                                  {task.startTime} - {task.endTime}
                                </div>
                                {isOverlapping && (
                                  <div className="mt-1 text-[10px] font-bold text-slate-700 uppercase tracking-wide">⚠ Overlap</div>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <aside>
            <div className="sticky top-6 rounded-3xl border border-cyan-500/40 bg-slate-950 p-6 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
              <h2 className="text-xl font-semibold text-white">Job details</h2>
              {activeTask ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-3xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-sm uppercase tracking-[0.18em] text-cyan-400">Task</p>
                    <p className="mt-2 text-lg font-semibold text-white">{activeTask.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{activeTask.notes || 'No extra notes.'}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-sm uppercase tracking-[0.18em] text-cyan-400">When</p>
                    <p className="mt-2 text-base text-white">{activeTask.date}</p>
                    <p className="text-sm text-slate-400">{activeTask.startTime} - {activeTask.endTime}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-sm uppercase tracking-[0.18em] text-cyan-400">Work</p>
                    <p className="mt-2 text-base text-white">{activeTask.jobType || 'Not specified'}</p>
                    <p className="mt-3 text-sm text-slate-400">{activeTask.address || 'No address specified'}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-700 bg-slate-900 p-4">
                    <p className="text-sm uppercase tracking-[0.18em] text-cyan-400">Contact</p>
                    <p className="mt-2 text-base text-white">{activeContact?.name || 'Unknown'}</p>
                    <p className="mt-1 text-sm text-slate-400">{activeContact?.email || 'No email'}</p>
                    <p className="mt-1 text-sm text-slate-400">{activeContact?.phone || 'No phone'}</p>
                  </div>

                  {confirmDelete ? (
                    <div className="rounded-3xl border border-red-500/50 bg-red-950/40 p-4 flex flex-col gap-3">
                      <p className="text-sm text-red-300 font-semibold">Delete this task?</p>
                      <p className="text-xs text-slate-400">This cannot be undone.</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDeleteTask}
                          className="flex-1 rounded-3xl bg-red-500 px-3 py-2 text-sm font-bold text-white hover:bg-red-400 transition"
                        >
                          Yes, delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 rounded-3xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="w-full rounded-3xl border border-red-500/40 bg-slate-900 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-950/30 hover:border-red-500 transition"
                    >
                      Delete Task
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-5 text-sm text-slate-300">
                  Select a job from the schedule to see details here.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}