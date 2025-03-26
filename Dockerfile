####################
# Build stage
####################
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ build-base

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm ci
COPY . .

RUN npm run build

####################
# Production stage
####################
FROM node:20-alpine

RUN apk add --no-cache openssl sqlite

WORKDIR /usr/src/app

RUN mkdir -p uploads \
    && mkdir -p data \
    && mkdir -p public \
    && mkdir -p views/partials

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/views ./views
COPY --from=builder /usr/src/app/public ./public

VOLUME ["/usr/src/app/data"]

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/usr/src/app/data/db.sqlite

EXPOSE 3000

CMD npx typeorm migration:run -d dist/typeorm.config.js && node dist/src/main.js
