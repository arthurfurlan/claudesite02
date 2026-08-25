# syntax=docker/dockerfile:1

FROM node:24-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# O servidor tem 957 MB de RAM. Sem teto, o V8 cresce durante o typecheck até
# o OOM killer derrubar o build (exit 137); com teto, ele coleta lixo antes.
ENV NODE_OPTIONS=--max-old-space-size=512
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UPLOAD_DIR=/data/uploads

# O uid precisa bater com o dono dos arquivos montados do host — hoje o arquivo
# de senha, modo 600. Default 1001 para o dev local; produção passa o HOST_UID
# da Cloudez pelo docker-compose.cloudez.yml.
ARG UID=1001
ARG GID=1001
RUN groupadd --system --gid ${GID} nodejs \
 && useradd --system --uid ${UID} --gid nodejs nextjs \
 && mkdir -p /data/uploads \
 && chown -R nextjs:nodejs /data

# O standalone já traz node_modules podado e o server.js pronto.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
