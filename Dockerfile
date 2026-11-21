# Aplicația web (Lotul 6a, D36): Next.js pe Node 24, versiunea din .node-version.
# Se construiește și pornește din docker-compose.yml (serviciul `web`): npm run app:up
FROM node:24.22.1-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx next build

FROM node:24.22.1-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
# migrațiile se aplică la pornire (idempotent), apoi serverul
CMD ["sh", "-c", "node scripts/db-migrate.ts && npx next start -H 0.0.0.0 -p 3000"]
