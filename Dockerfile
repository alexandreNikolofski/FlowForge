# Build Stage
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code and prisma schema
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate

# Build the application
RUN pnpm run build

# Remove development dependencies to keep final image slim
RUN pnpm prune --prod

# Production Stage
FROM node:22-alpine

WORKDIR /usr/src/app

# Install pnpm globally to run migration scripts if needed
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy node_modules and built dist from build stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

# Expose ports for NestJS API (3000) and OTel / metrics if separate
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Command to run migrations and start the server
CMD ["sh", "-c", "pnpm prisma db push && node dist/main"]
