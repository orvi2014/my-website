import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getSubscribers() {
  try {
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching subscribers:', error);
      return [];
    }

    return subscribers || [];
  } catch (error) {
    console.error('Error getting subscribers:', error);
    return [];
  }
} 