# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

FROM deps AS builder

ARG VITE_ENABLE_LOGGING=false
ENV VITE_ENABLE_LOGGING=$VITE_ENABLE_LOGGING

COPY . .
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/node_modules/.vite \
    npm run build

FROM nginx:stable-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY runtime-config.template.js /etc/cogcs/runtime-config.template.js
COPY docker-entrypoint.sh /docker-entrypoint.d/40-render-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-render-runtime-config.sh

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1/health"]

CMD ["nginx", "-g", "daemon off;"]
