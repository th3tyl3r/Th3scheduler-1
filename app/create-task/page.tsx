'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addTask, upsertContact } from '../../lib/storage';

export default function CreateTaskPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [jobType, setJobType] = useState('');
  const [address, setAddress] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'pending' | 'completed' | 'in-progress'>('pending');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a task title.');
      return;
    }

    if (startTime && endTime && startTime >= endTime) {
      setError('End time must be after start time.');
      return;
    }

    setLoading(true);

    try {
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

      addTask({
        id: crypto.randomUUID(),
        title: title.trim(),
        contactId,
        jobType: jobType.trim() || undefined,
        address: address.trim() || undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        date: date || undefined,
        notes: notes.trim() || undefined,
        status,
        priority,
        createdAt: new Date().toISOString(),
      });

      router.push('/manage-contacts');
    } catch (err) {
      setError('Unable to save task. Please try again.');
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-3xl border bg-slate-900 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/20 outline-none transition-colors';

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black text-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at top, rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.18) 0%, transparent 25%), radial-gradient(circle at bottom right, rgba(15,23,42,0.25) 0%, transparent 18%)',
        }}
      />
      <div
        className="relative z-10 w-full max-w-[620px] rounded-[36px] bg-slate-950/95 p-6 sm:p-8"
        style={{
          border: '1px solid rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
          boxShadow: '0 0 60px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.12)',
        }}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Create New Task</h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Add a new task and contact. Fields marked{' '}
              <span style={{ color: 'var(--accent)' }}>*</span> are required.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-white transition"
            style={{
              border: '1px solid rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            Back to Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Task Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
              Task Title <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Replace wiring at customer site"
              className={inputClass}
              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)';
                e.currentTarget.style.boxShadow = '';
              }}
            />
          </div>

          {/* Contact Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
              Contact Name <span className="text-slate-500 text-xs">(optional)</span>
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className={inputClass}
              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)';
                e.currentTarget.style.boxShadow = '';
              }}
            />
          </div>

          {/* Email + Phone */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { id: 'email', label: 'Email', type: 'email', value: email, set: setEmail, placeholder: 'you@example.com' },
              { id: 'phone', label: 'Phone', type: 'text', value: phone, set: setPhone, placeholder: '(555) 123-4567' },
            ].map(({ id, label, type, value, set, placeholder }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">
                  {label} <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input
                  id={id}
                  type={type}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  className={inputClass}
                  style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                />
              </div>
            ))}
          </div>

          {/* Job Type + Address */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { id: 'jobType', label: 'Job Type', value: jobType, set: setJobType, placeholder: 'Electrical repair, inspection…' },
              { id: 'address', label: 'Address', value: address, set: setAddress, placeholder: '123 Main St, Anytown' },
            ].map(({ id, label, value, set, placeholder }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">
                  {label} <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input
                  id={id}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  className={inputClass}
                  style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                />
              </div>
            ))}
          </div>

          {/* Start Time + End Time */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { id: 'startTime', label: 'Start Time', type: 'time', value: startTime, set: setStartTime },
              { id: 'endTime', label: 'End Time', type: 'time', value: endTime, set: setEndTime },
            ].map(({ id, label, type, value, set }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">
                  {label} <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input
                  id={id}
                  type={type}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className={inputClass}
                  style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                />
              </div>
            ))}
          </div>

          {/* Date + Notes */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { id: 'date', label: 'Date', type: 'date', value: date, set: setDate, placeholder: '' },
              { id: 'notes', label: 'Notes', type: 'text', value: notes, set: setNotes, placeholder: 'Add any extra details' },
            ].map(({ id, label, type, value, set, placeholder }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">
                  {label} <span className="text-slate-500 text-xs">(optional)</span>
                </label>
                <input
                  id={id}
                  type={type}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  className={inputClass}
                  style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                />
              </div>
            ))}
          </div>

          {/* Status + Priority */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'pending' | 'completed' | 'in-progress')}
                className={inputClass}
                style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)';
                }}
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className={inputClass}
                style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)';
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-3xl border border-red-700 bg-red-950/80 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-3xl px-4 py-3 text-lg font-bold text-black transition disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent)',
              boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 25px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)';
            }}
          >
            {loading ? 'Saving task...' : 'Save Task'}
          </button>
        </form>
      </div>
    </main>
  );
}