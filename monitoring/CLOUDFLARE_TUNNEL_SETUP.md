# Cloudflare Tunnel HTTPS Setup

Since you're using Cloudflare Tunnel, it handles SSL termination automatically. Your services run on HTTP locally, and Cloudflare provides HTTPS externally.

## Current Setup

Your services are exposed on:
- **Grafana**: `localhost:3001` (HTTP)
- **Prometheus**: `localhost:9090` (HTTP)

## Cloudflare Tunnel Configuration

You need to add these public hostnames to your Cloudflare Tunnel:

### Option 1: Using Cloudflare Dashboard

1. Go to **Cloudflare Zero Trust Dashboard** → **Access** → **Tunnels**
2. Select your existing tunnel
3. Click **Public Hostname** tab
4. Add two new public hostnames:

   **Grafana:**
   - Subdomain: `grafana`
   - Domain: `lenka.itsprobabl.com`
   - Service Type: `HTTP`
   - URL: `localhost:3001`

   **Prometheus:**
   - Subdomain: `prometheus`
   - Domain: `lenka.itsprobabl.com`
   - Service Type: `HTTP`
   - URL: `localhost:9090`

5. Save the configuration

### Option 2: Using Cloudflare Tunnel Config File

If you're using a config file (usually `~/.cloudflared/config.yml`), add these ingress rules:

```yaml
tunnel: <your-tunnel-id>
credentials-file: /path/to/credentials.json

ingress:
  # Grafana
  - hostname: grafana.lenka.itsprobabl.com
    service: http://localhost:3001
  
  # Prometheus
  - hostname: prometheus.lenka.itsprobabl.com
    service: http://localhost:9090
  
  # Your main app (if not already there)
  - hostname: lenka.itsprobabl.com
    service: http://localhost:3000
  
  # Catch-all rule (required)
  - service: http_status:404
```

Then restart the tunnel:
```bash
cloudflared tunnel restart
```

## Access Your Services

Once configured, access via HTTPS:
- **Grafana**: https://grafana.lenka.itsprobabl.com
- **Prometheus**: https://prometheus.lenka.itsprobabl.com

Cloudflare automatically provides:
✅ SSL/TLS encryption  
✅ Valid certificates  
✅ DDoS protection  
✅ CDN caching (if enabled)  

## Optional: Cloudflare Access (Zero Trust)

To add authentication before accessing these services:

1. Go to **Cloudflare Zero Trust** → **Access** → **Applications**
2. Create a new application for each service
3. Set authentication rules (email, GitHub, Google, etc.)
4. This adds a login page before users can access Grafana/Prometheus

## Testing

After configuration:
1. Restart your monitoring stack: `docker-compose -f monitoring/docker-compose.yml restart`
2. Wait 1-2 minutes for Cloudflare DNS to propagate
3. Access https://grafana.lenka.itsprobabl.com
4. Access https://prometheus.lenka.itsprobabl.com

Both should now work with HTTPS! 🎉
