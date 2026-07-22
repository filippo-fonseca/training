import Constants from 'expo-constants';

declare const process: {
  env: Record<string, string | undefined>;
};

const DEFAULT_API_BASE_URL = 'https://training-filippo-fonsecas-projects.vercel.app';
const DUMMY_SUPABASE_URL = 'https://example.supabase.co';
const DUMMY_SUPABASE_ANON_KEY = 'public-anon-key';

function clean(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']|["']$/g, '');
}

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export const env = {
  supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL) || DUMMY_SUPABASE_URL,
  supabaseAnonKey:
    clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) || DUMMY_SUPABASE_ANON_KEY,
  apiBaseUrl: withoutTrailingSlash(
    clean(process.env.EXPO_PUBLIC_API_BASE_URL) || DEFAULT_API_BASE_URL,
  ),
  ownerEmail: clean(process.env.EXPO_PUBLIC_OWNER_EMAIL).toLowerCase(),
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
};

export const isSupabaseConfigured =
  env.supabaseUrl !== DUMMY_SUPABASE_URL &&
  env.supabaseAnonKey !== DUMMY_SUPABASE_ANON_KEY;
