'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Calendar, Plus, Users, Clock, ArrowRight, User, LogOut,
  Play, CheckCircle, Trash2, Pencil, X, DollarSign,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Task, Contact, loadData, saveData } from '../../lib/storage';
import { loadDisplayName } from '../../lib/theme';
import { ModeToggle } from '../components/ModeToggle';
import { useAppMode } from '../context/AppModeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetEntry {
  id: string;
  user_id: string;
  amount: number;
  label: string;
  category: string;
  date: string;
  contact_id?: string | null;
  task_id?: string | null;
  created_at?: string;
}

// ─── Edit-task modal ──────────────────────────────────────────────────────────

interface EditModalProps {
  task: Task;
  contacts: Contact[];
  onClose: () => void;
  onSave: (updated: Task) => void;
}

function EditTaskModal({ task, contacts, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState({ ...task });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof Task, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = loadData();
    const updatedTasks = data.tasks.map((t: Task) => t.id === form.id ? form : t);
    saveData({ ...data, tasks: updatedTasks });
    await supabase.from('tasks').update({
      title: form.title,
      date: form.date,
      start_time: form.startTime,
      address: form.address,
      contact_id: form.contactId,
      status: form.status,
      notes: form.notes,
    }).eq('id', form.id);
    onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(2,6,23,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md bg-slate-900 border overflow-hidden"
        style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}
        >
          <h2 className="text-lg font-bold text-slate-100">Edit Task</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100"><X size={20} /></button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Title</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full bg-slate-800 border text-slate-100 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Date</label>
              <input
                type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full bg-slate-800 border text-slate-100 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Start Time</label>
              <input
                type="time" value={form.startTime || ''} onChange={e => set('startTime', e.target.value)}
                className="w-full bg-slate-800 border text-slate-100 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Address</label>
            <input
              value={form.address || ''} onChange={e => set('address', e.target.value)}
              className="w-full bg-slate-800 border text-slate-100 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Client</label>
            <select
              value={form.contactId || ''} onChange={e => set('contactId', e.target.value)}
              className="w-full bg-slate-800 border text-slate-100 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
            >
              <option value="">No client</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
            <select
              value={form.status || 'scheduled'} onChange={e => set('status', e.target.value)}
              className="w-full bg-slate-800 border text-slate-100 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
            >
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Notes</label>
            <textarea
              value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3}
              className="w-full bg-slate-800 border text-slate-100 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] resize-none"
              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
            />
          </div>
        </div>

        <div
          className="px-5 py-4 border-t flex gap-3"
          style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold bg-slate-800 text-slate-300 border hover:bg-slate-700 transition-colors"
            style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 text-sm font-bold text-slate-950 transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Budget Widget ────────────────────────────────────────────────────────────

function BudgetWidget({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    supabase
      .from('budget_entries').select('*').eq('user_id', userId).eq('date', today)
      .then(({ data }) => { setEntries(data || []); setLoading(false); });
  }, [userId]);

  const income  = entries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
  const net     = income - expense;
  if (loading) return null;
  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  return (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-200 tracking-wide">Today's Budget</h2>
        <Link href="/budget" className="text-sm font-medium flex items-center gap-1"
          style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 5px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8))' }}>
          View all <ArrowRight size={16} />
        </Link>
      </div>
      <div className="bg-slate-800 border p-5" style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Net Today</p>
            <p className="text-3xl font-bold" style={{ color: net >= 0 ? 'rgb(34,197,94)' : 'rgb(239,68,68)' }}>
              {net >= 0 ? '' : '-'}{fmt(Math.abs(net))}
            </p>
          </div>
          <Link href="/budget?new=1" className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-950"
            style={{ backgroundColor: 'var(--accent)' }}>
            <Plus size={12} /> Add Entry
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border p-3 flex items-center gap-2" style={{ borderColor: 'rgba(34,197,94,0.25)' }}>
            <TrendingUp size={16} className="text-green-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Income</p>
              <p className="text-sm font-bold text-green-400">{fmt(income)}</p>
            </div>
          </div>
          <div className="bg-slate-900 border p-3 flex items-center gap-2" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
            <TrendingDown size={16} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Expenses</p>
              <p className="text-sm font-bold text-red-400">{fmt(expense)}</p>
            </div>
          </div>
        </div>
        {entries.length === 0 && <p className="text-xs text-slate-500 text-center mt-3">No budget entries for today</p>}
      </div>
    </section>
  );
}

// ─── Crew Quick Access ────────────────────────────────────────────────────────

function CrewQuickAccess() {
  return (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-200 tracking-wide">Crew</h2>
        <Link href="/crew" className="text-sm font-medium flex items-center gap-1"
          style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 5px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8))' }}>
          Manage <ArrowRight size={16} />
        </Link>
      </div>
      <Link href="/crew" className="bg-slate-800 border p-5 flex items-center gap-4 transition-colors"
        style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
        <div className="p-3 bg-slate-900 border" style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}>
          <Users size={22} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <p className="font-semibold text-slate-100 text-sm">Team Members</p>
          <p className="text-xs text-slate-400 mt-0.5">Add, edit, and manage your crew</p>
        </div>
        <ArrowRight size={16} className="ml-auto text-slate-500" />
      </Link>
    </section>
  );
}

// ─── Crew Schedule Widget ─────────────────────────────────────────────────────

interface CrewShiftRow {
  memberName: string;
  memberColor: string;
  role: string;
  label: string;
  time: string;
  type: 'shift' | 'job';
}

function CrewScheduleWidget() {
  const [rows, setRows] = useState<CrewShiftRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const todayStart = `${today}T00:00:00`;
    const todayEnd   = `${today}T23:59:59`;

    async function load() {
      // 1. all team members
      const { data: members } = await supabase
        .from('team_members')
        .select('id, name, role, color');
      if (!members?.length) { setLoading(false); return; }

      const memberMap = Object.fromEntries(members.map(m => [m.id, m]));
      const memberIds = members.map(m => m.id);
      const result: CrewShiftRow[] = [];

      // 2. shifts today + their assignments
      const { data: shifts } = await supabase
        .from('shifts')
        .select('id, title, start_time, end_time')
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd);

      if (shifts?.length) {
        const shiftIds = shifts.map(s => s.id);
        const { data: assignments } = await supabase
          .from('shift_assignments')
          .select('shift_id, team_member_id')
          .in('shift_id', shiftIds);

        for (const a of assignments ?? []) {
          const member = memberMap[a.team_member_id];
          const shift  = shifts.find(s => s.id === a.shift_id);
          if (!member || !shift) continue;
          const start = new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const end   = new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          result.push({
            memberName:  member.name,
            memberColor: member.color || '#888888',
            role:        member.role  || 'Crew',
            label:       shift.title,
            time:        `${start} – ${end}`,
            type:        'shift',
          });
        }
      }

      // 3. jobs assigned to crew members today
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, scheduled_date, assigned_to, status')
        .in('assigned_to', memberIds)
        .eq('scheduled_date', today);

      for (const job of jobs ?? []) {
        const member = memberMap[job.assigned_to];
        if (!member) continue;
        result.push({
          memberName:  member.name,
          memberColor: member.color || '#888888',
          role:        member.role  || 'Crew',
          label:       job.title,
          time:        job.status ?? 'scheduled',
          type:        'job',
        });
      }

      result.sort((a, b) => a.memberName.localeCompare(b.memberName));
      setRows(result);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) return (
    <div className="bg-slate-800 border p-6 flex items-center justify-center"
      style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
      <span className="text-xs text-slate-500 animate-pulse">Loading crew schedule…</span>
    </div>
  );

  if (rows.length === 0) return (
    <div className="bg-slate-800 border p-8 flex flex-col items-center justify-center gap-2"
      style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
      <Users style={{ color: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)' }} size={32} />
      <p className="text-slate-400 text-sm">No crew shifts or jobs today</p>
      <Link href="/crew/calendar" className="mt-2 text-xs font-semibold flex items-center gap-1"
        style={{ color: 'var(--accent)' }}>
        <Plus size={12} /> Assign shifts
      </Link>
    </div>
  );

  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const hex = row.memberColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 100;
        const g = parseInt(hex.substring(2, 4), 16) || 100;
        const b = parseInt(hex.substring(4, 6), 16) || 100;
        const rgb = `${r},${g},${b}`;

        return (
          <div key={i}
            className="bg-slate-800 border flex items-center gap-3 px-4 py-3"
            style={{ borderColor: `rgba(${rgb},0.25)` }}>
            {/* color avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: `rgba(${rgb},0.2)`,
                border: `2px solid rgba(${rgb},0.5)`,
                color: row.memberColor,
              }}>
              {row.memberName.charAt(0).toUpperCase()}
            </div>
            {/* name + job/shift label */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{row.memberName}</p>
              <p className="text-xs truncate" style={{ color: `rgba(${rgb},0.8)` }}>{row.label}</p>
            </div>
            {/* time / status badge */}
            <div className="flex-shrink-0">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ background: `rgba(${rgb},0.15)`, color: row.memberColor }}>
                {row.type === 'shift' ? '⏱' : '🔧'} {row.time}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { mode } = useAppMode();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
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

  const handleStatusUpdate = async (taskId: string, newStatus: 'in-progress' | 'completed') => {
    setActionLoading(taskId + newStatus);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    const data = loadData();
    saveData({ ...data, tasks: data.tasks.map((t: Task) => t.id === taskId ? { ...t, status: newStatus } : t) });
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    setActionLoading(null);
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return;
    setActionLoading(taskId + 'delete');
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const data = loadData();
    saveData({ ...data, tasks: data.tasks.filter((t: Task) => t.id !== taskId) });
    await supabase.from('tasks').delete().eq('id', taskId);
    setActionLoading(null);
  };

  const handleTaskSaved = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  if (loading) return <div className="min-h-screen bg-slate-950" />;
  if (!user) { window.location.href = '/login'; return null; }

  const today = new Date().toLocaleDateString('en-CA');
  const todaysTasks = tasks.filter(task => task.date === today);
  const getContactName = (contactId?: string) => contacts.find(c => c.id === contactId)?.name ?? null;

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-start sm:py-10">
      {editingTask && (
        <EditTaskModal
          task={editingTask} contacts={contacts}
          onClose={() => setEditingTask(null)} onSave={handleTaskSaved}
        />
      )}

      <div
        className="w-full max-w-md bg-slate-900 min-h-screen sm:min-h-[850px] sm:border relative overflow-hidden flex flex-col"
        style={{
          borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
          boxShadow: '0 0 40px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)',
        }}
      >
        <div className="flex-1 overflow-y-auto pb-32">

          {/* Header */}
          <header
            className="bg-slate-900 px-6 pt-12 pb-6 border-b mb-6"
            style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Good morning,</p>
                <h1 className="text-2xl font-bold text-slate-100">{displayName}</h1>
              </div>
              <div className="flex flex-col items-end gap-3">
                <button
                  onClick={handleLogout}
                  className="h-10 w-10 rounded-full bg-slate-950 flex items-center justify-center border transition-colors"
                  style={{
                    borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)',
                    boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)',
                  }}
                  title="Log out"
                >
                  <LogOut style={{ color: 'var(--accent)' }} size={18} />
                </button>
                <ModeToggle />
              </div>
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
                    backgroundColor: 'var(--accent)', borderColor: 'var(--accent)',
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
                  <div className="bg-slate-900 p-2 mb-3 border" style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}>
                    <Users size={24} style={{ color: 'var(--accent)' }} />
                  </div>
                  <span className="font-semibold text-lg tracking-wide">Clients</span>
                </Link>
              </div>
            </section>

            {/* Crew section — only visible in crew mode */}
            {mode === 'crew' && <CrewQuickAccess />}

            {/* Budget Widget */}
            <BudgetWidget userId={user.id} />

            {/* Today's Schedule — personal mode */}
            {/* Today's Crew — crew mode */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-200 tracking-wide">
                  {mode === 'crew' ? "Today's Crew" : "Today's Schedule"}
                </h2>
                <Link
                  href={mode === 'crew' ? '/crew/calendar' : '/calendar'}
                  className="text-sm font-medium flex items-center gap-1"
                  style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 5px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.8))' }}>
                  View all <ArrowRight size={16} />
                </Link>
              </div>

              {mode === 'crew' ? (
                <CrewScheduleWidget />
              ) : (
                <div className="space-y-4">
                  {todaysTasks.length === 0 ? (
                    <div className="bg-slate-800 border p-8 flex flex-col items-center justify-center gap-2"
                      style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
                      <Calendar style={{ color: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)' }} size={32} />
                      <p className="text-slate-400 text-sm">No tasks scheduled for today</p>
                      <Link href="/create-task" className="mt-2 text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                        <Plus size={12} /> Add a task
                      </Link>
                    </div>
                  ) : (
                    todaysTasks.map((task, index) => {
                      const isFirst = index === 0;
                      const contactName = getContactName(task.contactId);
                      const isCompleted = task.status === 'completed';
                      const isStarted = task.status === 'in-progress';
                      const isDeleting = actionLoading === task.id + 'delete';
                      const isUpdating = actionLoading === task.id + 'in-progress' || actionLoading === task.id + 'completed';

                      return (
                        <div
                          key={task.id}
                          className="bg-slate-800 border flex flex-col transition-all duration-200"
                          style={{
                            borderColor: isCompleted ? 'rgba(34,197,94,0.4)' : isStarted
                              ? 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)'
                              : 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)',
                            opacity: isDeleting ? 0.4 : 1,
                          }}
                        >
                          <div className="p-5 flex gap-4 items-center">
                            <div
                              className="flex flex-col items-center justify-center px-3 py-2 min-w-[70px] bg-slate-950 border flex-shrink-0"
                              style={{ borderColor: isFirst ? 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' : 'rgb(51,65,85)' }}
                            >
                              {task.startTime ? (
                                <>
                                  <span className="text-sm font-bold" style={{
                                    color: isFirst ? 'var(--accent)' : 'rgb(203,213,225)',
                                    filter: isFirst ? 'drop-shadow(0 0 5px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5))' : 'none',
                                  }}>
                                    {task.startTime.split(':').slice(0, 2).join(':')}
                                  </span>
                                  <span className="text-xs font-semibold" style={{ color: isFirst ? 'var(--accent)' : 'rgb(100,116,139)', opacity: isFirst ? 0.6 : 1 }}>
                                    {parseInt(task.startTime) >= 12 ? 'PM' : 'AM'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-lg font-bold" style={{ color: isFirst ? 'var(--accent)' : 'rgb(148,163,184)' }}>
                                  #{index + 1}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-100 text-lg truncate">{task.title}</h3>
                              {contactName && <p className="text-slate-400 text-sm mb-1 truncate">{contactName}</p>}
                              {task.address && <p className="text-slate-500 text-xs mb-2 truncate">{task.address}</p>}
                              <div
                                className="flex items-center gap-1 text-xs font-bold px-2 py-1 inline-flex"
                                style={
                                  isCompleted ? { color: '#052e16', backgroundColor: 'rgba(34,197,94,0.85)' }
                                  : isStarted ? { color: 'rgb(8,47,73)', backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.9)', boxShadow: '0 0 10px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }
                                  : { color: 'rgb(203,213,225)', backgroundColor: 'rgb(51,65,85)', border: '1px solid rgb(71,85,105)' }
                                }
                              >
                                <Clock size={12} />
                                {isCompleted ? 'Completed' : isStarted ? 'In Progress' : task.status || 'Scheduled'}
                              </div>
                            </div>
                          </div>

                          <div className="flex border-t" style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)' }}>
                            <button onClick={() => setEditingTask(task)} disabled={isDeleting || isUpdating}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 transition-colors border-r disabled:cursor-not-allowed disabled:opacity-40"
                              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)' }}>
                              <Pencil size={11} /> Edit
                            </button>
                            <button onClick={() => handleStatusUpdate(task.id, 'in-progress')} disabled={isStarted || isUpdating || isDeleting}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-r disabled:cursor-not-allowed"
                              style={{
                                borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)',
                                color: isStarted ? 'var(--accent)' : 'rgb(148,163,184)',
                                backgroundColor: isStarted ? 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.1)' : 'transparent',
                                opacity: isStarted || isUpdating ? 0.5 : 1,
                              }}>
                              <Play size={11} fill={isStarted ? 'currentColor' : 'none'} /> Started
                            </button>
                            <button onClick={() => handleStatusUpdate(task.id, 'completed')} disabled={isCompleted || isUpdating || isDeleting}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-r disabled:cursor-not-allowed"
                              style={{
                                borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)',
                                color: isCompleted ? 'rgb(34,197,94)' : 'rgb(148,163,184)',
                                backgroundColor: isCompleted ? 'rgba(34,197,94,0.1)' : 'transparent',
                                opacity: isCompleted || isUpdating ? 0.5 : 1,
                              }}>
                              <CheckCircle size={11} fill={isCompleted ? 'currentColor' : 'none'} /> Done
                            </button>
                            <button onClick={() => handleDelete(task.id)} disabled={isDeleting || isUpdating}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-950/30 transition-colors disabled:cursor-not-allowed disabled:opacity-40">
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </section>
          </main>
        </div>

        {/* Bottom Nav */}
        <nav
          className="absolute bottom-0 w-full bg-slate-900 border-t px-4 py-4 flex justify-between items-center pb-8 sm:pb-6"
          style={{
            borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)',
            boxShadow: '0 -10px 30px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.05)',
          }}
        >
          <Link href="/calendar" className="flex flex-col items-center gap-1"
            style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 8px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.6))' }}>
            <Calendar size={22} />
            <span className="text-[10px] font-bold tracking-wider">TODAY</span>
          </Link>
          <Link href="/manage-contacts" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <User size={22} />
            <span className="text-[10px] font-medium tracking-wider">CLIENTS</span>
          </Link>

          {/* FAB */}
          <div className="relative -top-6">
            <Link href="/create-task" className="text-slate-950 p-4 border flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)', boxShadow: '0 0 20px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.6)' }}>
              <Plus size={28} />
            </Link>
          </div>

          <Link href="/budget" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <DollarSign size={22} />
            <span className="text-[10px] font-medium tracking-wider">BUDGET</span>
          </Link>

          {/* CREW — links to crew calendar in crew mode, crew members page in personal mode */}
          <Link
            href={mode === 'crew' ? '/crew/calendar' : '/crew'}
            className="flex flex-col items-center gap-1 transition-colors"
            style={mode === 'crew'
              ? { color: 'var(--accent)', filter: 'drop-shadow(0 0 8px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.6))' }
              : { color: 'rgb(100,116,139)' }
            }>
            <Users size={22} />
            <span className="text-[10px] font-medium tracking-wider">CREW</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}