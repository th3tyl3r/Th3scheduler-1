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

  const currentDate = useMemo(() => {
    const d = new Date(selectedDate);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [selectedDate]);
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
      {/* Background gradient using CSS variables */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at top, rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.18), transparent 25%), radial-gradient(circle at bottom right, rgba(15,23,42,0.25), transparent 18%)',
        }}
      />

      <div
        className="relative z-10 w-full max-w-[1180px] rounded-[36px] border bg-slate-950/95 p-6 sm:p-8"
        style={{
          borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
          boxShadow: '0 0 60px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.12)',
        }}
      >
        {/* Top header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-white"
              style={{ textShadow: '0 0 10px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
            >
              Weekly Schedule
            </h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Horizontal weekly view with hours on the left and details on the right.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = '';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '';
              }}
            >
              Back to Dashboard
            </Link>
            <Link
              href="/create-task"
              className="rounded-3xl px-4 py-3 text-sm font-bold text-black transition"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 25px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8)';
                (e.currentTarget as HTMLAnchorElement).style.opacity = '0.9';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)';
                (e.currentTarget as HTMLAnchorElement).style.opacity = '1';
              }}
            >
              Create New Task
            </Link>
          </div>
        </div>

        {/* Week info + controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="rounded-3xl border bg-slate-900 p-4 text-sm text-slate-300"
            style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)' }}
          >
            <div>Week: {weekLabel}</div>
            <div className="mt-1 text-slate-400">Tasks this week: {weekTaskCount}</div>
          </div>

          {/* Overlap legend */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: 'var(--accent)' }}
              />
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
              className="rounded-3xl bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800 border border-slate-700"
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
            >
              Previous Week
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(formatIsoDate(new Date()))}
              className="rounded-3xl bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800 border border-slate-700"
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
            >
              Today
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { const val = e.target.value; if (val && !isNaN(new Date(val).getTime())) setSelectedDate(val); }}
              className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none"
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.boxShadow = '';
              }}
            />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          {/* Calendar grid */}
          <div
            className="rounded-3xl border bg-slate-950 p-4"
            style={{
              borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
              boxShadow: '0 0 20px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.05)',
            }}
          >
            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950">
              <div className="min-w-[1040px]">
                {/* Day headers */}
                <div className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))] text-xs">
                  <div className="border-b border-slate-800 bg-slate-950" />
                  {weekDates.map((date) => (
                    <div key={date.toISOString()} className="border-l border-b border-slate-800 px-3 py-3 text-center text-sm uppercase tracking-[0.18em] text-slate-400">
                      <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{date.getDate()}</div>
                    </div>
                  ))}
                </div>

                {/* Time grid */}
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
                                className="absolute left-2 right-2 rounded-3xl border p-3 text-left text-sm shadow transition"
                                style={{
                                  top: `${startOffset}px`,
                                  height: `${Math.max(blockHeight, 48)}px`,
                                  ...(isOverlapping ? {
                                    borderColor: '#fbbf24',
                                    backgroundColor: 'rgba(251,191,36,0.9)',
                                    color: 'rgb(15,23,42)',
                                    boxShadow: '0 0 15px rgba(251,191,36,0.5)',
                                  } : {
                                    borderColor: 'var(--accent)',
                                    backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.9)',
                                    color: 'black',
                                    boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
                                  }),
                                }}
                              >
                                <div className="font-bold truncate">{task.title}</div>
                                <div className="mt-1 text-xs font-semibold opacity-70">
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

          {/* Sidebar */}
          <aside>
            <div
              className="sticky top-6 rounded-3xl border bg-slate-950 p-6"
              style={{
                borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
                boxShadow: '0 0 20px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.05)',
              }}
            >
              <h2 className="text-xl font-semibold text-white">Job details</h2>
              {activeTask ? (
                <div className="mt-5 space-y-4">
                  {[
                    { label: 'Task', content: <><p className="mt-2 text-lg font-semibold text-white">{activeTask.title}</p><p className="mt-1 text-sm text-slate-400">{activeTask.notes || 'No extra notes.'}</p></> },
                    { label: 'When', content: <><p className="mt-2 text-base text-white">{activeTask.date}</p><p className="text-sm text-slate-400">{activeTask.startTime} - {activeTask.endTime}</p></> },
                    { label: 'Work', content: <><p className="mt-2 text-base text-white">{activeTask.jobType || 'Not specified'}</p><p className="mt-3 text-sm text-slate-400">{activeTask.address || 'No address specified'}</p></> },
                    { label: 'Contact', content: <><p className="mt-2 text-base text-white">{activeContact?.name || 'Unknown'}</p><p className="mt-1 text-sm text-slate-400">{activeContact?.email || 'No email'}</p><p className="mt-1 text-sm text-slate-400">{activeContact?.phone || 'No phone'}</p></> },
                  ].map(({ label, content }) => (
                    <div key={label} className="rounded-3xl border border-slate-700 bg-slate-900 p-4">
                      <p
                        className="text-sm uppercase tracking-[0.18em]"
                        style={{ color: 'var(--accent)' }}
                      >
                        {label}
                      </p>
                      {content}
                    </div>
                  ))}

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