/**
 * Runtime configuration endpoint.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, which is brittle on PaaS
 * platforms (e.g. Dokploy) that don't forward env vars as Docker build args.
 * This route reads the backend URL from the environment at *request* time, so
 * the API base can be changed by setting an env var and restarting — no rebuild.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
  return Response.json({ apiUrl: apiUrl.replace(/\/$/, '') });
}
