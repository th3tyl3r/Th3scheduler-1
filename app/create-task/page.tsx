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

    // Only title is required — everything else is optional
    if (!title.trim()) {
      setError('Please enter a task title.');
      return;
    }

    // Only validate time order if BOTH times are provided
    if (startTime && endTime && startTime >= endTime) {
      setError('End time must be after start time.');
      return;
    }

    setLoading(true);

    try {
      // Only create/upsert a contact if at least a name or email was provided
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
        contactId: contactId ?? '',
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

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black text-white px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.18),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.25),_transparent_18%)] pointer-events-none" />
      <div className="relative z-10 w-full max-w-[620px] rounded-[36px] border border-cyan-500/40 bg-slate-950/95 p-6 sm:p-8 shadow-[0_0_60px_rgba(6,182,212,0.12)]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Create New Task</h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Add a new task and contact. Fields marked <span className="text-cyan-400">*</span> are required.
            </p>
          </div>
          <Link href="/dashboard" className="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-white transition hover:bg-slate-800 border border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            Back to Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Task Title — required */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
              Task Title <span className="text-cyan-400">*</span>
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Replace wiring at customer site"
              className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/20 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
            />
          </div>

          {/* Contact info — all optional */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
              Contact Name <span className="text-slate-500 text-xs">(optional)</span>
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/20 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email <span className="text-slate-500 text-xs">(optional)</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/20 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">
                Phone <span className="text-slate-500 text-xs">(optional)</span>
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/20 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="jobType" className="block text-sm font-medium text-slate-300 mb-2">
                Job Type <span className="text-slate-500 text-xs">(optional)</span>
              </label>
              <input
                id="jobType"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                placeholder="Electrical repair, inspection…"
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/20 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-300 mb-2">
                Address <span className="text-slate-500 text-xs">(optional)</span>
              </label>
              <input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, Anytown"
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/20 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-slate-300 mb-2">
                Start Time <span className="text-slate-500 text-xs">(optional)</span>
              </label>
              <input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-slate-300 mb-2">
                End Time <span className="text-slate-500 text-xs">(optional)</span>
              </label>
              <input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-slate-300 mb-2">
                Date <span className="text-slate-500 text-xs">(optional)</span>
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-2">
                Notes <span className="text-slate-500 text-xs">(optional)</span>
              </label>
              <input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any extra details"
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/20 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'pending' | 'completed' | 'in-progress')}
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-slate-300 mb-2">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/40 focus:outline-none"
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
            className="w-full rounded-3xl bg-cyan-500 px-4 py-3 text-lg font-bold text-black transition hover:bg-cyan-400 disabled:opacity-50 shadow-[0_0_15px_rgba(34,211,238,0.5)] hover:shadow-[0_0_25px_rgba(34,211,238,0.8)]"
          >
            {loading ? 'Saving task...' : 'Save Task'}
          </button>
        </form>
      </div>
    </main>
  );
}