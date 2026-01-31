import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wgzrtagwaxufivadksll.supabase.co';
const supabaseAnonKey = 'sb_publishable_xnAYYQfrtuxIagcmAVzZ3Q_ia-C8alQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: { 'apikey': supabaseAnonKey },
  },
});
