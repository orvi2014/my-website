import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function getSubscribers() {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('*')
      .eq('status', 'active');
    if (error) return [];
    return subscribers || [];
  } catch {
    return [];
  }
}
