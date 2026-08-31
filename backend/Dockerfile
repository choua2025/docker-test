FROM node:24-alpine

WORKDIR /app

# Install dependencies first so this layer is cached when only source changes.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV PORT=9000
EXPOSE 9000

# Do not run as root.
USER node

CMD ["node", "src/server.js"]
