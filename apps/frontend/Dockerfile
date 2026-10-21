# Build from repository root: docker build -f apps/frontend/Dockerfile .
FROM node:24-bookworm-slim AS build
WORKDIR /app
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
COPY apps/frontend apps/frontend
RUN yarn workspace @presqio/lib build && yarn workspace @presqio/frontend build
RUN rm -f apps/frontend/dist/_worker.js apps/frontend/dist/_routes.json apps/frontend/dist/_headers

FROM nginx:stable-alpine
ENV BACKEND_ORIGIN=http://backend:8080
COPY apps/frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
