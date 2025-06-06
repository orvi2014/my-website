import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
      });
    }

    // Beehiiv API endpoint
    const response = await fetch('https://api.beehiiv.com/v2/publications/pub_123456789/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.BEEHIIV_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: 'website',
        utm_campaign: 'book_launch',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to subscribe');
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(JSON.stringify({ error: 'Failed to subscribe' }), {
      status: 500,
    });
  }
}; 