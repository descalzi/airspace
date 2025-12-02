# Deployment Checklist

Follow these steps to deploy with HTTPS:

## Prerequisites

- [ ] Tailscale is installed and running on your server
- [ ] Your machine is named `chunkyboy` in your Tailnet
- [ ] Backend is running on the `airspace-network` Docker network

## Step 1: Get Tailscale Certificates

```bash
sudo tailscale cert chunkyboy.reindeer-great.ts.net
```

Verify certificates exist:
```bash
ls -la /var/lib/tailscale/certs/
```

Should show:
- `chunkyboy.reindeer-great.ts.net.crt`
- `chunkyboy.reindeer-great.ts.net.key`

## Step 2: Verify Backend Network

Check that your backend container is on `airspace-network`:
```bash
docker network inspect airspace-network
```

Verify the backend container name (should be `airspace-backend`):
```bash
docker ps --filter network=airspace-network
```

## Step 3: Build and Deploy

```bash
cd /path/to/airspace
docker-compose up -d --build
```

## Step 4: Verify Deployment

Check container is running:
```bash
docker ps | grep airspace-web
```

Check logs:
```bash
docker logs airspace-web
```

Test HTTPS:
```bash
curl -I https://chunkyboy.reindeer-great.ts.net
```

Should return `HTTP/2 200`.

## Step 5: Access Application

Open in browser:
```
https://chunkyboy.reindeer-great.ts.net
```

No port number needed!

## Troubleshooting

If something goes wrong, see:
- `HTTPS-SETUP.md` - HTTPS and certificate issues
- `DOCKER-NETWORK.md` - Backend connection issues
- `DOCKER.md` - General Docker issues

Quick diagnostic:
```bash
# Check if nginx is listening on 443
docker exec airspace-web netstat -tlnp | grep 443

# Check if certificates are mounted
docker exec airspace-web ls -la /etc/nginx/ssl/

# View nginx error logs
docker logs airspace-web 2>&1 | grep -i error
```

## Update Process

When you make code changes:

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

The container will automatically use the latest Tailscale certificates from the host.
