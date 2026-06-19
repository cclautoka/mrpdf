# Frontend image (Next.js standalone output).
FROM node:22-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/pdf-core/package.json packages/pdf-core/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile || pnpm install

COPY packages packages
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @mr-pdf/web build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
