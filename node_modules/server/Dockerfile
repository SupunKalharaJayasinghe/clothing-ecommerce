FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --only=production
COPY src ./src
COPY .env.example ./.env
EXPOSE 4000
CMD ["node", "src/index.js"]
