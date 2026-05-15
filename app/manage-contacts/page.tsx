'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Contact, Task, loadData } from '../../lib/storage';

export default function ManageContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const data = loadData();
    setContacts(data.contacts);
    setTasks(data.tasks);
  }, []);

  const tasksForContact = (contactId: string) => tasks.filter((task) => task.contactId === contactId);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-start px-4 py-8 gap-6 w-full">
        
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-2">
          <div className="rounded-xl border border-cyan-400 px-4 py-2 text-base font-extrabold tracking-wide text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4),inset_0_0_10px_rgba(34,211,238,0.4)] [text-shadow:0_0_8px_#22d3ee]">
            Contacts
          </div>
          <Link href="/dashboard" className="text-[11px] text-slate-500 hover:text-cyan-400 transition">
            Back to Dashboard
          </Link>
        </div>

        {/* Create Task Button */}
        <Link href="/create-task" className="w-full rounded-2xl bg-cyan-500 py-3 text-center text-sm font-bold text-black transition hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] hover:shadow-[0_0_25px_rgba(34,211,238,0.8)]">
          + Create New Task
        </Link>

        {/* Contacts List Box */}
        <div className="w-full rounded-3xl border border-cyan-500/30 bg-slate-900/40 backdrop-blur-sm shadow-[0_0_30px_rgba(6,182,212,0.1)] overflow-hidden mt-2">
          <div className="flex items-center justify-between border-b border-cyan-500/20 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <h2 className="text-base font-bold uppercase tracking-widest text-cyan-400 [text-shadow:0_0_6px_rgba(34,211,238,0.4)]">
                Contacts List
              </h2>
            </div>
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/40 px-3 py-0.5 text-xs font-semibold text-cyan-300">
              {contacts.length} total
            </span>
          </div>

          <div className="px-5 py-5 min-h-[250px] flex flex-col gap-3">
            {contacts.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                <svg className="mb-4 h-12 w-12 text-cyan-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-base font-medium text-slate-400">No contacts yet.</p>
                <p className="mt-1 text-xs text-slate-500">Create a task to add one.</p>
              </div>
            ) : (
              contacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/contact/${contact.id}`}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-cyan-500/20 bg-black/60 px-5 py-4 transition hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-slate-900 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                >
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{contact.name}</h3>
                    <p className="text-xs text-cyan-400/80 truncate mt-0.5">{contact.email}</p>
                    {contact.phone && <p className="text-xs text-slate-400 truncate mt-0.5">{contact.phone}</p>}
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-2">
                    <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-1 text-[10px] font-bold text-cyan-300">
                      {tasksForContact(contact.id).length} Jobs
                    </span>
                    <svg className="h-4 w-4 text-cyan-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
