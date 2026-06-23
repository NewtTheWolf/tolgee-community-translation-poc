# Build context must be the repo root (workspace deps live in packages/).
#   docker build -f apps/api/Dockerfile -t ct-api:<tag> .
FROM oven/bun:1.3-alpine
WORKDIR /app

# Install all workspace deps from the root lockfile. All workspace member
# manifests must be present or --frozen-lockfile rejects the changed graph.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/tolgee-client/package.json packages/tolgee-client/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN bun install --frozen-lockfile

# App source.
COPY packages packages
COPY apps/api apps/api

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3000
# index.ts reads env at startup and calls connectDB; migrations run via a separate Job.
CMD ["bun", "src/index.ts"]
