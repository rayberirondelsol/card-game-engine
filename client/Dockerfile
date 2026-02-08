# Frontend Dockerfile - Vite build + nginx
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY index.html ./
COPY public/ ./public/
COPY src/ ./src/
COPY vite.config.js ./

# Set the API URL for production build - will be proxied through nginx
ENV VITE_API_URL=/api

# Build the application
RUN npm run build

# ------- Production stage with nginx -------
FROM nginx:alpine

# Copy the built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
