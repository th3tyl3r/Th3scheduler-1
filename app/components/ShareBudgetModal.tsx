'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Check, Clock, XCircle, Trash2, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Partner {
  id: string;
  owner_id: string;
  owner_email: string;
  partner_id: string | null;
  partner_email: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

interface Props {
  userId: string;
  userEmail: string;
  onClose: () => void;
}

export default function ShareBudgetModal({ userId, userEmail, onClose }: Props) {
  const [tab,          setTab]          = useState<'partners' | 'invites'>('partners');
  const [partners,     setPartners]     = useState<Partner[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<Partner[]>([]);
  const [email,        setEmail]        = useState('');
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  const iStyle = { borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.3)' };
  const iClass = "w-full bg-slate-800 border text-slate-100 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] placeholder-slate-500";

  useEffect(() => {
    fetchAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: sent }, { data: received }] = await Promise.all([
      // Invites I sent
      supabase.from('budget_partners')
        .select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      // Invites sent TO me (matched by email)
      supabase.from('budget_partners')
        .select('*').eq('partner_email', userEmail).order('created_at', { ascending: false }),
    ]);
    setPartners((sent ?? []) as Partner[]);
    setIncomingInvites((received ?? []) as Partner[]);
    setLoading(false);
  };

  const handleInvite = async () => {
    setError(''); setSuccess('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Enter an email address'); return; }
    if (trimmed === userEmail.toLowerCase()) { setError("That's your own email"); return; }
    if (partners.some(p => p.partner_email.toLowerCase() === trimmed)) {
      setError('Already invited this person'); return;
    }
    setSending(true);

    // Look up if this email belongs to a registered user
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', trimmed)
      .maybeSingle();

    const { error: insertErr } = await supabase.from('budget_partners').insert({
      owner_id:      userId,
      owner_email:   userEmail,
      partner_id:    profileData?.id ?? null,
      partner_email: trimmed,
      status:        'pending',
    });

    setSending(false);
    if (insertErr) { setError(insertErr.message); return; }
    setSuccess(`Invite sent to ${trimmed}`);
    setEmail('');
    fetchAll();
  };

  const handleRespond = async (invite: Partner, accept: boolean) => {
    const { error } = await supabase.from('budget_partners')
      .update({
        status:     accept ? 'accepted' : 'declined',
        partner_id: accept ? userId : null,
      })
      .eq('id', invite.id);
    if (error) { setError(error.message); return; }
    fetchAll();
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm('Remove this budget partner? They will no longer see your entries.')) return;
    await supabase.from('budget_partners').delete().eq('id', id);
    fetchAll();
  };

  const StatusBadge = ({ status }: { status: Partner['status'] }) => {
    const map = {
      pending:  { icon: <Clock size={10} />,   color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-500/30', label: 'Pending' },
      accepted: { icon: <Check size={10} />,   color: 'text-green-400',  bg: 'bg-green-950/40 border-green-500/30',  label: 'Active' },
      declined: { icon: <XCircle size={10} />, color: 'text-red-400',    bg: 'bg-red-950/40 border-red-500/30',      label: 'Declined' },
    };
    const s = map[status];
    return (
      <span className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${s.color} ${s.bg}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  const pendingInvites = incomingInvites.filter(i => i.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: 'rgba(2,6,23,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-slate-900 border overflow-hidden"
        style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
          <div className="flex items-center gap-2">
            <Users size={18} style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-bold text-slate-100">Shared Budget</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.2)' }}>
          {(['partners', 'invites'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors relative"
              style={{ color: tab === t ? 'var(--accent)' : 'rgb(100,116,139)' }}>
              {t === 'invites' && pendingInvites.length > 0 && (
                <span className="absolute top-1.5 right-6 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-slate-950"
                  style={{ backgroundColor: 'var(--accent)' }}>
                  {pendingInvites.length}
                </span>
              )}
              {t === 'partners' ? 'My Partners' : 'Invites'}
              {tab === t && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto space-y-5">

          {tab === 'partners' && (
            <>
              {/* Invite form */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  Invite a Partner
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email" placeholder="partner@email.com"
                      value={email} onChange={e => { setEmail(e.target.value); setError(''); setSuccess(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleInvite()}
                      className={`${iClass} pl-8`} style={iStyle} />
                  </div>
                  <button onClick={handleInvite} disabled={sending}
                    className="px-4 py-2.5 text-sm font-bold text-slate-950 flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
                    style={{ backgroundColor: 'var(--accent)' }}>
                    <UserPlus size={14} />
                    {sending ? '…' : 'Invite'}
                  </button>
                </div>
                {error   && <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
                {success && <p className="text-green-400 text-xs mt-2 flex items-center gap-1"><Check size={11} />{success}</p>}
              </div>

              {/* How it works */}
              <div className="p-3 border text-xs text-slate-400 leading-relaxed space-y-1"
                style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)', backgroundColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.04)' }}>
                <p className="font-semibold text-slate-300">How shared budgets work</p>
                <p>Once your partner accepts, you'll both see and edit the same budget entries. Any entry either of you creates appears for both.</p>
                <p>You can remove a partner at any time — they'll lose access immediately.</p>
              </div>

              {/* Partner list */}
              {loading ? (
                <p className="text-slate-500 text-sm text-center py-4">Loading…</p>
              ) : partners.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">No partners yet — invite someone above.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sent Invites</p>
                  {partners.map(p => (
                    <div key={p.id} className="bg-slate-800 border flex items-center gap-3 px-3 py-3"
                      style={{ borderColor: 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-950"
                        style={{ backgroundColor: 'var(--accent)' }}>
                        {p.partner_email[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{p.partner_email}</p>
                        <p className="text-[10px] text-slate-500">
                          Invited {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                      <button onClick={() => handleRemove(p.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors ml-1 flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'invites' && (
            <>
              {loading ? (
                <p className="text-slate-500 text-sm text-center py-4">Loading…</p>
              ) : incomingInvites.length === 0 ? (
                <div className="text-center py-10">
                  <Mail size={28} className="mx-auto mb-3 text-slate-700" />
                  <p className="text-slate-500 text-sm">No incoming invites</p>
                  <p className="text-slate-600 text-xs mt-1">Ask your partner to invite you from their budget page.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {incomingInvites.map(inv => (
                    <div key={inv.id} className="bg-slate-800 border px-3 py-3"
                      style={{
                        borderColor: inv.status === 'pending'
                          ? 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)'
                          : 'rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.15)',
                      }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-950"
                          style={{ backgroundColor: 'var(--accent)' }}>
                          {inv.owner_email[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate">
                            Invite from <span style={{ color: 'var(--accent)' }}>{inv.owner_email}</span>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <StatusBadge status={inv.status} />
                      </div>
                      {inv.status === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleRespond(inv, false)}
                            className="flex-1 py-2 text-xs font-bold border text-red-400 bg-red-950/30 border-red-500/30 hover:bg-red-950/50 transition-colors">
                            Decline
                          </button>
                          <button onClick={() => handleRespond(inv, true)}
                            className="flex-1 py-2 text-xs font-bold text-slate-950"
                            style={{ backgroundColor: 'var(--accent)' }}>
                            Accept
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}