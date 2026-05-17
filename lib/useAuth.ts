'use client';

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseEnabled } from './supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True when Supabase env vars are configured. False = guest-only mode. */
  enabled: boolean;
}

/**
 * React hook for Supabase auth state. Subscribes to onAuthStateChange so the
 * UI updates immediately on sign-in / sign-out.
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    enabled: isSupabaseEnabled(),
  });

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    let mounted = true;

    // Initial session check
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        enabled: true,
      });
    });

    // Live subscription
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        enabled: true,
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
