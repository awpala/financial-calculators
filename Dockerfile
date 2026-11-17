# syntax=docker/dockerfile:1
# Public static site. The build owns Chromium; the serving image only has Nginx.
FROM node:26-trixie-slim AS builder
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
