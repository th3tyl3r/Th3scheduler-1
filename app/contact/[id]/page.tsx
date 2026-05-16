'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Contact, Task, loadData, saveData } from '../../../lib/storage';

export default function ContactDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const data = loadData();
    const foundContact = data.contacts.find((c) => c.id === id);
    if (foundContact) {
      setContact(foundContact);
      setTasks(data.tasks.filter((t) => t.contactId === id));
    }
    setLoading(false);
  }, [id]);

  const handleDeleteTask = (taskId: string) => {
    const data = loadData();
    const updatedTasks = data.tasks.filter((t) => t.id !== taskId);
    saveData({ ...data, tasks: updatedTasks });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setConfirmDeleteId(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div
          className="animate-spin rounded-full h-10 w-10 border-b-2"
          style={{ borderColor: 'var(--accent)' }}
        />
      </div>
    );
  }

  if (!contact) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--accent)' }}>
          Contact Not Found
        </h1>
        <Link href="/manage-contacts" className="text-sm text-slate-400 underline hover:opacity-80 transition">
          Return to Contacts
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-start px-4 py-8 gap-6 w-full">

        {/* Header */}
        <div className="w-full flex items-center justify-between mb-2">
          <div
            className="rounded-xl border px-4 py-2 text-base font-extrabold tracking-wide"
            style={{
              color: 'var(--accent)',
              borderColor: 'var(--accent)',
              boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4), inset 0 0 10px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
              textShadow: '0 0 8px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8)',
            }}
          >
            Cli3nt D3tails
          </div>
          <Link
            href="/manage-contacts"
            className="text-[11px] text-slate-500 transition hover:opacity-80"
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = '')}
          >
            Back to Contacts
          </Link>
        </div>

        {/* Contact Info Card */}
        <div
          className="w-full rounded-3xl border bg-slate-900/60 backdrop-blur-md p-6 flex flex-col items-center text-center"
          style={{
            borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
            boxShadow: '0 0 40px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)',
          }}
        >
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 bg-black"
            style={{
              borderColor: 'var(--accent)',
              boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)',
            }}
          >
            <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
              {contact.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">{contact.name}</h1>
          <p className="mt-1 text-sm font-medium" style={{ color: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8)' }}>
            {contact.email}
          </p>
          {contact.phone && <p className="mt-1 text-sm text-slate-400">{contact.phone}</p>}
        </div>

        {/* Jobs/Tasks List */}
        <div
          className="w-full rounded-3xl border bg-slate-900/40 backdrop-blur-sm overflow-hidden mt-2"
          style={{
            borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)',
            boxShadow: '0 0 30px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.1)',
          }}
        >
          <div
            className="flex items-center justify-between border-b px-6 py-4"
            style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 0 8px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8)',
                }}
              />
              <h2
                className="text-base font-bold uppercase tracking-widest"
                style={{
                  color: 'var(--accent)',
                  textShadow: '0 0 6px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
                }}
              >
                Attach3d Jobs
              </h2>
            </div>
            <span
              className="rounded-full border px-3 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.1)',
                borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
                color: 'var(--accent)',
              }}
            >
              {tasks.length} jobs
            </span>
          </div>

          <div className="px-5 py-5 flex flex-col gap-3 min-h-[200px]">
            {tasks.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                <svg
                  className="mb-3 h-10 w-10"
                  style={{ color: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm font-medium text-slate-400">No jobs assigned.</p>
              </div>
            ) : (
              tasks
                // ✅ Fixed: guard against task.date being undefined
                .sort((a, b) => {
                  if (!a.date && !b.date) return 0;
                  if (!a.date) return 1;
                  if (!b.date) return -1;
                  return new Date(a.date).getTime() - new Date(b.date).getTime();
                })
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col gap-2 rounded-2xl border bg-black/60 px-5 py-4 transition hover:bg-slate-900"
                    style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                  >
                    {/* Task header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                          task.status === 'completed'
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                            : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                        }`} />
                        <p className={`text-base font-bold truncate ${
                          task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'
                        }`}>
                          {task.title}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">
                        {task.date || 'No date'}
                      </span>
                    </div>

                    {/* Task details */}
                    <div className="flex flex-col gap-1 pl-5 mt-1">
                      {task.jobType && (
                        <p className="text-xs font-medium" style={{ color: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8)' }}>
                          {task.jobType}
                        </p>
                      )}
                      {task.address && <p className="text-xs text-slate-400">{task.address}</p>}
                      {(task.startTime || task.endTime) && (
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">
                          TIME: {task.startTime || '?'} - {task.endTime || '?'}
                        </p>
                      )}
                    </div>

                    {/* Delete confirm or button */}
                    {confirmDeleteId === task.id ? (
                      <div className="mt-2 flex items-center gap-2 pl-5">
                        <span className="text-xs text-red-400 font-semibold">Delete this job?</span>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-xs font-bold px-3 py-1 rounded-full bg-red-500 text-white hover:bg-red-400 transition"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-bold px-3 py-1 rounded-full border border-slate-600 text-slate-400 hover:text-white transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(task.id)}
                        className="mt-1 self-start ml-5 text-[10px] font-semibold text-red-400/60 hover:text-red-400 transition tracking-wide uppercase"
                      >
                        Delete job
                      </button>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}