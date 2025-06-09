import { getSubscribers } from '../../lib/newsletter';

export async function GET() {
  try {
    const subscribers = await getSubscribers();
    return new Response(JSON.stringify({ count: subscribers.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching subscriber count:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch subscriber count' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 