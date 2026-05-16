'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Calendar, Plus, Users, Clock, ArrowRight, User, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Task, Contact, loadData } from '../../lib/storage';
import { loadDisplayName } from '../../lib/theme';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Try to load saved display name, fall back to auth metadata
        const savedName = await loadDisplayName(user.id);
        const fallback =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'User';
        setDisplayName(savedName || fallback);
      }

      setLoading(false);
    };
    getUser();
    const data = loadData();
    setTasks(data.tasks);
    setContacts(data.contacts);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const todaysTasks = tasks.filter(task => task.date === today);

  const getContactName = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact ? contact.name : 'Unknown Contact';
  };

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-start sm:py-10">
      {/* Mobile App Container */}
      <div
        className="w-full max-w-md bg-slate-900 min-h-screen sm:min-h-[850px] sm:border relative overflow-hidden flex flex-col"
        style={{
          borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
          boxShadow: '0 0 40px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)',
        }}
      >

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pb-32">

          {/* Header */}
          <header
            className="bg-slate-900 px-6 pt-12 pb-6 border-b mb-6"
            style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Good morning,</p>
                <h1 className="text-2xl font-bold text-slate-100">{displayName}</h1>
              </div>
              <button
                onClick={handleLogout}
                className="h-12 w-12 rounded-full bg-slate-950 flex items-center justify-center border transition-colors"
                style={{
                  borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)',
                  boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)',
                }}
                title="Log out"
              >
                <LogOut style={{ color: 'var(--accent)' }} size={20} />
              </button>
            </div>
          </header>

          <main className="px-6">

            {/* Quick Actions */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-200 mb-4 text-center tracking-wide">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/create-task"
                  className="text-slate-950 p-5 border flex flex-col items-center justify-center transition-transform active:scale-95 text-center"
                  style={{
                    backgroundColor: 'var(--accent)',
                    borderColor: 'var(--accent)',
                    boxShadow: '0 0 20px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
                  }}
                >
                  <div className="bg-slate-950/20 p-2 mb-3 border border-slate-950/20">
                    <Plus size={24} className="text-slate-950" />
                  </div>
                  <span className="font-bold text-lg">New Task</span>
                </Link>

                <Link
                  href="/manage-contacts"
                  className="bg-slate-800 p-5 border flex flex-col items-center justify-center transition-transform active:scale-95 text-center hover:bg-slate-700"
                  style={{
                    color: 'var(--accent)',
                    borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
                    boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.1)',
                  }}
                >
                  <div
                    className="bg-slate-900 p-2 mb-3 border"
                    style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
                  >
                    <Users size={24} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span className="font-semibold text-lg tracking-wide">Clients</span>
                </Link>
              </div>
            </section>

            {/* Today's Schedule */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-200 tracking-wide">Today's Schedule</h2>
                <Link
                  href="/calendar"
                  className="text-sm font-medium flex items-center gap-1"
                  style={{
                    color: 'var(--accent)',
                    filter: 'drop-shadow(0 0 5px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8))',
                  }}
                >
                  View all <ArrowRight size={16} />
                </Link>
              </div>

              <div className="space-y-4">
                {todaysTasks.length === 0 ? (
                  <div
                    className="bg-slate-800 border p-8 flex flex-col items-center justify-center gap-2"
                    style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}
                  >
                    <Calendar style={{ color: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)' }} size={32} />
                    <p className="text-slate-400 text-sm">No tasks scheduled for today</p>
                    <Link
                      href="/create-task"
                      className="mt-2 text-xs font-semibold flex items-center gap-1"
                      style={{ color: 'var(--accent)' }}
                    >
                      <Plus size={12} /> Add a task
                    </Link>
                  </div>
                ) : (
                  todaysTasks.map((task, index) => {
                    const isFirst = index === 0;
                    return (
                      <div
                        key={task.id}
                        className="bg-slate-800 p-5 border flex gap-4 items-center transition-colors"
                        style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}
                      >
                        {/* Time / Index box */}
                        <div
                          className="flex flex-col items-center justify-center px-3 py-2 min-w-[70px] bg-slate-950 border"
                          style={{
                            borderColor: isFirst
                              ? 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)'
                              : 'rgb(51,65,85)',
                          }}
                        >
                          {(task as any).time ? (
                            <>
                              <span
                                className="text-sm font-bold"
                                style={{
                                  color: isFirst ? 'var(--accent)' : 'rgb(203,213,225)',
                                  filter: isFirst ? 'drop-shadow(0 0 5px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5))' : 'none',
                                }}
                              >
                                {(task as any).time.split(':').slice(0, 2).join(':')}
                              </span>
                              <span
                                className="text-xs font-semibold"
                                style={{ color: isFirst ? 'var(--accent)' : 'rgb(100,116,139)', opacity: isFirst ? 0.6 : 1 }}
                              >
                                {parseInt((task as any).time) >= 12 ? 'PM' : 'AM'}
                              </span>
                            </>
                          ) : (
                            <span
                              className="text-lg font-bold"
                              style={{ color: isFirst ? 'var(--accent)' : 'rgb(148,163,184)' }}
                            >
                              #{index + 1}
                            </span>
                          )}
                        </div>

                        {/* Task details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-100 text-lg truncate">{task.title}</h3>
                          <p className="text-slate-400 text-sm mb-1 truncate">
                            {getContactName(task.contactId)}
                          </p>
                          {task.address && (
                            <p className="text-slate-500 text-xs mb-2 truncate">{task.address}</p>
                          )}
                          <div
                            className="flex items-center gap-1 text-xs font-bold px-2 py-1 inline-flex"
                            style={isFirst ? {
                              color: 'rgb(8,47,73)',
                              backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.9)',
                              boxShadow: '0 0 10px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)',
                            } : {
                              color: 'rgb(203,213,225)',
                              backgroundColor: 'rgb(51,65,85)',
                              border: '1px solid rgb(71,85,105)',
                            }}
                          >
                            <Clock size={12} />
                            {(task as any).status || (isFirst ? 'In Progress' : 'Scheduled')}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </main>
        </div>

        {/* Bottom Navigation */}
        <nav
          className="absolute bottom-0 w-full bg-slate-900 border-t px-6 py-4 flex justify-between items-center pb-8 sm:pb-6"
          style={{
            borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)',
            boxShadow: '0 -10px 30px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.05)',
          }}
        >
          <Link
            href="/calendar"
            className="flex flex-col items-center gap-1"
            style={{
              color: 'var(--accent)',
              filter: 'drop-shadow(0 0 8px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.6))',
            }}
          >
            <Calendar size={24} />
            <span className="text-[10px] font-bold tracking-wider">TODAY</span>
          </Link>

          <Link href="/manage-contacts" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <Users size={24} />
            <span className="text-[10px] font-medium tracking-wider">CLIENTS</span>
          </Link>

          {/* FAB */}
          <div className="relative -top-6">
            <Link
              href="/create-task"
              className="text-slate-950 p-4 border flex items-center justify-center transition-colors"
              style={{
                backgroundColor: 'var(--accent)',
                borderColor: 'var(--accent)',
                boxShadow: '0 0 20px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.6)',
              }}
            >
              <Plus size={28} />
            </Link>
          </div>

          <Link href="/history" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <Clock size={24} />
            <span className="text-[10px] font-medium tracking-wider">HISTORY</span>
          </Link>

          <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <User size={24} />
            <span className="text-[10px] font-medium tracking-wider">PROFILE</span>
          </Link>
        </nav>

      </div>
    </div>
  );
}