# bienvenue-mtl — single-service production image
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./backend/
RUN npm ci --prefix backend --omit=dev
COPY backend/ ./backend/
COPY package.json ./
EXPOSE 3000
CMD ["npm", "start"]
