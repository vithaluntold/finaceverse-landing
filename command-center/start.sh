#!/bin/bash
# FinACEverse Command Center - Startup Script
# Version: 1.0 | Date: January 14, 2026
# 
# Usage: ./start.sh [command]
#   start     - Start all services
#   stop      - Stop all services
#   restart   - Restart all services
#   status    - Show service status
#   logs      - Tail all logs
#   clean     - Stop and remove all volumes (DESTRUCTIVE)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ASCII Banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║     ███████╗██╗███╗   ██╗ █████╗  ██████╗███████╗             ║"
    echo "║     ██╔════╝██║████╗  ██║██╔══██╗██╔════╝██╔════╝             ║"
    echo "║     █████╗  ██║██╔██╗ ██║███████║██║     █████╗               ║"
    echo "║     ██╔══╝  ██║██║╚██╗██║██╔══██║██║     ██╔══╝               ║"
    echo "║     ██║     ██║██║ ╚████║██║  ██║╚██████╗███████╗             ║"
    echo "║     ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝╚══════╝             ║"
    echo "║                                                               ║"
    echo "║              COMMAND CENTER - Phase 1                         ║"
    echo "║              Identity • Security • Gateway                    ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Load environment variables
load_env() {
    if [ -f .env ]; then
        echo -e "${YELLOW}Loading environment from .env...${NC}"
        export $(cat .env | grep -v '^#' | xargs)
    else
        echo -e "${YELLOW}No .env file found. Using defaults.${NC}"
        echo -e "${YELLOW}Run './start.sh init' to create one.${NC}"
    fi
}

# Initialize environment file
init_env() {
    if [ -f .env ]; then
        echo -e "${YELLOW}Warning: .env file already exists.${NC}"
        read -p "Overwrite? (y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            echo "Aborted."
            exit 0
        fi
    fi

    echo -e "${GREEN}Generating secure passwords...${NC}"
    
    # Phase 1 credentials
    POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    ZITADEL_MASTERKEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    ZITADEL_DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    SUPERADMIN_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
    VAULT_ROOT_TOKEN=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    REDIS_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    APISIX_ADMIN_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    APISIX_DASHBOARD_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    APISIX_DASHBOARD_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
    
    # Phase 2 credentials - Lago (Billing)
    LAGO_DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    LAGO_SECRET_KEY=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)
    LAGO_ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    LAGO_DETERMINISTIC_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    LAGO_KEY_SALT=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    
    # Phase 2 credentials - Chatwoot (Support)
    CHATWOOT_DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    CHATWOOT_SECRET_KEY=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)
    
    # Phase 2 credentials - BookStack (Knowledge Base)
    BOOKSTACK_DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    BOOKSTACK_ROOT_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

    cat > .env << EOF
# FinACEverse Command Center Environment
# Generated: $(date -Iseconds)
# WARNING: Keep this file secure! Do not commit to version control.

# ============================================
# PHASE 1: Core Infrastructure
# ============================================

# Database
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Zitadel (Identity)
ZITADEL_MASTERKEY=${ZITADEL_MASTERKEY}
ZITADEL_DB_PASSWORD=${ZITADEL_DB_PASSWORD}
SUPERADMIN_PASSWORD=${SUPERADMIN_PASSWORD}

# ============================================
# SUPERADMIN INTEGRATION
# ============================================

# SuperAdmin Master Key (for multi-key auth)
SUPERADMIN_MASTER_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

# JWT Secret (shared across Command Center services)
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)
JWT_ISSUER=finaceverse-platform

# Service-to-Service Secret
SERVICE_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

# Command Center Local Mode (true = standalone, false = platform integrated)
COMMAND_CENTER_LOCAL_MODE=false

# Platform URL (for token validation in integrated mode)
PLATFORM_URL=http://localhost:3001

# SuperAdmin URL Secret (generates hidden vault path)
SUPERADMIN_URL_SECRET=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

# IP Whitelist (comma-separated, empty = allow all)
SUPERADMIN_IP_WHITELIST=

# Vault (Secrets)
VAULT_ROOT_TOKEN=${VAULT_ROOT_TOKEN}

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}

# APISIX (Gateway)
APISIX_ADMIN_KEY=${APISIX_ADMIN_KEY}
APISIX_DASHBOARD_SECRET=${APISIX_DASHBOARD_SECRET}
APISIX_DASHBOARD_PASSWORD=${APISIX_DASHBOARD_PASSWORD}

# ============================================
# PHASE 2: Billing & Support
# ============================================

# Lago (Billing - Module 1)
LAGO_DB_PASSWORD=${LAGO_DB_PASSWORD}
LAGO_SECRET_KEY=${LAGO_SECRET_KEY}
LAGO_ENCRYPTION_KEY=${LAGO_ENCRYPTION_KEY}
LAGO_DETERMINISTIC_KEY=${LAGO_DETERMINISTIC_KEY}
LAGO_KEY_SALT=${LAGO_KEY_SALT}

# Chatwoot (Support - Module 5)
CHATWOOT_DB_PASSWORD=${CHATWOOT_DB_PASSWORD}
CHATWOOT_SECRET_KEY=${CHATWOOT_SECRET_KEY}

# BookStack (Knowledge Base)
BOOKSTACK_DB_PASSWORD=${BOOKSTACK_DB_PASSWORD}
BOOKSTACK_ROOT_PASSWORD=${BOOKSTACK_ROOT_PASSWORD}

# SMTP (for Chatwoot email)
SMTP_ADDRESS=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=

# Environment
ENVIRONMENT=development
EOF

    chmod 600 .env

    echo -e "${GREEN}✓ Created .env file with secure passwords${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Save these credentials securely!${NC}"
    echo ""
    echo -e "${BLUE}=== SUPERADMIN ACCESS ===${NC}"
    echo -e "Master Key:     ${BLUE}\${SUPERADMIN_MASTER_KEY}${NC}"
    echo -e "JWT Secret:     ${BLUE}[Generated - see .env]${NC}"
    echo -e "Service Secret: ${BLUE}[Generated - see .env]${NC}"
    echo ""
    echo -e "${BLUE}=== PHASE 1: Core Infrastructure ===${NC}"
    echo -e "SuperAdmin Login:"
    echo -e "  Username: ${BLUE}superadmin${NC}"
    echo -e "  Password: ${BLUE}${SUPERADMIN_PASSWORD}${NC}"
    echo ""
    echo -e "APISIX Dashboard:"
    echo -e "  Username: ${BLUE}admin${NC}"
    echo -e "  Password: ${BLUE}${APISIX_DASHBOARD_PASSWORD}${NC}"
    echo ""
    echo -e "${BLUE}=== COMMAND CENTER SERVICES ===${NC}"
    echo -e "Orchestrator:   http://localhost:3500"
    echo -e "Partner Portal: http://localhost:3501"
    echo ""
    echo -e "${BLUE}=== PHASE 2: Billing & Support ===${NC}"
    echo -e "Lago (Billing):     http://localhost:8081"
    echo -e "Chatwoot (Support): http://localhost:3100"
    echo -e "BookStack (KB):     http://localhost:6875"
    echo ""
    echo -e "${YELLOW}Note: Configure SMTP settings in .env for email functionality${NC}"
    echo ""
}

# Start services
start_services() {
    print_banner
    load_env
    
    echo -e "${GREEN}Starting Command Center services (Phase 1 + Phase 2)...${NC}"
    echo ""
    
    docker-compose up -d
    
    echo ""
    echo -e "${GREEN}✓ Services started!${NC}"
    echo ""
    echo -e "${BLUE}=== COMMAND CENTER (SuperAdmin Protected) ===${NC}"
    echo -e "  • Orchestrator API:   http://localhost:3500"
    echo -e "  • Partner Portal:     http://localhost:3501"
    echo ""
    echo -e "${BLUE}=== PHASE 1: Core Infrastructure ===${NC}"
    echo -e "  • Zitadel Console:    http://localhost:8080"
    echo -e "  • APISIX Dashboard:   http://localhost:9000"
    echo -e "  • SigNoz APM:         http://localhost:3301"
    echo -e "  • Vault Secrets:      http://localhost:8200"
    echo -e "  • Cerbos AuthZ:       http://localhost:3593"
    echo -e "  • API Gateway:        http://localhost:9080"
    echo ""
    echo -e "${BLUE}=== PHASE 2: Billing & Support ===${NC}"
    echo -e "  • Lago Billing:       http://localhost:8081"
    echo -e "  • Lago API:           http://localhost:3000"
    echo -e "  • Chatwoot Support:   http://localhost:3100"
    echo -e "  • BookStack KB:       http://localhost:6875"
    echo ""
    echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
    sleep 15
    
    # Check service health
    echo ""
    docker-compose ps
}

# Stop services
stop_services() {
    echo -e "${YELLOW}Stopping Command Center services...${NC}"
    docker-compose down
    echo -e "${GREEN}✓ Services stopped${NC}"
}

# Show logs
show_logs() {
    docker-compose logs -f --tail=100
}

# Show status
show_status() {
    echo -e "${BLUE}Command Center Service Status:${NC}"
    echo ""
    docker-compose ps
}

# Clean everything
clean_all() {
    echo -e "${RED}WARNING: This will destroy all data!${NC}"
    read -p "Are you sure? Type 'yes' to confirm: " confirm
    if [ "$confirm" = "yes" ]; then
        docker-compose down -v --remove-orphans
        echo -e "${GREEN}✓ All services and volumes removed${NC}"
    else
        echo "Aborted."
    fi
}

# Main command handler
case "${1:-start}" in
    init)
        init_env
        ;;
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        start_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_all
        ;;
    *)
        echo "Usage: $0 {init|start|stop|restart|status|logs|clean}"
        echo ""
        echo "Commands:"
        echo "  init     - Generate .env file with secure passwords"
        echo "  start    - Start all services (default)"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  status   - Show service status"
        echo "  logs     - Tail all logs"
        echo "  clean    - Stop and remove all data (DESTRUCTIVE)"
        exit 1
        ;;
esac
