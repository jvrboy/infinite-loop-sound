# Dockerfile for Hugging Face Spaces (Docker SDK)
# Builds the TanStack Start app with a Node server output and serves it on port 7860.

FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# The repo's vite.config.ts targets the Vercel preset; switch to a plain Node server for Docker.
RUN sed -i 's/preset: *"vercel"/preset: "node-server"/' vite.config.ts

# Ensure a .env file exists so the Docker COPY step never fails on a fresh
# clone without local config. Real secrets are injected at runtime by HF
# Space "Variables" and picked up via --env-file-if-exists below.
RUN touch .env

ENV NODE_ENV=production
RUN NODE_OPTIONS="--max-old-space-size=8192" npx vite build

# ---- Runtime image ----
FROM node:22-slim
WORKDIR /app

# Run as non-root (required-friendly for HF Spaces)
RUN chown -R node:node /app
USER node
ENV HOME=/app

COPY --from=build --chown=node:node /app/.output ./.output
# .env may be empty in the image; real secrets are injected at HF runtime.
COPY --from=build --chown=node:node /app/.env ./.env

ENV PORT=7860 \
    HOST=0.0.0.0 \
    NITRO_PORT=7860 \
    NITRO_HOST=0.0.0.0 \
    NODE_ENV=production

EXPOSE 7860

CMD ["node", "--env-file-if-exists=.env", ".output/server/index.mjs"]
