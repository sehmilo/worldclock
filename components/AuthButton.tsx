'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

interface Props {
  user: User | null;
  loading: boolean;
}

export default function AuthButton({ user, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'magic' | 'password' | 'signup'>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'err'; msg?: string }>({ kind: 'idle' });
  const [menuOpen, setMenuOpen] = useState(false);

  async function signInGoogle() {
    const sb = getSupabase();
    if (!sb) return;
    setStatus({ kind: 'busy' });
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
    if (error) setStatus({ kind: 'err', msg: error.message });
  }

  async function signInMagic(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !email) return;
    setStatus({ kind: 'busy' });
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
    if (error) setStatus({ kind: 'err', msg: error.message });
    else setStatus({ kind: 'ok', msg: 'Check your email for a sign-in link.' });
  }

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !email || !password) return;
    setStatus({ kind: 'busy' });
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setStatus({ kind: 'err', msg: error.message });
    else { setStatus({ kind: 'idle' }); setOpen(false); }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !email || !password) return;
    setStatus({ kind: 'busy' });
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
    if (error) setStatus({ kind: 'err', msg: error.message });
    else setStatus({ kind: 'ok', msg: 'Account created. Check your email to verify.' });
  }

  async function signOut() {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    setMenuOpen(false);
  }

  // ---- Signed-in chip ----
  if (user) {
    const initial = (user.email ?? '?').charAt(0).toUpperCase();
    return (
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          title={user.email ?? 'Account'}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(22, 27, 34, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(48, 54, 61, 0.6)',
            borderRadius: 10,
            padding: '6px 10px 6px 6px',
            color: '#e6edf3',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: '50%',
            background: '#22c55e', color: '#0a0e1a', fontWeight: 700,
          }}>{initial}</span>
          <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email ?? 'Signed in'}
          </span>
        </button>
        {menuOpen && (
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              background: '#161b22ee', backdropFilter: 'blur(12px)',
              border: '1px solid #30363d', borderRadius: 10,
              padding: 6, minWidth: 180, zIndex: 1000,
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ padding: '6px 10px', fontSize: 11, color: '#6b7280' }}>
              Synced across devices
            </div>
            <button
              onClick={signOut}
              style={{
                width: '100%', textAlign: 'left',
                background: 'transparent', border: 'none', borderRadius: 6,
                color: '#f85149', padding: '8px 10px', fontSize: 13, cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1f2937'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---- Signed-out: sign in button ----
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(true); setStatus({ kind: 'idle' }); }}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(22, 27, 34, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(48, 54, 61, 0.6)',
          borderRadius: 10,
          padding: '8px 14px',
          color: '#e6edf3',
          fontSize: 12,
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          opacity: loading ? 0.6 : 1,
        }}
      >
        Sign in to sync
      </button>

      {open && (
        <>
          {/* Click-outside backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)', zIndex: 999,
            }}
          />
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: 320,
              background: '#161b22ee', backdropFilter: 'blur(12px)',
              border: '1px solid #30363d', borderRadius: 12,
              padding: 14, zIndex: 1000,
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>
              Sign in to soluXYZon
            </div>
            <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 12 }}>
              Your cities will sync across every device.
            </div>

            <button
              onClick={signInGoogle}
              style={{
                width: '100%',
                background: '#ffffff', color: '#0a0e1a',
                border: 'none', borderRadius: 6,
                padding: '8px 12px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', marginBottom: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span>🅖</span> Continue with Google
            </button>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {(['magic', 'password', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setStatus({ kind: 'idle' }); }}
                  style={{
                    flex: 1,
                    background: mode === m ? '#22c55e' : 'transparent',
                    color: mode === m ? '#0a0e1a' : '#8b949e',
                    border: `1px solid ${mode === m ? '#22c55e' : '#30363d'}`,
                    borderRadius: 6,
                    padding: '5px 6px', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {m === 'magic' ? 'Magic link' : m === 'password' ? 'Password' : 'Sign up'}
                </button>
              ))}
            </div>

            <form
              onSubmit={mode === 'magic' ? signInMagic : mode === 'password' ? signInPassword : signUp}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  background: '#0d1117', border: '1px solid #30363d', borderRadius: 6,
                  padding: '8px 10px', color: '#e6edf3', fontSize: 13, outline: 'none',
                }}
              />
              {(mode === 'password' || mode === 'signup') && (
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    background: '#0d1117', border: '1px solid #30363d', borderRadius: 6,
                    padding: '8px 10px', color: '#e6edf3', fontSize: 13, outline: 'none',
                  }}
                />
              )}
              <button
                type="submit"
                disabled={status.kind === 'busy'}
                style={{
                  background: '#22c55e', border: 'none', borderRadius: 6,
                  color: '#0a0e1a', padding: '8px 12px', fontSize: 13, fontWeight: 600,
                  cursor: status.kind === 'busy' ? 'wait' : 'pointer',
                  opacity: status.kind === 'busy' ? 0.6 : 1,
                  marginTop: 2,
                }}
              >
                {status.kind === 'busy' ? 'Working…' :
                 mode === 'magic' ? 'Send magic link' :
                 mode === 'password' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            {status.kind === 'ok' && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#22c55e' }}>{status.msg}</div>
            )}
            {status.kind === 'err' && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#f85149' }}>{status.msg}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
