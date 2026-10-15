# Local development image for docker-compose.local.yml (./setup.sh).
# Production frontend builds run on Vercel from source.
FROM node:22-alpine AS development
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
EXPOSE 4200
CMD ["npm", "run", "dev:docker"]
