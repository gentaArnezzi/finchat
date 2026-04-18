# Deploy FinChat to server
# Run this on your server

#!/bin/bash
set -e

# Update code
cd /opt/finchat
git pull origin main

# Pull images from GHCR (or rebuild locally)
docker-compose pull

# Or rebuild if needed:
# docker-compose build --no-cache

# Restart services
docker-compose up -d

# Show logs
docker-compose logs -f --tail=50