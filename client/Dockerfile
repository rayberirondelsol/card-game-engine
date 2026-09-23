# Frontend Dockerfile - Vite build + nginx
FROM node:20-alpine AS builder

WORKDIR /app

# Der Build-Kontext ist das Repo-Wurzelverzeichnis (M6), damit shared/ mit ins
# Image kommt. /app ist der Client, /shared liegt daneben - genau wie im Repo,
# sonst zeigen die relativen Importpfade (../../../shared/...) ins Leere.
COPY client/package.json client/package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY client/index.html ./
COPY client/public/ ./public/
COPY client/src/ ./src/
COPY client/vite.config.js ./
COPY shared/ /shared/

# Set the API URL for production build - will be proxied through nginx
ENV VITE_API_URL=/api

# Build the application
RUN npm run build

# ------- Production stage with nginx -------
FROM nginx:alpine

# Copy the built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
# localhost loest im Container zuerst auf [::1] auf, nginx lauscht aber nur auf
# IPv4 - der Check schlug deshalb dauerhaft fehl, obwohl die Seite lief.
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
