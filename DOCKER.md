# Docker Deployment Guide

This guide explains how to deploy the Airspace application as a static website using Docker and nginx.

## Prerequisites

- Docker installed on your home server
- Docker Compose (optional, but recommended)

## Quick Start

### Using Docker Compose (Recommended)

1. Build and start the container:
```bash
docker-compose up -d
```

2. Access the application at `http://your-server-ip:8080`

3. To stop the container:
```bash
docker-compose down
```

### Using Docker CLI

1. Build the Docker image:
```bash
docker build -t airspace-web .
```

2. Run the container:
```bash
docker run -d -p 8080:80 --name airspace-web --restart unless-stopped airspace-web
```

3. Access the application at `http://your-server-ip:8080`

4. To stop the container:
```bash
docker stop airspace-web
docker rm airspace-web
```

## Configuration

### Changing the Port

**Docker Compose:**
Edit `docker-compose.yml` and change the ports mapping:
```yaml
ports:
  - "3000:80"  # Change 3000 to your desired port
```

**Docker CLI:**
Change the `-p` flag:
```bash
docker run -d -p 3000:80 --name airspace-web airspace-web
```

### Custom nginx Configuration

The nginx configuration is in `nginx.conf`. Key features:

- **Gzip compression** for faster loading
- **Security headers** for XSS and clickjacking protection
- **SPA routing** support (all routes serve index.html)
- **Static asset caching** (1 year for JS/CSS/images)
- **No caching** for index.html to ensure updates are reflected

To modify, edit `nginx.conf` and rebuild the image.

## Multi-Stage Build

The Dockerfile uses a multi-stage build:

1. **Stage 1 (builder)**: Builds the application using Node.js
   - Installs dependencies
   - Runs `npm run build`
   - Outputs to `docs/` directory

2. **Stage 2 (production)**: Serves static files with nginx
   - Copies built files from stage 1
   - Uses lightweight nginx:alpine image
   - Final image size: ~25-30MB

## Updating the Application

1. Pull latest code changes
2. Rebuild and restart:

**Docker Compose:**
```bash
docker-compose down
docker-compose up -d --build
```

**Docker CLI:**
```bash
docker stop airspace-web
docker rm airspace-web
docker build -t airspace-web .
docker run -d -p 8080:80 --name airspace-web --restart unless-stopped airspace-web
```

## Viewing Logs

**Docker Compose:**
```bash
docker-compose logs -f airspace-web
```

**Docker CLI:**
```bash
docker logs -f airspace-web
```

## Production Considerations

### Reverse Proxy

For production, consider using a reverse proxy like Traefik or nginx proxy manager:

- Add SSL/TLS certificates
- Use a domain name instead of IP:port
- Add additional security headers
- Enable access logging

### Example with Traefik

Add labels to `docker-compose.yml`:
```yaml
services:
  airspace-web:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.airspace.rule=Host(`airspace.yourdomain.com`)"
      - "traefik.http.routers.airspace.entrypoints=websecure"
      - "traefik.http.routers.airspace.tls.certresolver=letsencrypt"
```

### Backend Connection

If you're also running the airspace-backend in Docker, connect them via a shared network:

```yaml
version: '3.8'

services:
  airspace-web:
    build: .
    ports:
      - "8080:80"
    networks:
      - airspace-network

  airspace-backend:
    build: ../airspace-backend
    ports:
      - "3000:3000"
    networks:
      - airspace-network

networks:
  airspace-network:
    driver: bridge
```

## Troubleshooting

### Container won't start
```bash
docker logs airspace-web
```

### Build fails
- Ensure `.env` file is not needed for build (use build-time args if needed)
- Check that `npm run build` works locally first

### Can't access the application
- Check firewall rules: `sudo ufw allow 8080`
- Verify container is running: `docker ps`
- Check port binding: `docker port airspace-web`

### Changes not reflected
- Rebuild with `--no-cache`: `docker build --no-cache -t airspace-web .`
- Clear browser cache
