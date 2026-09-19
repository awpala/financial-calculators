import type { RequestHandler } from '@sveltejs/kit';

/** This public liveness marker contains no application content. */
export const prerender = true;

/** Emit the static liveness marker for previews and deployment checks. */
export const GET: RequestHandler = () =>
  new Response('ok', { headers: { 'content-type': 'text/plain' } });
