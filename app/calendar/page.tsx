'use client';

import { Fragment, useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Job {
  id: number;
  user_id?: string | null;
  task?: string | null;
  customer?: string | null;
  address?: string | null;
  time?: string | null;
  notes?: string | null;
  status?: string | null;
  date?: string | null;
  duration?: number | null;
  contact?: string | null;
  customer_id?: number | null;
  quoted?: boolean | null;
  completed?: boolean | null;
  paid?: boolean | null;
  repeating?: boolean;
  repeat_interval?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | null;
  repeat_months?: number | null;
  created_at?: string;
  // Virtual field — set to true for auto-generated occurrences
  is_generated?: boolean;
  // The original job id this was generated from
  source_id?: number;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const fmt = (d: Date) => d.toISOString().slice(0, 10);

const getWeekStart = (d: Date) => {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
};

const getWeekDates = (start: Date) =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const normalizeDate = (v: string) => {
  const p = new Date(v);
  return isNaN(p.getTime()) ? v.slice(0, 10) : fmt(p);
};

// ─── Recurring occurrence generator ──────────────────────────────────────────
// Given a real job and the 7 dates of the current week, returns virtual Job
// objects for any dates the job should recur on that week (excluding its
// original date, which is already in the DB).

function getRecurringOccurrences(job: Job, weekDates: Date[]): Job[] {
  if (!job.repeating || !job.repeat_interval || !job.date) return [];

  const origin   = new Date(job.date + 'T00:00:00');
  const endDate  = job.repeat_months
    ? new Date(origin.getFullYear(), origin.getMonth() + job.repeat_months, origin.getDate())
    : null;

  const results: Job[] = [];

  for (const weekDay of weekDates) {
    const dateStr = fmt(weekDay);
    if (dateStr === job.date) continue; // original already exists in DB
    if (weekDay < origin)    continue;
    if (endDate && weekDay > endDate) continue;

    const diffMs   = weekDay.getTime() - origin.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    let matches = false;
    if (job.repeat_interval === 'daily')     matches = true;
    if (job.repeat_interval === 'weekly')    matches = diffDays % 7  === 0;
    if (job.repeat_interval === 'bi-weekly') matches = diffDays % 14 === 0;
    if (job.repeat_interval === 'monthly') {
      matches = weekDay.getDate() === origin.getDate()
        && (weekDay.getFullYear() !== origin.getFullYear()
          || weekDay.getMonth() !== origin.getMonth());
    }

    if (matches) {
      results.push({ ...job, date: dateStr, is_generated: true, source_id: job.id });
    }
  }

  return results;
}

// ─── Task style ───────────────────────────────────────────────────────────────

const getTaskStyle = (status: string | null | undefined, isOverlapping: boolean, isGenerated: boolean) => {
  if (isOverlapping) return {
    borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.88)',
    color: 'rgb(15,23,42)', boxShadow: '0 0 14px rgba(251,191,36,0.55)', label: '⚠ Overlap',
  };
  if (isGenerated) return {
    borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)',
    backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.25)',
    color: 'white', boxShadow: 'none', label: '↻ Recurring',
  };
  if (status === 'completed') return {
    borderColor: 'rgba(34,197,94,0.8)', backgroundColor: 'rgba(34,197,94,0.82)',
    color: 'rgb(2,26,12)', boxShadow: '0 0 14px rgba(34,197,94,0.4)', label: '✓ Completed',
  };
  if (status === 'in-progress') return {
    borderColor: 'rgba(251,146,60,0.9)', backgroundColor: 'rgba(251,146,60,0.85)',
    color: 'rgb(28,10,2)', boxShadow: '0 0 14px rgba(251,146,60,0.45)', label: '▶ Started',
  };
  return {
    borderColor: 'var(--accent)',
    backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.9)',
    color: 'black', boxShadow: '0 0 14px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
    label: null,
  };
};

const getOverlappingIds = (jobs: Job[]): Set<number> => {
  const timed = jobs.filter(j => j.time && j.duration);
  const overlapping = new Set<number>();
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const aStart = toMinutes(timed[i].time!);
      const aEnd   = aStart + (timed[i].duration ?? 0);
      const bStart = toMinutes(timed[j].time!);
      const bEnd   = bStart + (timed[j].duration ?? 0);
      if (aStart < bEnd && aEnd > bStart) {
        overlapping.add(timed[i].id);
        overlapping.add(timed[j].id);
      }
    }
  }
  return overlapping;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [selectedDate,    setSelectedDate]    = useState(fmt(new Date()));
  const [jobs,            setJobs]            = useState<Job[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [activeJob,       setActiveJob]       = useState<Job | null>(null);
  const [confirmDelete,   setConfirmDelete]   = useState(false);
  const [confirmStop,     setConfirmStop]     = useState(false);
  const [stopping,        setStopping]        = useState(false);
  const [deleting,        setDeleting]        = useState(false);

  const currentDate = useMemo(() => {
    const d = new Date(selectedDate);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [selectedDate]);

  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const hours     = Array.from({ length: 16 }, (_, i) => 6 + i);

  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const moveWeek = (offset: number) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + offset * 7);
    setSelectedDate(fmt(next));
  };

  // ── Fetch jobs from Supabase ───────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    // Fetch a wider range: 4 weeks back, 8 weeks forward to cover recurring generation
    const rangeStart = new Date(weekStart); rangeStart.setDate(rangeStart.getDate() - 28);
    const rangeEnd   = new Date(weekStart); rangeEnd.setDate(rangeEnd.getDate() + 56);

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .or(`date.gte.${fmt(rangeStart)},repeating.eq.true`);

    if (error) console.error('Fetch jobs error:', error);
    setJobs((data ?? []) as Job[]);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // ── Build display jobs: real + generated occurrences ──────────────────────
  const displayJobs = useMemo(() => {
    const real      = jobs.filter(j => j.date && weekDates.some(d => normalizeDate(j.date!) === fmt(d)));
    const generated = jobs.flatMap(j => getRecurringOccurrences(j, weekDates));
    // De-dupe: don't show a generated occurrence if a real entry already exists for that date+source
    const realKeys  = new Set(real.map(j => `${j.id}-${j.date}`));
    const filtered  = generated.filter(g => !realKeys.has(`${g.source_id}-${g.date}`));
    return [...real, ...filtered];
  }, [jobs, weekDates]);

  const jobsForDay  = (date: Date) => displayJobs.filter(j => j.date && normalizeDate(j.date) === fmt(date));
  const weekJobCount = displayJobs.length;

  // ── Stop recurring ─────────────────────────────────────────────────────────
  const handleStopRecurring = async () => {
    if (!activeJob) return;
    setStopping(true);
    const targetId = activeJob.is_generated ? activeJob.source_id! : activeJob.id;
    const { error } = await supabase.from('jobs')
      .update({ repeating: false, repeat_interval: null, repeat_months: null })
      .eq('id', targetId);
    if (error) console.error('Stop recurring error:', error);
    else {
      setJobs(prev => prev.map(j => j.id === targetId
        ? { ...j, repeating: false, repeat_interval: null, repeat_months: null } : j));
      setActiveJob(null);
    }
    setStopping(false);
    setConfirmStop(false);
  };

  // ── Delete job ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!activeJob || activeJob.is_generated) return; // can't delete virtual occurrences
    setDeleting(true);
    const { error } = await supabase.from('jobs').delete().eq('id', activeJob.id);
    if (error) console.error('Delete error:', error);
    else {
      setJobs(prev => prev.filter(j => j.id !== activeJob.id));
      setActiveJob(null);
    }
    setDeleting(false);
    setConfirmDelete(false);
  };

  const legend = [
    { label: 'Scheduled',  bg: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.85)' },
    { label: 'Started',    bg: 'rgba(251,146,60,0.85)' },
    { label: 'Completed',  bg: 'rgba(34,197,94,0.82)'  },
    { label: 'Overlap',    bg: 'rgba(251,191,36,0.88)' },
    { label: 'Recurring',  bg: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.25)' },
  ];

  const intervalLabel = (v?: string | null) =>
    ({ daily: 'Daily', weekly: 'Weekly', 'bi-weekly': 'Bi-Weekly', monthly: 'Monthly' }[v ?? ''] ?? v ?? '—');

  if (loading) return <div className="min-h-screen bg-black" />;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black text-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at top, rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.18), transparent 25%), radial-gradient(circle at bottom right, rgba(15,23,42,0.25), transparent 18%)' }} />

      <div className="relative z-10 w-full max-w-[1180px] rounded-[36px] border bg-slate-950/95 p-6 sm:p-8"
        style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)', boxShadow: '0 0 60px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.12)' }}>

        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white"
              style={{ textShadow: '0 0 10px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}>
              Weekly Schedule
            </h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Horizontal weekly view — click a task to see details.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard"
              className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; }}>
              Back to Dashboard
            </Link>
            <Link href="/create-task"
              className="rounded-3xl px-4 py-3 text-sm font-bold text-black transition"
              style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
              Create New Task
            </Link>
          </div>
        </div>

        {/* Controls row */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-3xl border bg-slate-900 p-4 text-sm text-slate-300"
            style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)' }}>
            <div>Week: {weekLabel}</div>
            <div className="mt-1 text-slate-400">Tasks this week: {weekJobCount}</div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {legend.map(({ label, bg }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: bg }} />
                {label}
              </span>
            ))}
          </div>

          {/* Week navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => moveWeek(-1)}
              className="rounded-3xl bg-slate-900 px-3 py-2 text-sm text-white border border-slate-700 hover:bg-slate-800 transition flex items-center gap-1"
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
              <ChevronLeft size={15} /> Prev
            </button>
            <button type="button" onClick={() => setSelectedDate(fmt(new Date()))}
              className="rounded-3xl bg-slate-900 px-3 py-2 text-sm text-white border border-slate-700 hover:bg-slate-800 transition"
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
              Today
            </button>
            <button type="button" onClick={() => moveWeek(1)}
              className="rounded-3xl bg-slate-900 px-3 py-2 text-sm text-white border border-slate-700 hover:bg-slate-800 transition flex items-center gap-1"
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
              Next <ChevronRight size={15} />
            </button>
            <input type="date" value={selectedDate}
              onChange={e => { if (e.target.value && !isNaN(new Date(e.target.value).getTime())) setSelectedDate(e.target.value); }}
              className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none"
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)'; }}
              onBlur={e =>  { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }} />
          </div>
        </div>

        {/* Grid + sidebar */}
        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">

          {/* Calendar grid */}
          <div className="rounded-3xl border bg-slate-950 p-4"
            style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)', boxShadow: '0 0 20px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.05)' }}>
            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950">
              <div className="min-w-[1040px]">

                {/* Day headers */}
                <div className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))] text-xs">
                  <div className="border-b border-slate-800 bg-slate-950" />
                  {weekDates.map(date => (
                    <div key={date.toISOString()}
                      className="border-l border-b border-slate-800 px-3 py-3 text-center text-sm uppercase tracking-[0.18em] text-slate-400">
                      <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="mt-2 text-2xl font-semibold text-white">{date.getDate()}</div>
                    </div>
                  ))}
                </div>

                {/* Hour rows + job blocks */}
                <div className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))] text-sm">
                  <div className="bg-slate-950">
                    {hours.map(h => (
                      <div key={`label-${h}`}
                        className="h-[60px] border-r border-b border-slate-800 px-3 py-2 text-right text-sm text-slate-400">
                        {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                      </div>
                    ))}
                  </div>

                  {weekDates.map(date => {
                    const dayJobs        = jobsForDay(date);
                    const overlappingIds = getOverlappingIds(dayJobs);
                    return (
                      <div key={`col-${date.toISOString()}`}
                        className="relative border-l border-slate-800 bg-slate-950/70">
                        {hours.map(h => (
                          <div key={`${date.toISOString()}-${h}`}
                            className="h-[60px] border-r border-b border-slate-800 bg-slate-950/70" />
                        ))}

                        {dayJobs
                          .filter(j => j.time)
                          .sort((a, b) => toMinutes(a.time!) - toMinutes(b.time!))
                          .map((job, idx) => {
                            const [sh, sm]   = job.time!.split(':').map(Number);
                            const startOff   = (sh - 6) * 60 + sm;
                            const blockH     = Math.max(job.duration ?? 60, 48);
                            const isOverlap  = overlappingIds.has(job.id);
                            const style      = getTaskStyle(job.status, isOverlap, !!job.is_generated);

                            return (
                              <button key={`${job.id}-${job.date}-${idx}`} type="button"
                                onClick={() => { setActiveJob(job); setConfirmDelete(false); setConfirmStop(false); }}
                                className="absolute left-2 right-2 rounded-3xl border p-3 text-left text-sm shadow transition hover:brightness-110"
                                style={{
                                  top: `${startOff}px`, height: `${blockH}px`,
                                  borderColor: style.borderColor,
                                  backgroundColor: style.backgroundColor,
                                  color: style.color, boxShadow: style.boxShadow,
                                }}>
                                <div className="font-bold truncate">{job.task ?? '(no title)'}</div>
                                <div className="mt-1 text-xs font-semibold opacity-70">{job.time}</div>
                                {style.label && (
                                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-80">{style.label}</div>
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
            <div className="sticky top-6 rounded-3xl border bg-slate-950 p-6"
              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)', boxShadow: '0 0 20px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.05)' }}>
              <h2 className="text-xl font-semibold text-white">Job Details</h2>

              {activeJob ? (
                <div className="mt-5 space-y-4">

                  {/* Status badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                      style={(() => {
                        if (activeJob.completed) return { backgroundColor: 'rgba(34,197,94,0.18)', color: 'rgb(34,197,94)', border: '1px solid rgba(34,197,94,0.4)' };
                        if (activeJob.status === 'in-progress') return { backgroundColor: 'rgba(251,146,60,0.18)', color: 'rgb(251,146,60)', border: '1px solid rgba(251,146,60,0.4)' };
                        return { backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)' };
                      })()}>
                      {activeJob.completed ? '✓ Completed' : activeJob.status === 'in-progress' ? '▶ Started' : '● Scheduled'}
                    </span>
                    {activeJob.repeating && (
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
                        style={{ backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}>
                        <RefreshCw size={10} /> {intervalLabel(activeJob.repeat_interval)}
                      </span>
                    )}
                    {activeJob.is_generated && (
                      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
                        style={{ backgroundColor: 'rgba(100,116,139,0.15)', color: 'rgb(148,163,184)', border: '1px solid rgba(100,116,139,0.3)' }}>
                        Auto-generated
                      </span>
                    )}
                  </div>

                  {/* Detail cards */}
                  {[
                    { label: 'Task', content: (
                      <>
                        <p className="mt-2 text-lg font-semibold text-white">{activeJob.task ?? '—'}</p>
                        <p className="mt-1 text-sm text-slate-400">{activeJob.notes || 'No notes.'}</p>
                      </>
                    )},
                    { label: 'When', content: (
                      <>
                        <p className="mt-2 text-base text-white">{activeJob.date || 'No date'}</p>
                        <p className="text-sm text-slate-400">{activeJob.time || 'No time set'}</p>
                        {activeJob.duration && <p className="text-xs text-slate-500">{activeJob.duration} min</p>}
                      </>
                    )},
                    { label: 'Work', content: (
                      <>
                        <p className="mt-2 text-base text-white">{activeJob.status || 'Not specified'}</p>
                        <p className="mt-1 text-sm text-slate-400">{activeJob.address || 'No address'}</p>
                      </>
                    )},
                    { label: 'Client', content: (
                      <>
                        <p className="mt-2 text-base text-white">{activeJob.customer || 'Unknown'}</p>
                        <p className="mt-1 text-sm text-slate-400">{activeJob.contact || 'No contact info'}</p>
                      </>
                    )},
                    ...(activeJob.repeating ? [{ label: 'Recurring', content: (
                      <>
                        <p className="mt-2 text-base text-white">{intervalLabel(activeJob.repeat_interval)}</p>
                        <p className="text-sm text-slate-400">
                          {activeJob.repeat_months ? `For ${activeJob.repeat_months} month${activeJob.repeat_months > 1 ? 's' : ''}` : 'Repeats indefinitely'}
                        </p>
                      </>
                    )}] : []),
                  ].map(({ label, content }) => (
                    <div key={label} className="rounded-3xl border border-slate-700 bg-slate-900 p-4">
                      <p className="text-sm uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>{label}</p>
                      {content}
                    </div>
                  ))}

                  {/* Stop recurring */}
                  {(activeJob.repeating || activeJob.is_generated) && (
                    confirmStop ? (
                      <div className="rounded-3xl border border-orange-500/50 bg-orange-950/30 p-4 flex flex-col gap-3">
                        <p className="text-sm text-orange-300 font-semibold">Stop this recurring task?</p>
                        <p className="text-xs text-slate-400">Future auto-generated occurrences will no longer appear. Existing entries are kept.</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleStopRecurring} disabled={stopping}
                            className="flex-1 rounded-3xl bg-orange-500 px-3 py-2 text-sm font-bold text-white hover:bg-orange-400 transition disabled:opacity-50">
                            {stopping ? 'Stopping…' : 'Yes, stop'}
                          </button>
                          <button type="button" onClick={() => setConfirmStop(false)}
                            className="flex-1 rounded-3xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 transition">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmStop(true)}
                        className="w-full rounded-3xl border border-orange-500/40 bg-slate-900 px-4 py-3 text-sm font-semibold text-orange-400 hover:bg-orange-950/30 hover:border-orange-500 transition flex items-center justify-center gap-2">
                        <RefreshCw size={14} /> Stop Recurring
                      </button>
                    )
                  )}

                  {/* Delete — only for real (non-generated) jobs */}
                  {!activeJob.is_generated && (
                    confirmDelete ? (
                      <div className="rounded-3xl border border-red-500/50 bg-red-950/40 p-4 flex flex-col gap-3">
                        <p className="text-sm text-red-300 font-semibold">Delete this task?</p>
                        <p className="text-xs text-slate-400">This cannot be undone.</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleDelete} disabled={deleting}
                            className="flex-1 rounded-3xl bg-red-500 px-3 py-2 text-sm font-bold text-white hover:bg-red-400 transition disabled:opacity-50">
                            {deleting ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button type="button" onClick={() => setConfirmDelete(false)}
                            className="flex-1 rounded-3xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 transition">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmDelete(true)}
                        className="w-full rounded-3xl border border-red-500/40 bg-slate-900 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-950/30 hover:border-red-500 transition">
                        Delete Task
                      </button>
                    )
                  )}

                  {activeJob.is_generated && (
                    <p className="text-xs text-slate-500 text-center">
                      This is an auto-generated occurrence. To delete the series, stop the recurring schedule above.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-400">Select a job from the schedule to see details here.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}