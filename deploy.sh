#!/bin/bash
set -e

echo "🚀 Deploying Lenka to Raspberry Pi..."

# Check if we are inside a git repo
if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository."
    exit 1
fi

# 1. Fetch latest changes
echo "📥 Fetching latest changes from main..."
git fetch origin main
git reset --hard origin/main

# 2. Build and restart containers
echo "🏗️  Building and restarting containers..."
docker compose -f docker-compose.pi.yml up -d --build --remove-orphans

# 3. Prune unused images to save space on Pi
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Deployment complete! App should be live at https://apps.itsprobabl.com/lenka"
