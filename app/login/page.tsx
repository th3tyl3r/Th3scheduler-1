'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) setError(authError.message);
        else setError('Check your email for the confirmation link!');
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) setError(authError.message);
        else if (data.user) window.location.href = '/dashboard';
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4 gap-8">

      {/* Title banner — matches home page style */}
      <div className="rounded-xl border-2 border-cyan-400 px-16 py-4 text-4xl font-extrabold tracking-wide text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5),inset_0_0_15px_rgba(34,211,238,0.5)] [text-shadow:0_0_10px_#22d3ee,0_0_20px_#06b6d4]">
        Th3 Scheduler
      </div>

      {/* Login card */}
      <div className="w-full max-w-[440px] rounded-3xl border border-cyan-500/40 bg-slate-950 p-8 shadow-[0_0_60px_rgba(6,182,212,0.12)]">

        {/* Back link */}
        <Link href="/" className="mb-6 inline-block text-sm text-cyan-400 hover:text-cyan-300 transition">
          ← Back
        </Link>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-white mb-1">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          {isSignUp ? 'Join Th3 Scheduler' : 'Access your scheduler'}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-medium text-slate-400 uppercase tracking-widest">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-600 transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-xs font-medium text-slate-400 uppercase tracking-widest">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-600 transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-700/60 bg-red-950/60 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-bold text-black transition duration-200 hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center text-base shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_30px_rgba(6,182,212,0.55)]"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2" />
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-cyan-400 hover:text-cyan-300 font-medium transition"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </main>
  );
}