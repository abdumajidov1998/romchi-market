FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY public ./public
COPY src ./src
COPY tsconfig.json ./
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache python3 make g++ sqlite
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm install --omit=dev
COPY backend/src ./src
COPY --from=frontend /app/build ./build
ENV PORT=3000
EXPOSE 3000
CMD ["node", "src/server.js"]
