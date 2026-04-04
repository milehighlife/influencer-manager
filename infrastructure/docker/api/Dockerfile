FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY db/schema.prisma db/schema.prisma

RUN npm ci

COPY . .

RUN npm run db:generate && npm run build --workspace @influencer-manager/api

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/apps/api/package.json apps/api/package.json
COPY --from=builder /app/packages/shared/package.json packages/shared/package.json

RUN npm ci --omit=dev

COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/db/schema.prisma db/schema.prisma
COPY --from=builder /app/db/migrations db/migrations
COPY --from=builder /app/node_modules/.prisma node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma node_modules/@prisma

EXPOSE 3000

CMD ["node", "apps/api/dist/apps/api/src/main.js"]
