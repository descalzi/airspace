# Docker Network Setup Guide

This guide explains how to connect the frontend and backend containers.

## How It Works

The frontend is a **static site** served by nginx. When the browser loads the page:
- Browser → Requests `http://your-server:8080/` → Gets HTML/JS/CSS from nginx
- Browser → Makes API call to `/api/...` → nginx proxies to `airspace-backend:8000`

**Key Point:** The browser makes API requests, not the nginx container. So we use nginx as a reverse proxy to forward `/api` requests to the backend container.

## Setup Options

### Option 1: Backend Already Running (Separate docker-compose)

If your backend is already running in Docker with the network `airspace-network`:

1. **Update docker-compose.yml** to use the external network:

```yaml
version: '3.8'

services:
  airspace-web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: airspace-web
    ports:
      - "8080:80"
    restart: unless-stopped
    networks:
      - airspace-network

networks:
  airspace-network:
    external: true  # Connect to existing network
```

2. **Verify backend container name:**
```bash
docker ps --filter network=airspace-network
```

Make sure the backend container is named `airspace-backend` (or update `nginx.conf` line 20 to match the actual name).

3. **Deploy:**
```bash
docker-compose up -d
```

### Option 2: Deploy Both Together (Single docker-compose)

If you want to manage both in one docker-compose:

1. **Update docker-compose.yml:**

```yaml
version: '3.8'

services:
  airspace-web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: airspace-web
    ports:
      - "8080:80"
    restart: unless-stopped
    networks:
      - airspace-network
    depends_on:
      - airspace-backend

  airspace-backend:
    build: ../airspace-backend  # Adjust path to your backend
    container_name: airspace-backend
    ports:
      - "8000:8000"
    restart: unless-stopped
    networks:
      - airspace-network
    environment:
      # Add any backend env vars here
      - PORT=8000

networks:
  airspace-network:
    driver: bridge
```

2. **Deploy:**
```bash
docker-compose up -d
```

## Environment Configuration

The project uses different environment files:

- **`.env`** - Local development (uses `https://chunkyboy.reindeer-great.ts.net/api`)
- **`.env.production`** - Docker production (uses `/api` which nginx proxies)

The Dockerfile automatically uses `.env.production` during build.

## Nginx Proxy Configuration

In `nginx.conf`, requests to `/api/*` are proxied to the backend:

```nginx
location /api/ {
    proxy_pass http://airspace-backend:8000/;
    # ... headers ...
}
```

This means:
- Browser requests: `http://your-server:8080/api/openaip/tiles/1/2/3.pbf`
- Nginx forwards to: `http://airspace-backend:8000/openaip/tiles/1/2/3.pbf`

## Troubleshooting

### Can't connect to backend

1. **Check both containers are on the same network:**
```bash
docker network inspect airspace-network
```

2. **Verify backend container name:**
```bash
docker ps --filter network=airspace-network
```

3. **Test from frontend container:**
```bash
docker exec -it airspace-web sh
wget -O- http://airspace-backend:8000/health  # or whatever endpoint
```

### 502 Bad Gateway

- Backend container is not running or not on the same network
- Backend container has a different name (update `nginx.conf`)
- Backend is listening on a different port (update `nginx.conf`)

### CORS errors

If you're using nginx proxy correctly, you shouldn't get CORS errors (same origin). If you do:
- Make sure browser is requesting `/api/...` not `http://airspace-backend:8000/...`
- Check browser dev tools Network tab to see actual request URL

### Backend name resolution fails

If nginx can't resolve `airspace-backend`:
```bash
# Check container name
docker ps

# Update nginx.conf line 20 to match actual container name
proxy_pass http://ACTUAL_CONTAINER_NAME:8000/;
```

## Alternative: Using Public URL

If you don't want to use container networking, you can keep using the public URL:

1. **Don't modify `.env.production`** - keep it as:
```
VITE_BACKEND_URL=https://chunkyboy.reindeer-great.ts.net/api
```

2. **Remove the proxy configuration** from `nginx.conf` (delete the `location /api/` block)

3. **Deploy as normal**

This works fine but means API traffic goes out to the internet and back, even though both services are on the same server.
