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

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
              Contact Name <span className="text-slate-500 text-xs">(optional)</span>
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/20 focus:border-cyan-400 fo