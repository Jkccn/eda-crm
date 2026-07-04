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

RUN mkdir -p uploads data

EXPOSE 3001
ENV NODE_ENV=production
ENV DATABASE_URL="file:./data/dev.db"
ENV HOSTNAME="0.0.0.0"
ENV PORT=3001

CMD ["sh", "-c", "mkdir -p data uploads && npx prisma migrate deploy && npm start"]
