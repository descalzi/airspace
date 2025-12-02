# Quick Deployment Summary

## What You Asked
> "once we run this from docker, the way we connect to the API proxy backend needs to change"

## The Answer

**You were partly right!** Containers in the same Docker network use the **container name** as the hostname, not `localhost`. But there's a twist...

Since your frontend is a **static website**, the API calls are made by the **user's browser**, not by the nginx container. The browser can't directly access container names like `airspace-backend`.

## The Solution: Nginx Reverse Proxy

I've configured nginx to act as a reverse proxy:

```
Browser → http://your-server:8080/api/... → nginx → http://airspace-backend:8000/...
```

## What Changed

### 1. nginx.conf
Added proxy configuration to forward `/api/*` requests to the backend container:
```nginx
location /api/ {
    proxy_pass http://airspace-backend:8000/;
}
```

### 2. .env.production (new file)
Created for Docker builds - uses relative path:
```
VITE_BACKEND_URL=/api
```

### 3. .env (unchanged)
Kept for local development - uses your Tailscale URL:
```
VITE_BACKEND_URL=https://chunkyboy.reindeer-great.ts.net/api
```

### 4. Dockerfile
Updated to use `.env.production` during build

### 5. docker-compose.yml
Added network configuration and backend connection setup

## Quick Start

### If backend is already running on `airspace-network`:

1. Update `docker-compose.yml`:
```yaml
networks:
  airspace-network:
    external: true  # Use existing network
```

2. Remove the `depends_on` line (line 14-15)

3. Deploy:
```bash
docker-compose up -d
```

### If starting fresh:

```bash
# Just run it
docker-compose up -d

# Access at http://your-server-ip:8080
```

## Key Points

✅ Container-to-container: Use container name (`airspace-backend:8000`)
✅ Browser-to-backend: Use nginx proxy (`/api` → proxied internally)
❌ Don't use `localhost` - each container has its own localhost
❌ Don't use `http://airspace-backend:8000` in browser - won't resolve

## Files to Check

- `DOCKER.md` - Full Docker deployment guide
- `DOCKER-NETWORK.md` - Detailed networking setup and troubleshooting
- `nginx.conf` - See the proxy configuration in action
- `.env.production` - Production environment variables
