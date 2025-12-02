# HTTPS Setup with Tailscale Certificates

This guide explains how the application is configured to use HTTPS with Tailscale certificates.

## Overview

The nginx container mounts Tailscale certificates from the host system, enabling HTTPS access without port numbers:
- ✅ `https://chunkyboy.reindeer-great.ts.net` (clean URL)
- ❌ `http://chunkyboy.reindeer-great.ts.net:8080` (old way)

## How It Works

1. **Tailscale provides certificates** stored in `/var/lib/tailscale/certs/` on the host
2. **Docker mounts these certificates** into the nginx container at `/etc/nginx/ssl/`
3. **Nginx serves HTTPS** on port 443 (default HTTPS port)
4. **HTTP redirects to HTTPS** automatically

## Prerequisites

### Enable Tailscale HTTPS

If you haven't already, enable HTTPS for your Tailscale machine:

```bash
# Enable HTTPS for this machine
sudo tailscale cert chunkyboy.reindeer-great.ts.net
```

This will generate certificates at:
- `/var/lib/tailscale/certs/chunkyboy.reindeer-great.ts.net.crt`
- `/var/lib/tailscale/certs/chunkyboy.reindeer-great.ts.net.key`

### Verify Certificates Exist

```bash
ls -la /var/lib/tailscale/certs/
```

You should see:
```
chunkyboy.reindeer-great.ts.net.crt
chunkyboy.reindeer-great.ts.net.key
```

## Deployment

### Standard Deployment

```bash
docker-compose up -d
```

Access your application at: `https://chunkyboy.reindeer-great.ts.net`

### First-Time Setup

If this is your first time deploying:

1. **Ensure Tailscale certificates are available:**
```bash
sudo tailscale cert chunkyboy.reindeer-great.ts.net
```

2. **Deploy:**
```bash
docker-compose up -d
```

3. **Verify HTTPS is working:**
```bash
curl -I https://chunkyboy.reindeer-great.ts.net
```

Should return `HTTP/2 200` or similar.

## Configuration Details

### nginx.conf

The nginx configuration includes:

1. **HTTP → HTTPS redirect** (port 80 → 443)
```nginx
server {
    listen 80;
    server_name chunkyboy.reindeer-great.ts.net;
    return 301 https://$server_name$request_uri;
}
```

2. **HTTPS server** (port 443)
```nginx
server {
    listen 443 ssl http2;
    server_name chunkyboy.reindeer-great.ts.net;

    ssl_certificate /etc/nginx/ssl/chunkyboy.reindeer-great.ts.net.crt;
    ssl_certificate_key /etc/nginx/ssl/chunkyboy.reindeer-great.ts.net.key;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### docker-compose.yml

Key configuration:

```yaml
ports:
  - "80:80"     # HTTP (redirects to HTTPS)
  - "443:443"   # HTTPS

volumes:
  # Mount Tailscale certificates from host (read-only)
  - /var/lib/tailscale/certs:/etc/nginx/ssl:ro
```

## Certificate Renewal

Tailscale automatically renews certificates before they expire. The docker container will pick up renewed certificates automatically since they're mounted from the host.

**No action required** - certificates auto-renew!

If you want to force a renewal:
```bash
sudo tailscale cert --force chunkyboy.reindeer-great.ts.net
docker-compose restart airspace-web
```

## Troubleshooting

### 502 Bad Gateway or Connection Refused

**Check if container is running:**
```bash
docker ps | grep airspace-web
```

**Check nginx logs:**
```bash
docker logs airspace-web
```

### SSL Certificate Error

**Verify certificates are mounted:**
```bash
docker exec airspace-web ls -la /etc/nginx/ssl/
```

Should show:
```
chunkyboy.reindeer-great.ts.net.crt
chunkyboy.reindeer-great.ts.net.key
```

**Check certificate permissions:**
```bash
ls -la /var/lib/tailscale/certs/
```

Files should be readable (at least `r--` for others, or use `chmod 644`).

### Port 443 Already in Use

**Find what's using port 443:**
```bash
sudo lsof -i :443
```

**Stop the conflicting service or change the port mapping** in `docker-compose.yml`:
```yaml
ports:
  - "8443:443"  # Use port 8443 instead
```

Then access via: `https://chunkyboy.reindeer-great.ts.net:8443`

### HTTP Works but HTTPS Doesn't

**Check firewall:**
```bash
sudo ufw status
sudo ufw allow 443/tcp
```

**Verify nginx is listening on 443:**
```bash
docker exec airspace-web netstat -tlnp | grep 443
```

### Certificate Expired

Tailscale certs expire after 90 days but auto-renew. If expired:

```bash
# Force renewal
sudo tailscale cert --force chunkyboy.reindeer-great.ts.net

# Restart container to pick up new cert
docker-compose restart airspace-web
```

## Different Tailscale Hostname

If your Tailscale hostname is different, update these files:

**1. nginx.conf** (lines 4, 10, 15, 16):
```nginx
server_name YOUR-HOSTNAME.ts.net;
ssl_certificate /etc/nginx/ssl/YOUR-HOSTNAME.ts.net.crt;
ssl_certificate_key /etc/nginx/ssl/YOUR-HOSTNAME.ts.net.key;
```

**2. Get certificates for your hostname:**
```bash
sudo tailscale cert YOUR-HOSTNAME.ts.net
```

**3. Rebuild and deploy:**
```bash
docker-compose up -d --build
```

## Security Notes

- Certificates are mounted **read-only** (`:ro`) for security
- Only TLS 1.2 and 1.3 are enabled (older, insecure protocols disabled)
- Modern cipher suites only (no weak encryption)
- Security headers are set (XSS protection, frame options, etc.)

## Accessing the Application

After deployment:

- **HTTPS (recommended):** `https://chunkyboy.reindeer-great.ts.net`
- **HTTP (redirects):** `http://chunkyboy.reindeer-great.ts.net`

No port number needed!
