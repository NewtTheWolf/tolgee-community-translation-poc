# Build context must be the repo root.
#   docker build -f apps/frontend/Dockerfile -t ct-frontend:<tag> .
# PUBLIC_API_URL is inlined at BUILD time by SvelteKit; "/api" keeps the API
# same-origin behind the Traefik ingress (cookies work without CORS).
FROM oven/bun:1.3-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/tolgee-client/package.json packages/tolgee-client/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN bun install --frozen-lockfile
COPY packages packages
COPY apps/frontend apps/frontend
ENV PUBLIC_API_URL=/api
RUN cd apps/frontend && bun run build

# adapter-node emits a self-contained server in build/.
FROM oven/bun:1.3-alpine AS run
WORKDIR /app
COPY --from=build /app/apps/frontend/build ./build
ENV NODE_ENV=production
ENV PORT=3000
# adapter-node CSRF origin check for the public URL.
ENV ORIGIN=https://translations.tabularis.dev
EXPOSE 3000
CMD ["bun", "build/index.js"]
