FROM docker.m.daocloud.io/library/node:20-alpine
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
  && apk add --no-cache python3 make g++ libc6-compat poppler-utils
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm config set registry https://registry.npmmirror.com \
  && npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

RUN mkdir -p uploads data

EXPOSE 3001
ENV NODE_ENV=production
ENV DATABASE_URL="file:./data/dev.db"
ENV HOSTNAME="0.0.0.0"
ENV PORT=3001

CMD ["sh", "-c", "mkdir -p data uploads && node scripts/pre-migrate-backup.mjs && npx prisma migrate deploy && npm start"]
