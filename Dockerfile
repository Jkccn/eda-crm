FROM node:20-alpine
RUN apk add --no-cache python3 make g++ libc6-compat
# LibreOffice + 中文字体：用于 Office 文件在线预览（转 PDF）
RUN apk add --no-cache libreoffice font-noto-cjk ttf-dejavu
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

RUN mkdir -p uploads prisma

EXPOSE 3000
ENV NODE_ENV=production
ENV DATABASE_URL="file:./prisma/dev.db"
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts 2>/dev/null || true && npm start"]
