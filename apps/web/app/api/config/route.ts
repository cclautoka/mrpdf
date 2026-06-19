/**
 * Runtime configuration endpoint.
 *
 * IMPORTANT: this intentionally reads `API_URL` (and `BACKEND_URL`), NOT
 * `NEXT_PUBLIC_API_URL`. Next.js statically inlines every `process.env.NEXT_PUBLIC_*`
 * reference at build time — even inside server route handlers — so a public var
 * would freeze to its build-time value and never reflect the runtime env. Plain
 * (non-public) vars are read from the live process env at request time, which
 * lets the backend URL be changed by setting an env var and redeploying — no
 * code rebuild required.
 */
export const dynamic = 'force-dynamic';

/**
 * Read an env var by a dynamically-built key so the Next.js build cannot
 * statically inline it. This lets us read the *runtime* value of
 * `NEXT_PUBLIC_API_URL` (which platforms like Dokploy inject into the
 * container) even though a literal `process.env.NEXT_PUBLIC_API_URL`
 * reference would be frozen at build time.
 */
function readRuntimeEnv(name: string): string | undefined {
  return process.env[name];
}

export function GET() {
  const apiUrl =
    process.env.API_URL ||
    process.env.BACKEND_URL ||
    readRuntimeEnv(['NEXT', 'PUBLIC', 'API', 'URL'].join('_')) ||
    '';
  return Response.json({ apiUrl: apiUrl.replace(/\/$/, '') });
}
