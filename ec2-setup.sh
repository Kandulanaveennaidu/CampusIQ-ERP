#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# CampusIQ — EC2 Setup & Direct Deployment Script (No Docker)
# ──────────────────────────────────────────────────────────────────────────────
# Deploys CampusIQ directly on EC2 using Node.js + Nginx + systemd
#
# What it does:
#   1. Stops any old services
#   2. Backs up existing .env.local
#   3. Installs Node.js 20, Nginx, Git
#   4. Clones/updates CampusIQ-ERP repo from GitHub
#   5. Installs dependencies & builds the app
#   6. Sets up systemd service for auto-restart
#   7. Configures Nginx reverse proxy
#   8. Verifies deployment
#
# Usage:
#   chmod +x ec2-setup.sh
#   ./ec2-setup.sh
# ──────────────────────────────────────────────────────────────────────────────

set -e

EC2_IP="44.192.75.16"
APP_DIR="/home/ubuntu/campusiq"
BACKUP_DIR="/home/ubuntu/campusiq-backup"
REPO_URL="https://github.com/Kandulanaveennaidu/CampusIQ-ERP.git"
BRANCH="master"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  CampusIQ — EC2 Direct Deployment (Node.js + Nginx)"
echo "  Server: $EC2_IP"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. Stop Old Services ─────────────────────────────────────────────────────
echo "[1/9] Stopping old services..."

for SVC in campusiq edutrack; do
    if sudo systemctl is-active --quiet "$SVC" 2>/dev/null; then
        echo "   Stopping $SVC service..."
        sudo systemctl stop "$SVC"
        echo "   Done: $SVC stopped"
    fi
done

# Stop any Docker containers if they exist (cleanup from old Docker setup)
if command -v docker &> /dev/null; then
    echo "   Cleaning up old Docker containers..."
    sudo docker compose down 2>/dev/null || true
    sudo docker stop campusiq-app campusiq-nginx campusiq-certbot campusiq-watchtower 2>/dev/null || true
    sudo docker rm campusiq-app campusiq-nginx campusiq-certbot campusiq-watchtower 2>/dev/null || true
    echo "   Done: Docker containers removed"
fi

# Kill any stale node processes on port 3000
if sudo lsof -i :3000 -t &>/dev/null; then
    echo "   Killing processes on port 3000..."
    sudo kill -9 $(sudo lsof -i :3000 -t) 2>/dev/null || true
    echo "   Done: Port 3000 freed"
fi

echo "   All old services stopped"
echo ""

# ── 2. Backup Existing Environment ───────────────────────────────────────────
echo "[2/9] Backing up existing configuration..."

mkdir -p "$BACKUP_DIR"

if [ -f "$APP_DIR/.env.local" ]; then
    cp "$APP_DIR/.env.local" "$BACKUP_DIR/.env.local.bak"
    echo "   .env.local backed up to $BACKUP_DIR/.env.local.bak"
    ENV_BACKED_UP=true
else
    echo "   No .env.local found — will create new one"
    ENV_BACKED_UP=false
fi
echo ""

# ── 3. System Updates ────────────────────────────────────────────────────────
echo "[3/9] Updating system packages..."
sudo apt update && sudo apt upgrade -y
echo ""

# ── 4. Install Node.js 20 ────────────────────────────────────────────────────
echo "[4/9] Installing Node.js 20..."
if ! command -v node &> /dev/null || ! node -v | grep -q "v20"; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    echo "   Node.js $(node -v) installed"
    echo "   npm $(npm -v) installed"
else
    echo "   Node.js $(node -v) already installed"
fi
echo ""

# ── 5. Install Nginx & Git ───────────────────────────────────────────────────
echo "[5/9] Installing Nginx & Git..."
sudo apt install -y nginx git
sudo systemctl enable nginx
echo "   Nginx installed and enabled"
echo ""

# ── 6. Clone/Update Repository ──────────────────────────────────────────────
echo "[6/9] Setting up CampusIQ repository..."
cd /home/ubuntu

if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"

    # Check if remote needs updating
    CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "none")
    if [ "$CURRENT_REMOTE" != "$REPO_URL" ]; then
        echo "   Updating remote to $REPO_URL..."
        git remote set-url origin "$REPO_URL"
        echo "   Remote updated"
    fi

    echo "   Pulling latest code..."
    git fetch origin "$BRANCH"
    git reset --hard "origin/$BRANCH"
    echo "   Code updated to latest"
else
    echo "   Cloning CampusIQ-ERP..."
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
    echo "   Repository cloned"
fi
echo ""

# ── 7. Restore/Create Environment Config ────────────────────────────────────
echo "[7/9] Configuring environment..."

if [ "$ENV_BACKED_UP" = true ] && [ -f "$BACKUP_DIR/.env.local.bak" ]; then
    cp "$BACKUP_DIR/.env.local.bak" "$APP_DIR/.env.local"
    echo "   Restored existing .env.local from backup"

    # Update URLs to use current EC2 IP
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://$EC2_IP|g" "$APP_DIR/.env.local"
    sed -i "s|APP_URL=.*|APP_URL=http://$EC2_IP|g" "$APP_DIR/.env.local"
    echo "   Updated NEXTAUTH_URL and APP_URL to http://$EC2_IP"
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

# ──── Optional: SMTP Email ────
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=

# ──── Optional: Twilio SMS & WhatsApp ────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_NUMBER=

# ──── Optional: Authorize.net Payments ────
AUTHORIZE_NET_API_LOGIN_ID=
AUTHORIZE_NET_TRANSACTION_KEY=
AUTHORIZE_NET_SANDBOX=true

# ──── Optional: Google AI ────
GEMINI_API_KEY=
ENVEOF
    echo "   Created new .env.local"
    echo "   IMPORTANT: Edit .env.local with your real values!"
    echo "     Run: nano $APP_DIR/.env.local"
fi
echo ""

# ── 8. Install Dependencies & Build ─────────────────────────────────────────
echo "[8/9] Installing dependencies & building..."
cd "$APP_DIR"

echo "   Installing npm dependencies..."
npm install --production=false

echo "   Building production app (this may take 2-5 minutes)..."
NODE_OPTIONS="--max_old_space_size=1536" npm run build

echo "   Build complete!"
echo ""

# ── 9. Setup systemd Service & Nginx ────────────────────────────────────────
echo "[9/9] Setting up systemd service & Nginx..."

# Install systemd service
sudo tee /etc/systemd/system/campusiq.service > /dev/null << 'SVCEOF'
[Unit]
Description=CampusIQ School Management System
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/campusiq
EnvironmentFile=/home/ubuntu/campusiq/.env.local
ExecStart=/usr/bin/node /home/ubuntu/campusiq/server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=campusiq
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
SVCEOF

sudo systemctl daemon-reload
sudo systemctl enable campusiq
sudo systemctl start campusiq
echo "   systemd service started"

# Setup Nginx
sudo cp "$APP_DIR/nginx.conf" /etc/nginx/sites-available/campusiq
sudo ln -sf /etc/nginx/sites-available/campusiq /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
echo "   Nginx configured and restarted"

# ── Cleanup old Docker stuff (if any) ────────────────────────────────────────
echo ""
echo "Cleaning up old deployment files..."
sudo rm -f /etc/systemd/system/edutrack.service
sudo rm -f /etc/nginx/sites-enabled/edutrack
sudo rm -f /etc/nginx/sites-available/edutrack
sudo systemctl daemon-reload 2>/dev/null || true
echo "   Cleanup done"

# ── Wait and verify ──────────────────────────────────────────────────────────
echo ""
echo "Waiting for app to start..."
sleep 5

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200\|301\|302"; then
    echo "   App is responding on port 3000"
else
    echo "   App may still be starting... Check: sudo journalctl -u campusiq -f"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200\|301\|302"; then
    echo "   Nginx is responding on port 80"
else
    echo "   Nginx may need a moment... Check: sudo systemctl status nginx"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  CampusIQ Deployed Successfully!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Access: http://$EC2_IP"
echo ""
echo "  Useful Commands:"
echo "     sudo systemctl status campusiq    — Check app status"
echo "     sudo journalctl -u campusiq -f    — View app logs"
echo "     sudo systemctl restart campusiq   — Restart app"
echo "     sudo systemctl status nginx       — Check Nginx status"
echo ""
echo "  To redeploy after code changes:"
echo "     cd $APP_DIR"
echo "     git pull origin $BRANCH"
echo "     npm install"
echo "     npm run build"
echo "     sudo systemctl restart campusiq"
echo ""
echo "  Edit environment:"
echo "     nano $APP_DIR/.env.local"
echo "     sudo systemctl restart campusiq"
echo ""
echo "  SSL Setup (optional):"
echo "     sudo apt install certbot python3-certbot-nginx -y"
echo "     sudo certbot --nginx -d YOUR_DOMAIN"
echo ""
echo "  Required AWS Security Group ports: 22, 80, 443"
echo ""
