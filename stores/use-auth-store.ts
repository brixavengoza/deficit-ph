import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Who is signed in, for the whole app.
 *
 * `status` drives the route guard:
 *   loading    - still restoring the session from the keychain; render nothing
 *   signed-in  - normal app
 *   signed-out - send to /auth/login
 *   unconfigured - no Supabase credentials in this build; show a setup message
 *                  rather than a login screen that could never work
 */
export type AuthStatus = 'loading' | 'signed-in' | 'signed-out' | 'unconfigured';

type AuthState = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  /** Set while a recovery deep link is being handled, so the guard allows /auth/reset-password. */
  isRecovering: boolean;
  initialize: () => Promise<void>;
  applySession: (session: Session | null) => void;
  setRecovering: (value: boolean) => void;
  signOut: () => Promise<void>;
};

let unsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  session: null,
  user: null,
  isRecovering: false,

  initialize: async () => {
    if (!isSupabaseConfigured()) {
      set({ status: 'unconfigured', session: null, user: null });
      return;
    }
    // Already wired up; a second call would stack duplicate listeners.
    if (unsubscribe) return;

    try {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      get().applySession(data.session ?? null);

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        // PASSWORD_RECOVERY means the user arrived from a reset email. They ARE
        // technically signed in at this point, but must land on the new-password
        // screen rather than the dashboard.
        if (event === 'PASSWORD_RECOVERY') {
          set({ isRecovering: true });
        }
        get().applySession(session);
      });

      unsubscribe = () => listener.subscription.unsubscribe();
    } catch (error) {
      console.error('[useAuthStore.initialize]', error);
      // Fail to the login screen rather than trapping the user on a blank splash.
      set({ status: 'signed-out', session: null, user: null });
    }
  },

  applySession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      status: session ? 'signed-in' : 'signed-out',
    });
  },

  setRecovering: (value) => set({ isRecovering: value }),

  signOut: async () => {
    try {
      if (isSupabaseConfigured()) {
        await getSupabase().auth.signOut();
      }
    } catch (error) {
      // Even if the network call fails, drop the local session: the user asked to leave.
      console.warn('[useAuthStore.signOut]', error);
    } finally {
      set({ session: null, user: null, status: 'signed-out', isRecovering: false });
    }
  },
}));
