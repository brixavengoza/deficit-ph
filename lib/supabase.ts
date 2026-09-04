import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '@/lib/database.types';

/**
 * The ONLY module allowed to import `@supabase/supabase-js` (CLAUDE.md rule 2).
 *
 * Two deliberate choices:
 *
 * 1. LAZY. `createClient` starts a token-refresh timer and touches storage, so it is
 *    built on first use rather than at import time. Nothing on the cold-start path
 *    should reach the network.
 * 2. SESSION TOKENS LIVE IN THE KEYCHAIN, not AsyncStorage. This app stores health
 *    data, so a plaintext refresh token on disk is not acceptable. expo-secure-store
 *    caps a value at 2048 bytes and a Supabase session is routinely larger, so the
 *    adapter below transparently splits it across numbered chunks.
 */

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_PROJECT_URL;

const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** True when the app has been given credentials. Screens can check this before rendering. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function assertConfigured(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then restart Metro with `npx expo start -c` ' +
        '(env vars are inlined at build time, so a plain reload will not pick them up).'
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}

/**
 * Keychain-backed storage that survives values larger than SecureStore's 2048-byte cap.
 *
 * Layout: `<key>` holds the chunk count as a string; `<key>.0`, `<key>.1`, ... hold the
 * slices. Writing always clears the previous chunks first, so shrinking a value can
 * never leave a stale tail behind that would corrupt the next read.
 */
const CHUNK_SIZE = 1800; // headroom under the 2048-byte limit for multi-byte characters

function createSecureStorage() {
  // expo-secure-store has no web implementation; the browser gets localStorage.
  if (Platform.OS === 'web') {
    return {
      getItem: async (key: string) => {
        try {
          return globalThis.localStorage?.getItem(key) ?? null;
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          globalThis.localStorage?.setItem(key, value);
        } catch {
          /* private mode: session simply will not persist */
        }
      },
      removeItem: async (key: string) => {
        try {
          globalThis.localStorage?.removeItem(key);
        } catch {
          /* ignore */
        }
      },
    };
  }

  // Required lazily so the native module is never touched on web.
  const SecureStore = require('expo-secure-store') as typeof import('expo-secure-store');

  const clearChunks = async (key: string, count: number) => {
    for (let index = 0; index < count; index += 1) {
      await SecureStore.deleteItemAsync(`${key}.${index}`);
    }
  };

  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const header = await SecureStore.getItemAsync(key);
        if (header == null) return null;

        const count = Number(header);
        if (!Number.isInteger(count) || count < 1) {
          // Written by an older build before chunking existed: the value is inline.
          return header;
        }

        const parts: string[] = [];
        for (let index = 0; index < count; index += 1) {
          const part = await SecureStore.getItemAsync(`${key}.${index}`);
          // A missing chunk means a torn write. Treat the whole session as absent so the
          // user is asked to sign in again rather than handed a corrupt token.
          if (part == null) return null;
          parts.push(part);
        }
        return parts.join('');
      } catch (error) {
        console.warn('[supabase.storage.getItem]', error);
        return null;
      }
    },

    setItem: async (key: string, value: string): Promise<void> => {
      try {
        const previous = await SecureStore.getItemAsync(key);
        const previousCount = Number(previous);
        if (Number.isInteger(previousCount) && previousCount > 0) {
          await clearChunks(key, previousCount);
        }

        const chunks: string[] = [];
        for (let index = 0; index < value.length; index += CHUNK_SIZE) {
          chunks.push(value.slice(index, index + CHUNK_SIZE));
        }

        for (let index = 0; index < chunks.length; index += 1) {
          await SecureStore.setItemAsync(`${key}.${index}`, chunks[index]!);
        }
        await SecureStore.setItemAsync(key, String(chunks.length));
      } catch (error) {
        console.warn('[supabase.storage.setItem]', error);
      }
    },

    removeItem: async (key: string): Promise<void> => {
      try {
        const header = await SecureStore.getItemAsync(key);
        const count = Number(header);
        if (Number.isInteger(count) && count > 0) {
          await clearChunks(key, count);
        }
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.warn('[supabase.storage.removeItem]', error);
      }
    },
  };
}

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;

  const { url, key } = assertConfigured();
  // Required here rather than at module scope so importing this file stays free.
  const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');

  client = createClient<Database>(url, key, {
    auth: {
      storage: createSecureStorage(),
      autoRefreshToken: true,
      persistSession: true,
      // React Native has no URL bar; OAuth callbacks are handled explicitly by the
      // auth screens, so the web-only URL scan must be off or it throws on native.
      detectSessionInUrl: false,
      // PKCE is the correct flow for a mobile app and is what makes
      // exchangeCodeForSession work after the OAuth browser hands back a code.
      flowType: 'pkce',
    },
  });

  return client;
}
