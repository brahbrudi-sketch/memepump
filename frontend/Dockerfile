FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
# 1. Kopiere den Build-Output (hast du schon)
COPY --from=builder /app/dist /usr/share/nginx/html

# 2. Kopiere die custom Nginx Config (NEU) 
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]