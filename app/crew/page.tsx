'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Plus, X, Pencil, Trash2, Phone, Mail,
  Calendar, DollarSign, User, ChevronLeft,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppMode } from '../context/AppModeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrewMember {
  id: number;
  team_id: number;
  user_id: string | null;
  name: string;
  role: string;
  color: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface FormState {
  name: string;
  role: string;
  color: string;
  email: string;
  phone: string;
}

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#f97316',
];

const DEFAULT_FORM: FormState = {
  name: '',
  role: '',
  color: '#3b82f6',
  email: '',
  phone: '',
};

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface ModalProps {
  member: CrewMember | null;
  onClose: () => void;
  onSave: (member: CrewMember) => void;
  teamId: number;
}

function CrewMemberModal({ member, onClose, onSave, teamId }: ModalProps) {
  const [form, setForm] = useState<FormState>(
    member
      ? { name: member.name, role: member.role, color: member.color, email: member.email || '', phone: member.phone || '' }
      : { ...DEFAULT_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');

    if (member) {
      const { data, error: err } = await supabase
        .from('team_members')
        .update({
          name: form.name.trim(),
          role: form.role.trim(),
          color: form.color,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        })
        .eq('id', member.id)
        .select()
        .single();

      if (err) { setError(err.message); setSaving(false); return; }
      onSave(data as CrewMember);
    } else {
      const { data, error: err } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          name: form.name.trim(),
          role: form.role.trim(),
          color: form.color,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        })
        .select()
        .single();

      if (err) { setError(err.message); setSaving(false); return; }
      onSave(data as CrewMember);
    }

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
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}
        >
          <h2 className="text-lg font-bold text-slate-100">
            {member ? 'Edit Member' : 'Add Crew Member'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Name *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Tyler"
              className="w-full bg-slate-800 border text-slate-100 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] placeholder:text-slate-600"
              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Role</label>
            <input
              value={form.role}
              onChange={e => set('role', e.target.value)}
              placeholder="e.g. Electrician, Apprentice, Manager"
              className="w-full bg-slate-800 border text-slate-100 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] placeholder:text-slate-600"
              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => set('color', c)}
                  className="w-8 h-8 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: form.color === c ? `2px solid var(--accent)` : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
              <div className="relative w-8 h-8">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => set('color', e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="w-8 h-8 flex items-center justify-center border text-slate-300 text-[10px] font-bold"
                  style={{
                    backgroundColor: PRESET_COLORS.includes(form.color) ? 'rgb(30,41,59)' : form.color,
                    borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)',
                  }}
                >
                  +
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="Optional"
              className="w-full bg-slate-800 border text-slate-100 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] placeholder:text-slate-600"
              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="Optional"
              className="w-full bg-slate-800 border text-slate-100 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] placeholder:text-slate-600"
              style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' }}
            />
          </div>

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        </div>

        {/* Footer */}
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
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-bold text-slate-950 transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {saving ? 'Saving…' : member ? 'Save Changes' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CrewPage() {
  const { teamId } = useAppMode();
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Wait for context to provide teamId, then fetch members
  useEffect(() => {
    if (!teamId) return; // context still loading — wait
    supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMembers((data as CrewMember[]) || []);
        setLoading(false);
      });
  }, [teamId]);

  const handleSaved = (saved: CrewMember) => {
    setMembers(prev => {
      const exists = prev.find(m => m.id === saved.id);
      return exists
        ? prev.map(m => m.id === saved.id ? saved : m)
        : [...prev, saved];
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this crew member?')) return;
    setDeletingId(id);
    await supabase.from('team_members').delete().eq('id', id);
    setMembers(prev => prev.filter(m => m.id !== id));
    setDeletingId(null);
  };

  const openAdd = () => { setEditingMember(null); setShowModal(true); };
  const openEdit = (m: CrewMember) => { setEditingMember(m); setShowModal(true); };

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-start sm:py-10">

      {showModal && teamId && (
        <CrewMemberModal
          member={editingMember}
          teamId={teamId}
          onClose={() => setShowModal(false)}
          onSave={handleSaved}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.history.back()}
                  className="text-slate-400 hover:text-slate-100 transition-colors"
                >
                  <ChevronLeft size={22} />
                </button>
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-0.5">Manage</p>
                  <h1 className="text-2xl font-bold text-slate-100">Crew</h1>
                </div>
              </div>
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors"
                style={{
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
                }}
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </header>

          <main className="px-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="bg-slate-800 border h-20 animate-pulse"
                    style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.1)' }}
                  />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div
                className="bg-slate-800 border p-10 flex flex-col items-center justify-center gap-3"
                style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}
              >
                <Users size={36} style={{ color: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)' }} />
                <p className="text-slate-400 text-sm text-center">No crew members yet</p>
                <button
                  onClick={openAdd}
                  className="mt-1 text-xs font-semibold flex items-center gap-1"
                  style={{ color: 'var(--accent)' }}
                >
                  <Plus size={12} /> Add your first member
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map(member => {
                  const isDeleting = deletingId === member.id;
                  return (
                    <div
                      key={member.id}
                      className="bg-slate-800 border flex flex-col transition-all"
                      style={{
                        borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)',
                        opacity: isDeleting ? 0.4 : 1,
                        borderLeft: `3px solid ${member.color}`,
                      }}
                    >
                      <div className="p-4 flex items-center gap-4">
                        <div
                          className="w-11 h-11 flex items-center justify-center text-sm font-bold text-slate-950 flex-shrink-0"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-100 text-base">{member.name}</h3>
                          {member.role
                            ? <p className="text-xs font-medium text-slate-400 mt-0.5">{member.role}</p>
                            : <p className="text-xs text-slate-600 mt-0.5 italic">No role set</p>
                          }
                          <div className="flex items-center gap-3 mt-1.5">
                            {member.email && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Mail size={10} /> {member.email}
                              </span>
                            )}
                            {member.phone && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Phone size={10} /> {member.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex border-t"
                        style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.1)' }}
                      >
                        <button
                          onClick={() => openEdit(member)}
                          disabled={isDeleting}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 transition-colors border-r disabled:opacity-40"
                          style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.1)' }}
                        >
                          <Pencil size={11} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          disabled={isDeleting}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={11} /> Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
          <Link href="/calendar" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <Calendar size={22} />
            <span className="text-[10px] font-medium tracking-wider">TODAY</span>
          </Link>
          <Link href="/manage-contacts" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <User size={22} />
            <span className="text-[10px] font-medium tracking-wider">CLIENTS</span>
          </Link>
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <Plus size={22} />
            <span className="text-[10px] font-medium tracking-wider">DASH</span>
          </Link>
          <Link href="/budget" className="flex flex-col items-center gap-1 text-slate-500 hover:text-[var(--accent)] transition-colors">
            <DollarSign size={22} />
            <span className="text-[10px] font-medium tracking-wider">BUDGET</span>
          </Link>
          <Link
            href="/crew"
            className="flex flex-col items-center gap-1"
            style={{
              color: 'var(--accent)',
              filter: 'drop-shadow(0 0 8px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.6))',
            }}
          >
            <Users size={22} />
            <span className="text-[10px] font-bold tracking-wider">CREW</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}