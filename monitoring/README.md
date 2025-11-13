# Monitoring Stack

This folder contains a self‑hosted monitoring stack that exposes the game metrics collected from `/metrics` and mirrors PM2 logs into Grafana.

## Components

- **Prometheus** scrapes the Node server (`/metrics`).
- **Grafana** visualises Prometheus metrics + Loki logs.
- **Loki + Promtail** ship and store PM2 log files for easy querying inside Grafana.

## Prerequisites

1. Docker / Docker Compose on the Raspberry Pi.
2. The game server reachable from the monitoring containers (default scrape target is `host.docker.internal:3000`).
3. PM2 log files readable by Docker (defaults to `/home/pi/.pm2/logs/*.log` – adjust if different).

## Setup

1. **Adjust Prometheus target**
   - Edit `prometheus/prometheus.yml` and update the `targets` list so it points to the host/port that serves `http://<host>:3000/metrics`.
   - If the monitoring stack runs on the same machine, you can keep `host.docker.internal:3000`.

2. **Point Promtail at your PM2 logs**
   - Update the `__path__` value in `promtail/promtail-config.yml` so it matches the folder where PM2 stores `*-out.log` / `*-error.log`.
   - Mount that folder read-only in `docker-compose.yml` (the default mounts `/home/pi/.pm2/logs`).

3. **(Optional) Change Grafana admin credentials**
   - Edit the `GF_SECURITY_ADMIN_USER` / `GF_SECURITY_ADMIN_PASSWORD` values in `docker-compose.yml`.

## Run the stack

```bash
cd monitoring
docker compose up -d
```

Services are exposed locally on:

- Grafana: `http://localhost:3001`
- Prometheus: `http://localhost:9090`
- Loki API: `http://localhost:3100`

Expose Grafana through your Cloudflare Tunnel (e.g. `metrics.lenka.itsprobabl.com`) so you can reach dashboards remotely.

## Grafana configuration

1. Log into Grafana and add two data sources:
   - **Prometheus** → `http://prometheus:9090`
   - **Loki** → `http://loki:3100`
2. Build dashboards using the new game metrics:
   - `lenka_active_lobbies`
   - `lenka_active_players`
   - `lenka_lobbies_by_status{status="playing"}`
   - `sum(lenka_lobby_players)` (player count)
   - `lenka_lobby_round{code="ABC123"}`
3. For logs, create a Log panel with query `{job="pm2-lenka"}` and add filters for `host`, log level keywords, etc.

## Updating the stack

- Apply config changes, then run `docker compose up -d` again.
- Prometheus config reload: `curl -X POST http://localhost:9090/-/reload`.
- Loki/Promtail changes require container restart.

## Subdomain exposure

Point your Cloudflare Tunnel route `metrics.lenka.itsprobabl.com` → `http://localhost:3001` (Grafana). You can also expose Prometheus if needed, but keeping it private is recommended.
