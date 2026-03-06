# Stage 1: Install all dependencies (for building)
FROM docker.io/oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN bun install --frozen-lockfile

# Stage 2: Build client (SvelteKit static)
FROM deps AS build
COPY . .
RUN bun run --filter client build

# Stage 3: Production dependencies only
FROM docker.io/oven/bun:1 AS proddeps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN bun install --frozen-lockfile --production

# Stage 4: Runtime
FROM docker.io/oven/bun:1-slim AS runtime
WORKDIR /app
COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=proddeps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=proddeps /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/shared/src ./packages/shared/src
COPY --from=build /app/packages/shared/tsconfig.json ./packages/shared/
COPY --from=build /app/packages/server/package.json ./packages/server/
COPY --from=build /app/packages/server/src ./packages/server/src
COPY --from=build /app/packages/server/tsconfig.json ./packages/server/
COPY --from=build /app/packages/client/build ./packages/client/build
COPY --from=build /app/package.json ./
EXPOSE 3000
ENV NODE_ENV=production
WORKDIR /app/packages/server
CMD ["bun", "run", "src/index.ts"]
