#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# CampusIQ — EC2 Migration & Docker Deployment Script
# ──────────────────────────────────────────────────────────────────────────────
# This script migrates from the old Edutrack (systemd+nginx) deployment
# to the new CampusIQ Docker-based deployment on EC2: 44.192.75.16
#
# What it does:
#   1. Stops old Edutrack/CampusIQ systemd & nginx services
#   2. Backs up existing .env.local
#   3. Installs Docker & Docker Compose
#   4. Clones/updates CampusIQ-ERP repo
#   5. Restores environment config
#   6. Builds & starts Docker containers
#
# Usage:
#   chmod +x ec2-setup.sh
#   ./ec2-setup.sh
# ──────────────────────────────────────────────────────────────────────────────

set -e

EC2_IP="44.192.75.16"
APP_DIR="/home/ubuntu/campusiq"
BACKUP_DIR="/home/ubuntu/campusiq-backup"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  CampusIQ — EC2 Migration & Docker Deployment"
echo "  Server: $EC2_IP"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. Stop Old Edutrack/CampusIQ Services ───────────────────────────────────
echo "🛑 [1/8] Stopping old services..."

# Stop systemd services (try both old and new names)
for SVC in campusiq edutrack; do
    if sudo systemctl is-active --quiet "$SVC" 2>/dev/null; then
        echo "   Stopping $SVC service..."
        sudo systemctl stop "$SVC"
        sudo systemctl disable "$SVC"
        echo "   ✓ $SVC service stopped and disabled"
    fi
done

# Stop nginx (we'll use Docker nginx instead)
if sudo systemctl is-active --quiet nginx 2>/dev/null; then
    echo "   Stopping system nginx (Docker nginx will replace it)..."
    sudo systemctl stop nginx
    sudo systemctl disable nginx
    echo "   ✓ System nginx stopped and disabled"
fi

# Kill any node processes running the old app on port 3000
if sudo lsof -i :3000 -t &>/dev/null; then
    echo "   Killing processes on port 3000..."
    sudo kill -9 $(sudo lsof -i :3000 -t) 2>/dev/null || true
    echo "   ✓ Port 3000 freed"
fi

echo "   ✓ All old services stopped"
echo ""

# ── 2. Backup Existing Environment & Data ────────────────────────────────────
echo "💾 [2/8] Backing up existing configuration..."

mkdir -p "$BACKUP_DIR"

if [ -f "$APP_DIR/.env.local" ]; then
    cp "$APP_DIR/.env.local" "$BACKUP_DIR/.env.local.bak"
    echo "   ✓ .env.local backed up to $BACKUP_DIR/.env.local.bak"
    ENV_BACKED_UP=true
else
    echo "   ⚠ No .env.local found — will create new one"
    ENV_BACKED_UP=false
fi

if [ -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env" "$BACKUP_DIR/.env.bak"
    echo "   ✓ .env backed up"
fi
echo ""

# ── 3. System Updates ────────────────────────────────────────────────────────
echo "📦 [3/8] Updating system packages..."
sudo apt update && sudo apt upgrade -y
echo ""

# ── 4. Install Docker ────────────────────────────────────────────────────────
echo "🐳 [4/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker ubuntu
    echo "   ✓ Docker installed: $(docker --version)"
    echo ""
    echo "   ⚠ NOTE: Docker group added. If 'docker' commands fail later,"
    echo "     log out and back in, or run: newgrp docker"
else
    echo "   ✓ Docker already installed: $(docker --version)"
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    sudo apt install -y docker-compose-plugin
    echo "   ✓ Docker Compose installed: $(docker compose version)"
else
    echo "   ✓ Docker Compose already installed: $(docker compose version)"
fi
echo ""

# ── 5. Clone/Update Repository ──────────────────────────────────────────────
echo "📥 [5/8] Setting up CampusIQ-ERP repository..."
cd /home/ubuntu

if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"

    # Check if the remote is the old edutrack repo
    CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "none")
    if echo "$CURRENT_REMOTE" | grep -qi "edutrack"; then
        echo "   Detected old Edutrack repo — switching to CampusIQ-ERP..."
        git remote set-url origin https://github.com/Kandulanaveennaidu/CampusIQ-ERP.git
        echo "   ✓ Remote updated to CampusIQ-ERP"
    fi

    echo "   Fetching latest code..."
    git fetch origin main
    git reset --hard origin/main
    echo "   ✓ Code updated to latest CampusIQ-ERP"
else
    echo "   Cloning CampusIQ-ERP..."
    git clone https://github.com/Kandulanaveennaidu/CampusIQ-ERP.git "$APP_DIR"
    cd "$APP_DIR"
    echo "   ✓ Repository cloned"
fi
echo ""

# ── 6. Restore/Create Environment Config ────────────────────────────────────
echo "⚙️  [6/8] Configuring environment..."

if [ "$ENV_BACKED_UP" = true ] && [ -f "$BACKUP_DIR/.env.local.bak" ]; then
    cp "$BACKUP_DIR/.env.local.bak" "$APP_DIR/.env.local"
    echo "   ✓ Restored existing .env.local from backup"

    # Update URLs if they still reference old values
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://$EC2_IP|g" "$APP_DIR/.env.local"
    sed -i "s|APP_URL=.*|APP_URL=http://$EC2_IP|g" "$APP_DIR/.env.local"
    echo "   ✓ Updated NEXTAUTH_URL and APP_URL to http://$EC2_IP"
else
    cat > "$APP_DIR/.env.local" << ENVEOF
# ──── CampusIQ Environment Configuration ────
# Server: $EC2_IP

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/campusiq?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://$EC2_IP

# App
APP_URL=http://$EC2_IP
NODE_ENV=production

# ──── Optional: Twilio SMS & WhatsApp ────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_NUMBER=

# ──── Optional: Email (SMTP) ────
EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM=

# ──── Optional: Authorize.net Payments ────
AUTHORIZE_NET_API_LOGIN_ID=
AUTHORIZE_NET_TRANSACTION_KEY=
AUTHORIZE_NET_SANDBOX=true

# ──── Optional: Razorpay (INR Payments) ────
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# ──── Optional: Cloudinary ────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ──── Optional: Google AI ────
GOOGLE_AI_API_KEY=
ENVEOF
    echo "   ✓ Created new .env.local"
    echo "   ⚠ IMPORTANT: Edit .env.local with your real MongoDB URI and secrets!"
    echo "     Run: nano $APP_DIR/.env.local"
fi
echo ""

# ── 7. Build & Start Docker Containers ──────────────────────────────────────
echo "🚀 [7/8] Building and starting CampusIQ with Docker..."
cd "$APP_DIR"

# Create required directories
mkdir -p docker/nginx/ssl

# Stop any existing Docker containers
sudo docker compose down 2>/dev/null || true

# Build the app image locally (first deploy — no GHCR image yet)
echo "   Building Docker image (this may take 3-5 minutes)..."
sudo docker compose build --no-cache app

# Start all services
echo "   Starting all services..."
sudo docker compose up -d

echo ""
echo "   Waiting for services to be healthy..."
sleep 15

# Check if services are running
echo ""
sudo docker compose ps
echo ""

# ── 8. Verify Deployment ────────────────────────────────────────────────────
echo "🔍 [8/8] Verifying deployment..."

# Check if app is responding
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200\|301\|302"; then
    echo "   ✓ App is responding on port 3000"
else
    echo "   ⚠ App may still be starting... Check logs: sudo docker compose logs -f app"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200\|301\|302"; then
    echo "   ✓ Nginx is responding on port 80"
else
    echo "   ⚠ Nginx may still be starting... Check logs: sudo docker compose logs -f nginx"
fi

# ── Cleanup old files ───────────────────────────────────────────────────────
echo ""
echo "🧹 Cleaning up old deployment files..."
sudo rm -f /etc/systemd/system/campusiq.service
sudo rm -f /etc/systemd/system/edutrack.service
sudo rm -f /etc/nginx/sites-enabled/campusiq
sudo rm -f /etc/nginx/sites-enabled/edutrack
sudo rm -f /etc/nginx/sites-available/campusiq
sudo rm -f /etc/nginx/sites-available/edutrack
sudo systemctl daemon-reload 2>/dev/null || true
echo "   ✓ Old service files cleaned up"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ CampusIQ Deployed Successfully!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  🌐 Access: http://$EC2_IP"
echo ""
echo "  📋 Useful Commands:"
echo "     docker compose ps              — Check service status"
echo "     docker compose logs -f app     — View app logs"
echo "     docker compose logs -f nginx   — View nginx logs"
echo "     docker compose restart app     — Restart app"
echo "     docker compose down            — Stop everything"
echo "     docker compose up -d --build   — Rebuild & restart"
echo ""
echo "  📋 If .env.local needs editing:"
echo "     nano $APP_DIR/.env.local"
echo "     docker compose restart app"
echo ""
echo "  🔄 For automatic CI/CD deployments (GitHub → EC2):"
echo "     Set up GitHub Secrets in your repo settings:"
echo "     - EC2_HOST=$EC2_IP"
echo "     - EC2_USER=ubuntu"
echo "     - EC2_SSH_KEY=(paste your .pem key)"
echo "     - ENV_FILE=(paste your .env.local contents)"
echo ""
