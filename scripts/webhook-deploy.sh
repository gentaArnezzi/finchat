#!/bin/bash
# Webhook script for FinChat auto-deploy
# Save as: /opt/finchat/webhook-deploy.sh

#!/bin/bash
set -e

echo "=== FinChat Deploy Started ==="
echo "Time: $(date)"

# Update code
cd /opt/finchat || exit 1
git pull origin main

# Pull latest images
echo "Pulling latest images..."
docker-compose pull

# Restart services
echo "Restarting services..."
docker-compose up -d --remove-orphans

# Wait for healthy
sleep 10

# Show status
echo ""
echo "=== Service Status ==="
docker-compose ps

echo ""
echo "=== Recent Logs ==="
docker-compose logs --tail=30

echo ""
echo "=== Deploy Complete ==="