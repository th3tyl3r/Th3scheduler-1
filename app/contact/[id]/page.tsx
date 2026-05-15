'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Contact, Task, loadData } from '../../../lib/storage';

export default function ContactDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = loadData();
    const foundContact = data.contacts.find((c) => c.id === id);
    if (foundContact) {
      setContact(foundContact);
      setTasks(data.tasks.filter((t) => t.contactId === id));
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (!contact) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-cyan-400 mb-4">Contact Not Found</h1>
        <Link href="/manage-contacts" className="text-sm text-slate-400 hover:text-cyan-400 underline">
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
          <div className="rounded-xl border border-cyan-400 px-4 py-2 text-base font-extrabold tracking-wide text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4),inset_0_0_10px_rgba(34,211,238,0.4)] [text-shadow:0_0_8px_#22d3ee]">
            Cli3nt D3tails
          </div>
          <Link href="/manage-contacts" className="text-[11px] text-slate-500 hover:text-cyan-400 transition">
            Back to Contacts
          </Link>
        </div>

        {/* Contact Info Card */}
        <div className="w-full rounded-3xl border border-cyan-500/40 bg-slate-900/60 backdrop-blur-md shadow-[0_0_40px_rgba(6,182,212,0.15)] p-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan-400 bg-black shadow-[0_0_15px_rgba(34,211,238,0.5)]">
            <span className="text-2xl font-bold text-cyan-300">
              {contact.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">{contact.name}</h1>
          <p className="mt-1 text-sm font-medium text-cyan-400/80">{contact.email}</p>
          {contact.phone && (
            <p className="mt-1 text-sm text-slate-400">{contact.phone}</p>
          )}
        </div>

        {/* Jobs/Tasks List */}
        <div className="w-full rounded-3xl border border-cyan-500/30 bg-slate-900/40 backdrop-blur-sm shadow-[0_0_30px_rgba(6,182,212,0.1)] overflow-hidden mt-2">
          <div className="flex items-center justify-between border-b border-cyan-500/20 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <h2 className="text-base font-bold uppercase tracking-widest text-cyan-400 [text-shadow:0_0_6px_rgba(34,211,238,0.4)]">
                Attach3d Jobs
              </h2>
            </div>
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/40 px-3 py-0.5 text-xs font-semibold text-cyan-300">
              {tasks.length} jobs
            </span>
          </div>

          <div className="px-5 py-5 flex flex-col gap-3 min-h-[200px]">
            {tasks.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                <svg className="mb-3 h-10 w-10 text-cyan-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm font-medium text-slate-400">No jobs assigned.</p>
              </div>
            ) : (
              tasks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col gap-2 rounded-2xl border border-cyan-500/20 bg-black/60 px-5 py-4 transition hover:border-cyan-400 hover:bg-slate-900 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                        task.status === 'completed' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                      }`} />
                      <p className={`text-base font-bold truncate ${
                        task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'
                      }`}>
                        {task.title}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">{task.date}</span>
                  </div>
                  <div className="flex flex-col gap-1 pl-5 mt-1">
                    {task.jobType && (
                      <p className="text-xs font-medium text-cyan-400/80">{task.jobType}</p>
                    )}
                    {task.address && (
                      <p className="text-xs text-slate-400">{task.address}</p>
                    )}
                    {(task.startTime || task.endTime) && (
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">
                        TIME: {task.startTime || '?'} - {task.endTime || '?'}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
