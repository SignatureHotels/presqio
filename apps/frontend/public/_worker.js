/** Cloudflare Pages advanced-mode Worker. API stays on the browser's origin so refresh
 * cookies work even when the backend uses an onrender.com address. */
export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    if (!incoming.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    let backend;
    try {
      backend = new URL(env.BACKEND_ORIGIN);
      if (backend.protocol !== 'https:' || backend.username || backend.password ||
          backend.pathname !== '/' || backend.search || backend.hash || backend.origin === incoming.origin) {
        throw new Error('Invalid backend origin');
      }
    } catch {
      return Response.json({ message: 'API proxy is not configured. Set BACKEND_ORIGIN.' }, { status: 503 });
    }
    const target = new URL(incoming.pathname + incoming.search, backend);
    const headers = new Headers(request.headers);
    headers.delete('host');
    // Render trusts one proxy hop. Do not forward a caller-supplied address.
    headers.set('x-forwarded-for', request.headers.get('cf-connecting-ip') || '');
    try {
      const upstream = await fetch(target, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
      });
      const response = new Response(upstream.body, upstream);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } catch {
      return Response.json({ message: 'API is temporarily unavailable. Please try again.' }, { status: 502 });
    }
  },
};
