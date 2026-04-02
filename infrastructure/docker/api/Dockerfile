FROM node:20-alpine AS base

WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY db/schema.prisma db/schema.prisma

RUN npm ci

COPY . .

RUN npm run db:generate && npm run build --workspace @influencer-manager/api

EXPOSE 3000

CMD ["node", "apps/api/dist/apps/api/src/main.js"]
