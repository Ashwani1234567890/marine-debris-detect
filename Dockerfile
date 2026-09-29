# Multi-stage Dockerfile for Google Cloud Run
# Stage 1: Build Frontend Assets
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend assets and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY server.ts ./

# Install tsx globally to run server.ts in lightweight container
RUN npm install -g tsx

EXPOSE 8080
CMD ["tsx", "server.ts"]
