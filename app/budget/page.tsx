'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft, Plus, X, TrendingUp, TrendingDown, DollarSign,
  Pencil, Trash2, ChevronLeft, ChevronRight, User, Check,
  RefreshCw, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Contact, loadData } from '../../lib/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetEntry {
  id: string; user_id: string; amount: number; label: string;
  category: string; date: string; job_id?: number | null;
  customer_id?: number | null; recurring_id?: string | null; created_at?: string;
}

interface RecurringSchedule {
  id: string; user_id: string; amount: number; label: string;
  category: string; type: 'income' | 'expense';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  start_date: string; end_date?: string | null;
  customer_id?: number | null; active: boolean; created_at?: string;
}

const FREQUENCIES: { value: RecurringSchedule['frequency']; label: string }[] = [
  { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' }, { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const EMPTY_FORM = {
  label: '', category: '', amount: '', type: 'income' as 'income' | 'expense',
  date: new Date().toLocaleDateString('en-CA'), contact_id: '',
  is_recurring: false, frequency: 'monthly' as RecurringSchedule['frequency'], end_date: '',
};

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const getFreqLabel = (freq: string) =>
  FREQUENCIES.find(f => f.value === freq)?.label ?? freq;

// ─── Occurrence Calculator ────────────────────────────────────────────────────

function getOccurrencesInMonth(s: RecurringSchedule, y: number, m: number): string[] {
  const monthStart = new Date(y, m, 1), monthEnd = new Date(y, m + 1, 0);
  const startDate  = new Date(s.start_date + 'T00:00:00');
  const endDate    = s.end_date ? new Date(s.end_date + 'T00:00:00') : null;
  if (startDate > monthEnd) return [];
  if (endDate && endDate < monthStart) return [];

  const cap = endDate && endDate < monthEnd ? endDate : monthEnd;
  const dates: string[] = [];
  const add = (d: Date) => {
    if (d >= monthStart && d <= cap && d >= startDate)
      dates.push(d.toLocaleDateString('en-CA'));
  };

  if (s.frequency === 'daily') {
    const cur = new Date(Math.max(monthStart.getTime(), startDate.getTime()));
    while (cur <= cap) { add(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  } else if (s.frequency === 'weekly') {
    const cur = new Date(startDate);
    while (cur < monthStart) cur.setDate(cur.getDate() + 7);
    while (cur <= monthEnd)  { add(new Date(cur)); cur.setDate(cur.getDate() + 7); }
  } else if (s.frequency === 'biweekly') {
    const cur = new Date(startDate);
    while (cur < monthStart) cur.setDate(cur.getDate() + 14);
    while (cur <= monthEnd)  { add(new Date(cur)); cur.setDate(cur.getDate() + 14); }
  } else if (s.frequency === 'monthly') {
    const last = new Date(y, m + 1, 0).getDate();
    add(new Date(y, m, Math.min(startDate.getDate(), last)));
  } else if (s.frequency === 'yearly' && startDate.getMonth() === m) {
    const last = new Date(y, m + 1, 0).getDate();
    add(new Date(y, m, Math.min(startDate.getDate(), last)));
  }
  return dates;
}

// ─── Entry Modal ──────────────────────────────────────────────────────────────

interface EntryModalProps {
  entry?: BudgetEntry | null; contacts: Contact[]; userId: string;
  defaultDate?: string; schedules: RecurringSchedule[];
  onClose: () => void; onSaved: (e: BudgetEntry) => void;
  onScheduleAdded: (s: RecurringSchedule) => void;
}

function EntryModal({ entry, contacts, userId, defaultDate, schedules, onClose, onSaved, onScheduleAdded }: EntryModalProps) {
  const existingSchedule = entry?.recurring_id
    ? schedules.find(s => s.id === entry.recurring_id) ?? null : null;

  const [form, setForm] = useState(() => entry ? {
    label: entry.label, category: entry.category,
    amount: String(Math.abs(entry.amount)),
    type: (entry.amount >= 0 ? 'income' : 'expense') as 'income' | 'expense',
    date: entry.date, contact_id: entry.customer_id ? String(entry.customer_id) : '',
    is_recurring: !!entry.recurring_id,
    frequency: (existingSchedule?.frequency ?? 'monthly') as RecurringSchedule['frequency'],
    end_date: existingSchedule?.end_date ?? '',
  } : { ...EMPTY_FORM, date: defaultDate || EMPTY_FORM.date });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.label.trim()) { setError('Label is required'); return; }
    const rawAmount = parseFloat(form.amount);
    if (isNaN(rawAmount) || rawAmount <= 0) { setError('Enter a valid positive amount'); return; }
    setSaving(true); setError('');

    const signedAmount = form.type === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
    let recurringId: string | null = entry?.recurring_id ?? null;

    if (form.is_recurring) {
      const sp = {
        user_id: userId, amount: Math.abs(rawAmount), label: form.label.trim(),
        category: form.category.trim() || '', type: form.type, frequency: form.frequency,
        start_date: form.date, end_date: form.end_date || null,
        customer_id: form.contact_id ? Number(form.contact_id) : null, active: true,
      };
      if (existingSchedule) {
        const { data, error: e } = await supabase.from('recurring_schedules')
          .update(sp).eq('id', existingSchedule.id).select().single();
        if (e) { setError(e.message); setSaving(false); return; }
        if (data) onScheduleAdded(data as RecurringSchedule);
        recurringId = existingSchedule.id;
      } else {
        const { data, error: e } = await supabase.from('recurring_schedules')
          .insert(sp).select().single();
        if (e) { setError(e.message); setSaving(false); return; }
        if (data) { onScheduleAdded(data as RecurringSchedule); recurringId = data.id; }
      }
    } else if (!form.is_recurring && entry?.recurring_id) {
      recurringId = null;
    }

    const payload = {
      user_id: userId, amount: signedAmount, label: form.label.trim(),
      category: form.category.trim() || '', date: form.date,
      customer_id: form.contact_id ? Number(form.contact_id) : null,
      recurring_id: recurringId,
    };

    const { data, error: dbErr } = entry
      ? await supabase.from('budget_entries').update(payload).eq('id', entry.id).select().single()
      : await supabase.from('budget_entries').insert(payload).select().single();

    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    if (data)  { onSaved(data as BudgetEntry); onClose(); }
    else setError('Failed to save. Please try again.');
  };

  const iStyle = { borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' };
  const iClass = "w-full bg-slate-800 border text-slate-100 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] placeholder-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(2,6,23,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-slate-900 border overflow-hidden"
        style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
          <h2 className="text-lg font-bold text-slate-100">{entry ? 'Edit Entry' : 'Add Budget Entry'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 max-h-[78vh] overflow-y-auto">

          {/* Income / Expense */}
          <div className="grid grid-cols-2 gap-2">
            {(['income', 'expense'] as const).map(t => (
              <button key={t} onClick={() => set('type', t)}
                className="py-2.5 text-sm font-bold border transition-all"
                style={{
                  borderColor: form.type === t ? (t === 'income' ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)') : 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)',
                  backgroundColor: form.type === t ? (t === 'income' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)') : 'transparent',
                  color: form.type === t ? (t === 'income' ? 'rgb(34,197,94)' : 'rgb(239,68,68)') : 'rgb(100,116,139)',
                }}>
                {t === 'income' ? '+ Income' : '− Expense'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Amount ($)</label>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={form.amount} onChange={e => set('amount', e.target.value)}
              className={iClass} style={iStyle} />
          </div>

          {/* Label */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Label</label>
            <input placeholder="e.g. Supplies, Invoice #42, Rent"
              value={form.label} onChange={e => set('label', e.target.value)}
              className={iClass} style={iStyle} />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
              Category <span className="text-slate-500 normal-case font-normal">(optional)</span>
            </label>
            <input placeholder="e.g. Fuel, Labor, Utilities"
              value={form.category} onChange={e => set('category', e.target.value)}
              className={iClass} style={iStyle} />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
              {form.is_recurring ? 'Start Date' : 'Date'}
            </label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className={iClass} style={iStyle} />
          </div>

          {/* Recurring */}
          <div className="border p-3 transition-all"
            style={{ borderColor: form.is_recurring ? 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.5)' : 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
            <button onClick={() => set('is_recurring', !form.is_recurring)}
              className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={14} style={{ color: form.is_recurring ? 'var(--accent)' : 'rgb(100,116,139)' }} />
                <span className="text-sm font-semibold text-slate-300">Recurring Entry</span>
              </div>
              <div className="relative w-10 h-5 rounded-full transition-colors"
                style={{ backgroundColor: form.is_recurring ? 'var(--accent)' : 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
                  style={{ left: form.is_recurring ? '1.25rem' : '0.125rem' }} />
              </div>
            </button>

            {form.is_recurring && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Frequency</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {FREQUENCIES.map(f => (
                      <button key={f.value} onClick={() => set('frequency', f.value)}
                        className="py-2 text-[10px] font-bold border transition-all"
                        style={{
                          borderColor: form.frequency === f.value ? 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.7)' : 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)',
                          backgroundColor: form.frequency === f.value ? 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)' : 'transparent',
                          color: form.frequency === f.value ? 'var(--accent)' : 'rgb(100,116,139)',
                        }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
                    End Date <span className="text-slate-500 normal-case font-normal">(optional — leave blank to repeat forever)</span>
                  </label>
                  <input type="date" value={form.end_date}
                    onChange={e => set('end_date', e.target.value)}
                    className={iClass} style={iStyle} />
                </div>
                <div className="flex items-start gap-2 p-2.5 border"
                  style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)', backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.05)' }}>
                  <AlertCircle size={12} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Entries will be auto-created each period when you navigate to that month.
                    Deleting one instance does not cancel the schedule — use the schedule pill on the main page to stop it.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Client */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
              Link to Client <span className="text-slate-500 normal-case font-normal">(optional)</span>
            </label>
            <select value={form.contact_id} onChange={e => set('contact_id', e.target.value)}
              className={iClass} style={iStyle}>
              <option value="">No client</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-3"
          style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold bg-slate-800 text-slate-300 border hover:bg-slate-700"
            style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}>
            {saving ? 'Saving…' : entry ? 'Save Changes' : 'Add Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cancel Recurring Modal ───────────────────────────────────────────────────

function CancelRecurringModal({ schedule, onConfirm, onClose }: {
  schedule: RecurringSchedule; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(2,6,23,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm bg-slate-900 border p-6 mx-4"
        style={{ borderColor: 'rgba(239,68,68,0.4)' }}>
        <div className="flex items-center gap-3 mb-4">
          <RefreshCw size={20} className="text-red-400" />
          <h2 className="text-base font-bold text-slate-100">Stop Recurring Schedule?</h2>
        </div>
        <p className="text-sm text-slate-400 mb-1">
          This will stop the <span className="text-slate-200 font-semibold">{getFreqLabel(schedule.frequency)}</span> schedule for:
        </p>
        <p className="text-sm font-bold text-slate-100 mb-3">"{schedule.label}"</p>
        <p className="text-xs text-slate-500 mb-5">
          Entries already created will not be deleted. Only future auto-generation will stop.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold bg-slate-800 text-slate-300 border"
            style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
            Keep It
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-bold bg-red-950/60 text-red-400 border border-red-500/40 hover:bg-red-950 transition-colors">
            Stop Recurring
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Budget Page ─────────────────────────────────────────────────────────

export default function BudgetPage() {
  const [user,           setUser]           = useState<any>(null);
  const [entries,        setEntries]        = useState<BudgetEntry[]>([]);
  const [schedules,      setSchedules]      = useState<RecurringSchedule[]>([]);
  const [contacts,       setContacts]       = useState<Contact[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showModal,      setShowModal]      = useState(false);
  const [editingEntry,   setEditingEntry]   = useState<BudgetEntry | null>(null);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [cancelSchedule, setCancelSchedule] = useState<RecurringSchedule | null>(null);

  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const userRef = useRef<string | null>(null); // stable uid ref for month-change effect

  const monthStart = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-CA');
  const monthEnd   = new Date(viewYear, viewMonth + 1, 0).toLocaleDateString('en-CA');
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today      = new Date().toLocaleDateString('en-CA');

  const prevMonth = () => viewMonth === 0
    ? (setViewYear(y => y - 1), setViewMonth(11))
    : setViewMonth(m => m - 1);
  const nextMonth = () => viewMonth === 11
    ? (setViewYear(y => y + 1), setViewMonth(0))
    : setViewMonth(m => m + 1);

  const generateRecurring = useCallback(async (
    uid: string, activeSchedules: RecurringSchedule[], existing: BudgetEntry[],
  ): Promise<BudgetEntry[]> => {
    const toInsert: object[] = [];
    for (const s of activeSchedules) {
      for (const dateStr of getOccurrencesInMonth(s, viewYear, viewMonth)) {
        if (!existing.some(e => e.recurring_id === s.id && e.date === dateStr)) {
          toInsert.push({
            user_id: uid, label: s.label, category: s.category, date: dateStr,
            amount: s.type === 'expense' ? -Math.abs(s.amount) : Math.abs(s.amount),
            customer_id: s.customer_id ?? null, recurring_id: s.id,
          });
        }
      }
    }
    if (!toInsert.length) return [];
    const { data, error } = await supabase.from('budget_entries').insert(toInsert).select();
    if (error) { console.error('Recurring generation error:', error); return []; }
    return (data ?? []) as BudgetEntry[];
  }, [viewYear, viewMonth]);

  const fetchAll = useCallback(async (uid: string) => {
    const [{ data: entryData, error: entryErr }, { data: scheduleData, error: scheduleErr }] =
      await Promise.all([
        supabase.from('budget_entries').select('*').eq('user_id', uid)
          .gte('date', monthStart).lte('date', monthEnd).order('date', { ascending: false }),
        supabase.from('recurring_schedules').select('*').eq('user_id', uid).eq('active', true),
      ]);

    if (entryErr)    console.error('Fetch entries error:', entryErr);
    if (scheduleErr) console.error('Fetch schedules error:', scheduleErr);

    const fetched   = (entryData    ?? []) as BudgetEntry[];
    const active    = (scheduleData ?? []) as RecurringSchedule[];
    setSchedules(active);

    const generated = await generateRecurring(uid, active, fetched);
    setEntries([...fetched, ...generated].sort((a, b) => b.date.localeCompare(a.date)));
  }, [monthStart, monthEnd, generateRecurring]);

  // Init once — auth, contacts, initial fetch, ?new=1 check
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser(user);
      userRef.current = user.id;
      setContacts(loadData().contacts || []);
      await fetchAll(user.id);
      setLoading(false);
      if (typeof window !== 'undefined' && window.location.search.includes('new=1'))
        setShowModal(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when month changes (never opens the modal)
  useEffect(() => {
    if (userRef.current) fetchAll(userRef.current);
  }, [viewYear, viewMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('budget_entries').delete().eq('id', id);
    if (error) { console.error('Delete error:', error); setDeletingId(null); return; }
    setEntries(prev => prev.filter(e => e.id !== id));
    setDeletingId(null);
  };

  const handleCancelSchedule = async () => {
    if (!cancelSchedule) return;
    const { error } = await supabase.from('recurring_schedules')
      .update({ active: false }).eq('id', cancelSchedule.id);
    if (!error) setSchedules(prev => prev.filter(s => s.id !== cancelSchedule.id));
    else console.error('Cancel schedule error:', error);
    setCancelSchedule(null);
  };

  const handleSaved = (saved: BudgetEntry) =>
    setEntries(prev => {
      const exists = prev.find(e => e.id === saved.id);
      return exists
        ? prev.map(e => e.id === saved.id ? saved : e)
        : [saved, ...prev].sort((a, b) => b.date.localeCompare(a.date));
    });

  const handleScheduleAdded = (s: RecurringSchedule) =>
    setSchedules(prev => prev.find(x => x.id === s.id)
      ? prev.map(x => x.id === s.id ? s : x) : [...prev, s]);

  const getContactName = (id?: number | null) =>
    id ? contacts.find(c => Number(c.id) === id)?.name ?? null : null;

  const income  = entries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
  const net     = income - expense;

  const grouped: Record<string, BudgetEntry[]> = {};
  entries.forEach(e => { (grouped[e.date] ??= []).push(e); });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatDateLabel = (d: string) => d === today ? 'Today'
    : new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  if (loading) return <div className="min-h-screen bg-slate-950" />;

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-start sm:py-10">

      {(showModal || editingEntry) && (
        <EntryModal
          entry={editingEntry} contacts={contacts} userId={user.id}
          defaultDate={today} schedules={schedules}
          onClose={() => { setShowModal(false); setEditingEntry(null); }}
          onSaved={handleSaved} onScheduleAdded={handleScheduleAdded}
        />
      )}
      {cancelSchedule && (
        <CancelRecurringModal
          schedule={cancelSchedule}
          onConfirm={handleCancelSchedule}
          onClose={() => setCancelSchedule(null)}
        />
      )}

      <div className="w-full max-w-md bg-slate-900 min-h-screen sm:min-h-[850px] sm:border relative overflow-hidden flex flex-col"
        style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)', boxShadow: '0 0 40px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)' }}>
        <div className="flex-1 overflow-y-auto pb-24">

          {/* Header */}
          <header className="bg-slate-900 px-6 pt-12 pb-6 border-b mb-6"
            style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="text-slate-400 hover:text-slate-100">
                  <ArrowLeft size={20} />
                </Link>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Budget</p>
                  <h1 className="text-2xl font-bold text-slate-100">Finance Tracker</h1>
                </div>
              </div>
              <button onClick={() => setShowModal(true)}
                className="h-11 w-11 flex items-center justify-center text-slate-950 transition-colors"
                style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)' }}>
                <Plus size={22} />
              </button>
            </div>
          </header>

          <main className="px-6">

            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="text-slate-400 hover:text-slate-100 p-1"><ChevronLeft size={20} /></button>
              <h2 className="text-sm font-bold text-slate-200 tracking-wide">{monthLabel}</h2>
              <button onClick={nextMonth} className="text-slate-400 hover:text-slate-100 p-1"><ChevronRight size={20} /></button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="col-span-3 bg-slate-800 border p-4 flex items-center justify-between"
                style={{ borderColor: net >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' }}>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">
                    Net {monthLabel.split(' ')[0]}
                  </p>
                  <p className="text-3xl font-bold" style={{ color: net >= 0 ? 'rgb(34,197,94)' : 'rgb(239,68,68)' }}>
                    {net >= 0 ? '' : '-'}{fmt(Math.abs(net))}
                  </p>
                </div>
                <DollarSign size={40} style={{ color: net >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }} />
              </div>

              <div className="bg-slate-800 border p-3" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
                <TrendingUp size={14} className="text-green-400 mb-1" />
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Income</p>
                <p className="text-sm font-bold text-green-400">{fmt(income)}</p>
              </div>
              <div className="bg-slate-800 border p-3" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                <TrendingDown size={14} className="text-red-400 mb-1" />
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Expenses</p>
                <p className="text-sm font-bold text-red-400">{fmt(expense)}</p>
              </div>
              <div className="bg-slate-800 border p-3"
                style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
                <Check size={14} className="mb-1" style={{ color: 'var(--accent)' }} />
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Entries</p>
                <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{entries.length}</p>
              </div>
            </div>

            {/* Active recurring strip */}
            {schedules.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Active Recurring — tap to cancel
                </p>
                <div className="flex flex-wrap gap-2">
                  {schedules.map(s => (
                    <button key={s.id} onClick={() => setCancelSchedule(s)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold border transition-all hover:border-red-500/40 hover:text-red-400 hover:bg-red-950/20"
                      style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.35)', color: 'var(--accent)', backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.07)' }}>
                      <RefreshCw size={9} /> {s.label} · {getFreqLabel(s.frequency)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Entry list */}
            {sortedDates.length === 0 ? (
              <div className="bg-slate-800 border p-10 flex flex-col items-center justify-center gap-3"
                style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
                <DollarSign size={32} style={{ color: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }} />
                <p className="text-slate-400 text-sm">No entries for {monthLabel}</p>
                <button onClick={() => setShowModal(true)}
                  className="text-xs font-bold flex items-center gap-1 px-3 py-2 text-slate-950"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  <Plus size={12} /> Add Entry
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDates.map(date => {
                  const dayEntries = grouped[date];
                  const dayNet     = dayEntries.reduce((s, e) => s + e.amount, 0);
                  return (
                    <div key={date}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{formatDateLabel(date)}</p>
                        <p className="text-xs font-bold" style={{ color: dayNet >= 0 ? 'rgb(34,197,94)' : 'rgb(239,68,68)' }}>
                          {dayNet >= 0 ? '+' : ''}{fmt(dayNet)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {dayEntries.map(entry => {
                          const isIncome      = entry.amount > 0;
                          const contactName   = getContactName(entry.customer_id);
                          const isDeleting    = deletingId === entry.id;
                          const entrySchedule = entry.recurring_id
                            ? schedules.find(s => s.id === entry.recurring_id) : null;
                          const stripe = isIncome ? 'rgb(34,197,94)' : 'rgb(239,68,68)';
                          const dimBorder = isIncome ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)';
                          const dimLine   = isIncome ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';

                          return (
                            <div key={entry.id}
                              className="bg-slate-800 border flex items-stretch transition-all"
                              style={{ borderColor: dimBorder, opacity: isDeleting ? 0.4 : 1 }}>
                              <div className="w-1 flex-shrink-0" style={{ backgroundColor: stripe }} />
                              <div className="flex-1 px-4 py-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="text-slate-100 font-semibold text-sm truncate">{entry.label}</p>
                                      {entrySchedule && (
                                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold flex-shrink-0"
                                          style={{ color: 'var(--accent)', backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.12)' }}>
                                          <RefreshCw size={8} /> {getFreqLabel(entrySchedule.frequency)}
                                        </span>
                                      )}
                                    </div>
                                    {entry.category && <p className="text-slate-400 text-xs truncate">{entry.category}</p>}
                                    {contactName && (
                                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--accent)' }}>
                                        <User size={10} /> {contactName}
                                      </p>
                                    )}
                                  </div>
                                  <p className="text-base font-bold flex-shrink-0" style={{ color: stripe }}>
                                    {isIncome ? '+' : '-'}{fmt(Math.abs(entry.amount))}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col border-l" style={{ borderColor: dimLine }}>
                                <button onClick={() => setEditingEntry(entry)}
                                  className="flex-1 px-3 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-700/40 border-b transition-colors"
                                  style={{ borderColor: dimLine }}>
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => handleDelete(entry.id)} disabled={isDeleting}
                                  className="flex-1 px-3 flex items-center justify-center text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-40">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>

        {/* Bottom nav */}
        <nav className="absolute bottom-0 w-full bg-slate-900 border-t px-4 py-4 flex justify-around items-center pb-8 sm:pb-6"
          style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)', boxShadow: '0 -10px 30px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.05)' }}>
          <Link href="/calendar" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <span className="text-[10px] font-medium tracking-wider">TODAY</span>
          </Link>
          <Link href="/manage-contacts" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <span className="text-[10px] font-medium tracking-wider">CLIENTS</span>
          </Link>
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <span className="text-[10px] font-medium tracking-wider">HOME</span>
          </Link>
          <Link href="/budget" className="flex flex-col items-center gap-1"
            style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 8px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.6))' }}>
            <DollarSign size={22} />
            <span className="text-[10px] font-bold tracking-wider">BUDGET</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <span className="text-[10px] font-medium tracking-wider">PROFILE</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}