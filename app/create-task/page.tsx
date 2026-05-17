'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { addTask, upsertContact } from '../../lib/storage';
import { supabase } from '../../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const REPEAT_INTERVALS = [
  { value: 'daily',     label: 'Daily'     },
  { value: 'weekly',    label: 'Weekly'    },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'monthly',   label: 'Monthly'   },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateTaskPage() {
  const router = useRouter();

  // Basic fields
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [title,     setTitle]     = useState('');
  const [jobType,   setJobType]   = useState('');
  const [address,   setAddress]   = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime,   setEndTime]   = useState('');
  const [date,      setDate]      = useState('');
  const [notes,     setNotes]     = useState('');
  const [status,    setStatus]    = useState<'pending' | 'completed' | 'in-progress'>('pending');
  const [priority,  setPriority]  = useState<'low' | 'medium' | 'high'>('medium');

  // Recurring fields
  const [isRecurring,     setIsRecurring]     = useState(false);
  const [repeatInterval,  setRepeatInterval]  = useState<string>('weekly');
  const [repeatMonths,    setRepeatMonths]     = useState<string>('');

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Please enter a task title.'); return; }
    if (startTime && endTime && startTime >= endTime) {
      setError('End time must be after start time.'); return;
    }
    if (isRecurring && repeatMonths && Number(repeatMonths) <= 0) {
      setError('Repeat duration must be a positive number.'); return;
    }

    setLoading(true);

    try {
      // ── Local storage contact ──────────────────────────────────────────
      let contactId: string | undefined;
      if (name.trim() || email.trim()) {
        const contact = upsertContact({
          id: crypto.randomUUID(),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        });
        contactId = contact.id;
      }

      // ── Local storage task ─────────────────────────────────────────────
      addTask({
        id: crypto.randomUUID(),
        title: title.trim(),
        contactId,
        jobType:   jobType.trim()   || undefined,
        address:   address.trim()   || undefined,
        startTime: startTime        || undefined,
        endTime:   endTime          || undefined,
        date:      date             || undefined,
        notes:     notes.trim()     || undefined,
        status,
        priority,
        createdAt: new Date().toISOString(),
      });

      // ── Supabase jobs insert ───────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: dbErr } = await supabase.from('jobs').insert({
          task:            title.trim(),
          customer:        name.trim()    || null,
          contact:         email.trim()   || null,
          address:         address.trim() || null,
          notes:           notes.trim()   || null,
          time:            startTime      || null,
          duration:        startTime && endTime
            ? calcDurationMinutes(startTime, endTime) : null,
          date:            date           || null,
          status:          status,
          repeating:       isRecurring,
          repeat_interval: isRecurring ? repeatInterval : null,
          repeat_months:   isRecurring && repeatMonths ? Number(repeatMonths) : null,
          user_id:         user.id,
        });
        if (dbErr) console.error('Supabase insert error:', dbErr);
      }

      router.push('/manage-contacts');
    } catch (err) {
      setError('Unable to save task. Please try again.');
      setLoading(false);
    }
  };

  const iClass = 'w-full rounded-3xl border bg-slate-900 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/20 outline-none transition-colors';
  const iStyle = { borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' };
  const focusOn  = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = 'var(--accent)';
    e.currentTarget.style.boxShadow   = '0 0 0 1px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)';
  };
  const focusOff = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)';
    e.currentTarget.style.boxShadow   = '';
  };

  // Helper: shared input props
  const inp = (value: string, onChange: (v: string) => void, extra?: object) => ({
    value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    className: iClass, style: iStyle, onFocus: focusOn, onBlur: focusOff, ...extra,
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black text-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at top, rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.18) 0%, transparent 25%), radial-gradient(circle at bottom right, rgba(15,23,42,0.25) 0%, transparent 18%)' }} />

      <div className="relative z-10 w-full max-w-[620px] rounded-[36px] bg-slate-950/95 p-6 sm:p-8"
        style={{ border: '1px solid rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)', boxShadow: '0 0 60px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.12)' }}>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Create New Task</h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Add a new task and contact. Fields marked <span style={{ color: 'var(--accent)' }}>*</span> are required.
            </p>
          </div>
          <Link href="/dashboard"
            className="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-white transition"
            style={{ border: '1px solid rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
              (e.currentTarget as HTMLElement).style.boxShadow   = '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)';
              (e.currentTarget as HTMLElement).style.boxShadow   = 'none';
            }}>
            Back to Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Task Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
              Task Title <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input id="title" placeholder="Replace wiring at customer site" {...inp(title, setTitle)} />
          </div>

          {/* Contact Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
              Contact Name <span className="text-slate-500 text-xs">(optional)</span>
            </label>
            <input id="name" placeholder="John Doe" {...inp(name, setName)} />
          </div>

          {/* Email + Phone */}
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              { id: 'email', label: 'Email', type: 'email', value: email, set: setEmail, placeholder: 'you@example.com' },
              { id: 'phone', label: 'Phone', type: 'text',  value: phone, set: setPhone, placeholder: '(555) 123-4567' },
            ] as const).map(({ id, label, type, value, set, placeholder }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">
                  {label} <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input id={id} type={type} placeholder={placeholder} {...inp(value, set)} />
              </div>
            ))}
          </div>

          {/* Job Type + Address */}
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              { id: 'jobType', label: 'Job Type', value: jobType, set: setJobType, placeholder: 'Electrical repair…' },
              { id: 'address', label: 'Address',  value: address, set: setAddress, placeholder: '123 Main St' },
            ] as const).map(({ id, label, value, set, placeholder }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">
                  {label} <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input id={id} placeholder={placeholder} {...inp(value, set)} />
              </div>
            ))}
          </div>

          {/* Start + End Time */}
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              { id: 'startTime', label: 'Start Time', value: startTime, set: setStartTime },
              { id: 'endTime',   label: 'End Time',   value: endTime,   set: setEndTime   },
            ] as const).map(({ id, label, value, set }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">
                  {label} <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input id={id} type="time" {...inp(value, set)} />
              </div>
            ))}
          </div>

          {/* Date + Notes */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-slate-300 mb-2">
                {isRecurring ? 'Start Date' : 'Date'} <span className="text-slate-500 text-xs">(optional)</span>
              </label>
              <input id="date" type="date" {...inp(date, setDate)} />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-2">
                Notes <span className="text-slate-500 text-xs">(optional)</span>
              </label>
              <input id="notes" placeholder="Add any extra details" {...inp(notes, setNotes)} />
            </div>
          </div>

          {/* Status + Priority */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select id="status" value={status}
                onChange={e => setStatus(e.target.value as typeof status)}
                className={iClass} style={iStyle}
                onFocus={focusOn as any} onBlur={focusOff as any}>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
              <select id="priority" value={priority}
                onChange={e => setPriority(e.target.value as typeof priority)}
                className={iClass} style={iStyle}
                onFocus={focusOn as any} onBlur={focusOff as any}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* ── Recurring Section ─────────────────────────────────────────── */}
          <div className="rounded-3xl border p-4 transition-all"
            style={{
              borderColor: isRecurring
                ? 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)'
                : 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)',
            }}>

            {/* Toggle row */}
            <button type="button" onClick={() => setIsRecurring(r => !r)}
              className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={15} style={{ color: isRecurring ? 'var(--accent)' : 'rgb(100,116,139)' }} />
                <span className="text-sm font-semibold text-slate-300">Recurring Task</span>
              </div>
              {/* Pill toggle */}
              <div className="relative w-10 h-5 rounded-full transition-colors"
                style={{ backgroundColor: isRecurring ? 'var(--accent)' : 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                  style={{ left: isRecurring ? '1.25rem' : '0.125rem' }} />
              </div>
            </button>

            {isRecurring && (
              <div className="mt-4 space-y-4">

                {/* Frequency pills */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Repeat Every</label>
                  <div className="grid grid-cols-4 gap-2">
                    {REPEAT_INTERVALS.map(f => (
                      <button key={f.value} type="button"
                        onClick={() => setRepeatInterval(f.value)}
                        className="py-2 text-xs font-bold rounded-2xl border transition-all"
                        style={{
                          borderColor: repeatInterval === f.value
                            ? 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.7)'
                            : 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)',
                          backgroundColor: repeatInterval === f.value
                            ? 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)'
                            : 'transparent',
                          color: repeatInterval === f.value ? 'var(--accent)' : 'rgb(100,116,139)',
                        }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Repeat duration (months) */}
                <div>
                  <label htmlFor="repeatMonths" className="block text-sm font-medium text-slate-300 mb-2">
                    Repeat For <span className="text-slate-500 text-xs">(months — leave blank to repeat forever)</span>
                  </label>
                  <input
                    id="repeatMonths"
                    type="number" min="1" placeholder="e.g. 6"
                    value={repeatMonths}
                    onChange={e => setRepeatMonths(e.target.value)}
                    className={iClass} style={iStyle}
                    onFocus={focusOn} onBlur={focusOff}
                  />
                </div>

                {/* Info callout */}
                <div className="flex items-start gap-2 p-3 rounded-2xl border"
                  style={{
                    borderColor:     'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)',
                    backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.05)',
                  }}>
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This task will be marked as repeating in your jobs list.
                    The repeat interval and duration are saved so you can generate
                    future instances from your calendar or jobs view.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-3xl border border-red-700 bg-red-950/80 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full rounded-3xl px-4 py-3 text-lg font-bold text-black transition disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 25px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)'}>
            {loading ? 'Saving task...' : 'Save Task'}
          </button>
        </form>
      </div>
    </main>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}