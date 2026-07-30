import type { APIRoute } from 'astro';

// Needs a server: the Buttondown API key must never reach the browser, so this
// route cannot be prerendered like the rest of the site.
export const prerender = false;

const API = 'https://api.buttondown.com/v1/subscribers';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Non-JS form posts want a page back, fetch() wants JSON. */
function wantsHtml(request: Request) {
  return (request.headers.get('accept') || '').includes('text/html');
}

function reply(request: Request, status: number, ok: boolean, message: string, redirectTo?: string) {
  if (wantsHtml(request)) {
    const url = new URL(redirectTo || '/', request.url);
    url.searchParams.set('subscribed', ok ? 'ok' : 'error');
    return new Response(null, { status: 303, headers: { Location: url.toString() } });
  }
  return new Response(JSON.stringify({ ok, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  // import.meta.env can be inlined at build time, so a secret that was absent
  // during the build would bake in as undefined. process.env is read at
  // request time on Vercel, which survives setting the var after a build.
  const key = import.meta.env.BUTTONDOWN_API_KEY || process.env.BUTTONDOWN_API_KEY;
  if (!key) {
    return reply(request, 503, false, 'Newsletter is not configured yet.');
  }

  // Accept both fetch(JSON) and a plain form post.
  let email = '';
  let referrer = '';
  const type = request.headers.get('content-type') || '';
  try {
    if (type.includes('application/json')) {
      const body = await request.json();
      email = String(body.email || body.email_address || '').trim();
    } else {
      const form = await request.formData();
      email = String(form.get('email') || '').trim();
      referrer = String(form.get('referrer') || '');
    }
  } catch {
    return reply(request, 400, false, 'Could not read that request.', referrer);
  }

  if (!EMAIL.test(email)) {
    return reply(request, 400, false, 'That email address does not look right.', referrer);
  }

  // Tags are a paid Buttondown feature: sending them on a free plan fails the
  // whole request with 403 feature_disabled. Opt in once the plan supports it
  // by setting BUTTONDOWN_TAGS to a comma-separated list.
  const tags = (process.env.BUTTONDOWN_TAGS || import.meta.env.BUTTONDOWN_TAGS || '')
    .split(',').map((t: string) => t.trim()).filter(Boolean);

  let res: Response;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: {
        Authorization: `Token ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        ...(tags.length ? { tags } : {}),
      }),
    });
  } catch {
    return reply(request, 502, false, 'Could not reach the newsletter service.', referrer);
  }

  if (res.ok) {
    return reply(request, 200, true, 'Almost there. Check your inbox to confirm.', referrer);
  }

  const detail = await res.text();

  // An address Buttondown already knows is a success from the reader's side.
  // Reporting it as a failure would tell an existing subscriber they failed.
  if (res.status === 400 && /already|exists|subscribed/i.test(detail)) {
    return reply(request, 200, true, 'You are already subscribed.', referrer);
  }

  // Buttondown's spam firewall rejects some addresses outright. Say so plainly
  // rather than inviting a retry that will fail identically.
  if (/subscriber_blocked/i.test(detail)) {
    return reply(request, 400, false, 'That address was rejected. Try another one.', referrer);
  }

  console.error('Buttondown subscribe failed:', res.status, detail.slice(0, 300));
  return reply(request, 502, false, 'That did not go through. Try again in a moment.', referrer);
};
