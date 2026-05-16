'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Palette, Pencil, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { loadTheme, saveTheme, applyTheme, DEFAULT_ACCENT, loadDisplayName, saveDisplayName } from '../../lib/theme';

const PRESETS = [
  { label: 'Cyan',   color: '#06b6d4' },
  { label: 'Blue',   color: '#3b82f6' },
  { label: 'Purple', color: '#8b5cf6' },
  { label: 'Pink',   color: '#ec4899' },
  { label: 'Green',  color: '#10b981' },
  { label: 'Orange', color: '#f97316' },
  { label: 'Red',    color: '#ef4444' },
  { label: 'Yellow', color: '#eab308' },
];

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [selected, setSelected] = useState<string>(DEFAULT_ACCENT);
  const [saved, setSaved] = useState<string>(DEFAULT_ACCENT);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Display name state
  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSaveSuccess, setNameSaveSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser(user);

      // Load theme
      const color = await loadTheme(user.id);
      setSelected(color);
      setSaved(color);
      applyTheme(color);

      // Load display name — fall back to user metadata then email
      const savedName = await loadDisplayName(user.id);
      const fallback =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'User';
      const name = savedName || fallback;
      setDisplayName(name);
      setNameInput(name);

      setLoading(false);
    };
    init();
  }, []);

  const handleSelect = (color: string) => {
    setSelected(color);
    applyTheme(color);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await saveTheme(user.id, selected);
    setSaved(selected);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSaveName = async () => {
    if (!user || !nameInput.trim()) return;
    setSavingName(true);
    await saveDisplayName(user.id, nameInput.trim());
    setDisplayName(nameInput.trim());
    setSavingName(false);
    setEditingName(false);
    setNameSaveSuccess(true);
    setTimeout(() => setNameSaveSuccess(false), 2000);
  };

  const handleCancelEdit = () => {
    setNameInput(displayName);
    setEditingName(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return <div className="min-h-screen bg-slate-950" />;

  const hasChanges = selected !== saved;

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-start sm:py-10">
      <div className="w-full max-w-md bg-slate-900 min-h-screen sm:min-h-[850px] sm:border sm:border-[var(--accent)]/40 sm:shadow-[0_0_40px_rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)] relative overflow-hidden flex flex-col">

        {/* Header */}
        <header className="bg-slate-900 px-6 pt-12 pb-6 border-b border-[var(--accent)]/20 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-[var(--accent)] hover:opacity-70 transition-opacity">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Profile</p>
                <h1 className="text-2xl font-bold text-slate-100">{displayName}</h1>
              </div>
            </div>
            <div
              className="h-12 w-12 rounded-full bg-slate-950 flex items-center justify-center border shadow-lg transition-all duration-300"
              style={{ borderColor: `var(--accent)`, boxShadow: `0 0 15px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)` }}
            >
              <Palette size={22} style={{ color: 'var(--accent)' }} />
            </div>
          </div>
        </header>

        <main className="px-6 flex-1">

          {/* Account info */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 tracking-wide">Account</h2>
            <div className="bg-slate-800 border border-[var(--accent)]/20 p-5 space-y-3">

              {/* Email row */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Email</span>
                <span className="text-sm text-slate-200">{user.email}</span>
              </div>

              <div className="border-t border-slate-700" />

              {/* Name row */}
              <div className="flex justify-between items-center gap-3">
                <span className="text-sm text-slate-400 shrink-0">Display Name</span>
                {editingName ? (
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      autoFocus
                      className="bg-slate-900 text-slate-100 text-sm px-3 py-1.5 outline-none border-b-2 w-36 transition-colors"
                      style={{ borderColor: 'var(--accent)' }}
                      maxLength={30}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName || !nameInput.trim()}
                      className="p-1.5 rounded-full transition-opacity hover:opacity-70 disabled:opacity-40"
                      style={{ color: 'var(--accent)' }}
                      title="Save name"
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1.5 rounded-full text-slate-500 hover:text-slate-300 transition-colors"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {nameSaveSuccess && (
                      <span className="text-xs text-emerald-400 font-semibold">Saved!</span>
                    )}
                    <span className="text-sm text-slate-200">{displayName}</span>
                    <button
                      onClick={() => setEditingName(true)}
                      className="p-1.5 rounded-full text-slate-500 hover:opacity-70 transition-opacity"
                      style={{ color: 'var(--accent)' }}
                      title="Edit name"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* Color theme picker */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-200 mb-1 tracking-wide">Accent Color</h2>
            <p className="text-xs text-slate-400 mb-4">Changes apply live across the whole app.</p>

            {/* Preset swatches */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {PRESETS.map(({ label, color }) => (
                <button
                  key={color}
                  onClick={() => handleSelect(color)}
                  className="flex flex-col items-center gap-2 group"
                  title={label}
                >
                  <div
                    className="w-full h-12 border-2 transition-all duration-200 flex items-center justify-center"
                    style={{
                      backgroundColor: color,
                      borderColor: selected === color ? '#fff' : 'transparent',
                      boxShadow: selected === color ? `0 0 12px ${color}` : 'none',
                    }}
                  >
                    {selected === color && <Check size={16} className="text-slate-900 font-bold" strokeWidth={3} />}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide">{label}</span>
                </button>
              ))}
            </div>

            {/* Custom hex input */}
            <div className="flex items-center gap-3 bg-slate-800 border border-[var(--accent)]/20 p-4">
              <div
                className="w-8 h-8 flex-shrink-0 border border-slate-600"
                style={{ backgroundColor: selected }}
              />
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">Custom hex color</p>
                <input
                  type="text"
                  value={selected}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                      setSelected(val);
                      if (val.length === 7) handleSelect(val);
                    }
                  }}
                  className="w-full bg-transparent text-slate-200 text-sm font-mono outline-none border-b border-slate-600 focus:border-[var(--accent)] pb-1 transition-colors"
                  placeholder="#000000"
                  maxLength={7}
                />
              </div>
              <input
                type="color"
                value={selected}
                onChange={(e) => handleSelect(e.target.value)}
                className="w-8 h-8 cursor-pointer bg-transparent border-0 p-0"
                title="Pick a color"
              />
            </div>
          </section>

          {/* Preview strip */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 tracking-wide">Preview</h2>
            <div
              className="bg-slate-800 p-5 border flex gap-4 items-center"
              style={{ borderColor: `rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.25)` }}
            >
              <div
                className="flex flex-col items-center justify-center px-3 py-2 min-w-[60px] bg-slate-950 border"
                style={{ borderColor: `rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)` }}
              >
                <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>9:00</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--accent)', opacity: 0.6 }}>AM</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-100">Sample Task</p>
                <p className="text-slate-400 text-sm mb-2">123 Example Street</p>
                <span
                  className="text-xs font-bold px-2 py-1 inline-flex items-center gap-1"
                  style={{
                    backgroundColor: `rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.9)`,
                    color: '#0a0a0a',
                  }}
                >
                  In Progress
                </span>
              </div>
            </div>
          </section>

          {/* Save color button */}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="w-full p-4 font-bold text-slate-950 transition-all duration-200 mb-6 flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: saveSuccess ? '#10b981' : 'var(--accent)',
              boxShadow: `0 0 20px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)`,
            }}
          >
            {saveSuccess ? (
              <><Check size={18} strokeWidth={3} /> Saved!</>
            ) : saving ? (
              'Saving...'
            ) : (
              'Save Color'
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full p-4 font-semibold text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-300 transition-colors mb-6"
          >
            Log Out
          </button>

        </main>
      </div>
    </div>
  );
}