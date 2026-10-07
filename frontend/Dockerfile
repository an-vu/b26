FROM node:20-alpine AS development
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
EXPOSE 4200
CMD ["npm", "run", "dev:docker"]

FROM development AS build
RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache curl
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/b26 /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
