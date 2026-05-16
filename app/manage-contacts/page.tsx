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
          <div
            className="rounded-xl border px-4 py-2 text-base font-extrabold tracking-wide"
            style={{
              color: 'var(--accent)',
              borderColor: 'var(--accent)',
              boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4), inset 0 0 10px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
              textShadow: '0 0 8px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8)',
            }}
          >
            Contacts
          </div>
          <Link
            href="/dashboard"
            className="text-[11px] text-slate-500 transition hover:opacity-80"
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = '')}
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Create Task Button */}
        <Link
          href="/create-task"
          className="w-full rounded-2xl py-3 text-center text-sm font-bold text-black transition"
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
          + Create New Task
        </Link>

        {/* Contacts List Box */}
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
                Contacts List
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
              {contacts.length} total
            </span>
          </div>

          <div className="px-5 py-5 min-h-[250px] flex flex-col gap-3">
            {contacts.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                <svg
                  className="mb-4 h-12 w-12"
                  style={{ color: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
                  className="flex items-center justify-between gap-2 rounded-2xl border bg-black/60 px-5 py-4 transition hover:-translate-y-0.5 hover:bg-slate-900"
                  style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)';
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{contact.name}</h3>
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8)' }}
                    >
                      {contact.email}
                    </p>
                    {contact.phone && <p className="text-xs text-slate-400 truncate mt-0.5">{contact.phone}</p>}
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-2">
                    <span
                      className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-1 text-[10px] font-bold"
                      style={{ color: 'var(--accent)' }}
                    >
                      {tasksForContact(contact.id).length} Jobs
                    </span>
                    <svg
                      className="h-4 w-4"
                      style={{ color: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
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