# ---- CourseHub Frontend (Next.js) ----
# Build context must be the coursehub/ folder
# Example: docker build -t coursehub-frontend .   (run from inside coursehub/)

# Node version pinned to v24.14.0 as requested
ARG NODE_VERSION=24.14

# ---- deps: install dependencies ----
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: build the Next.js app ----
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner: minimal production image ----
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/.env ./.env

EXPOSE 3000

CMD ["npm", "start"]
