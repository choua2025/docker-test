FROM node:24-alpine

WORKDIR /app

# Install dependencies first so this layer is cached when only source changes
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=6000
EXPOSE 6000

CMD ["node", "index.js"]
