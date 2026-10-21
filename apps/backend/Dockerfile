# Build from repository root: docker build -f apps/backend/Dockerfile .
FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY package.json yarn.lock .yarnrc ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/lib/package.json packages/lib/package.json
RUN yarn install --frozen-lockfile --ignore-scripts --non-interactive
COPY packages/config packages/config
COPY packages/lib packages/lib
COPY apps/backend apps/backend
RUN yarn workspace @presqio/lib build && yarn db:generate && yarn workspace @presqio/backend build && mkdir -p apps/backend/node_modules

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=8080
# Keep Prisma CLI available for the migration command, including on Render.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages ./packages
COPY --from=build --chown=node:node /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build --chown=node:node /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=node:node /app/apps/backend/prisma ./apps/backend/prisma
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy --schema apps/backend/prisma/schema.prisma && exec node apps/backend/dist/main.js"]
