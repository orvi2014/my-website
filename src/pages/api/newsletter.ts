import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Email is required',
        }),
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid email format',
        }),
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingSubscriber, error: selectError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('email', email)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 means no rows found
      throw selectError;
    }

    if (existingSubscriber) {
      if (existingSubscriber.status === 'unsubscribed') {
        // Reactivate unsubscribed user
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('email', email);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Welcome back!' 
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({ 
          error: 'You are already subscribed!' 
        }),
        { status: 400 }
      );
    }

    // Add new subscriber
    const { error: insertError } = await supabase
      .from('subscribers')
      .insert([
        {
          email,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Successfully subscribed!' 
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to subscribe. Please try again later.',
      }),
      { status: 500 }
    );
  }
}; 