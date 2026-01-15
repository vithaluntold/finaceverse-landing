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
    
    POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    ZITADEL_MASTERKEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    ZITADEL_DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    SUPERADMIN_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
    VAULT_ROOT_TOKEN=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    REDIS_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
    APISIX_ADMIN_KEY=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    APISIX_DASHBOARD_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    APISIX_DASHBOARD_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)

    cat > .env << EOF
# FinACEverse Command Center Environment
# Generated: $(date -Iseconds)
# WARNING: Keep this file secure! Do not commit to version control.

# Database
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Zitadel (Identity)
ZITADEL_MASTERKEY=${ZITADEL_MASTERKEY}
ZITADEL_DB_PASSWORD=${ZITADEL_DB_PASSWORD}
SUPERADMIN_PASSWORD=${SUPERADMIN_PASSWORD}

# Vault (Secrets)
VAULT_ROOT_TOKEN=${VAULT_ROOT_TOKEN}

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}

# APISIX (Gateway)
APISIX_ADMIN_KEY=${APISIX_ADMIN_KEY}
APISIX_DASHBOARD_SECRET=${APISIX_DASHBOARD_SECRET}
APISIX_DASHBOARD_PASSWORD=${APISIX_DASHBOARD_PASSWORD}

# Environment
ENVIRONMENT=development
EOF

    chmod 600 .env

    echo -e "${GREEN}✓ Created .env file with secure passwords${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Save these credentials securely!${NC}"
    echo ""
    echo -e "SuperAdmin Login:"
    echo -e "  Username: ${BLUE}superadmin${NC}"
    echo -e "  Password: ${BLUE}${SUPERADMIN_PASSWORD}${NC}"
    echo ""
    echo -e "APISIX Dashboard:"
    echo -e "  Username: ${BLUE}admin${NC}"
    echo -e "  Password: ${BLUE}${APISIX_DASHBOARD_PASSWORD}${NC}"
    echo ""
}

# Start services
start_services() {
    print_banner
    load_env
    
    echo -e "${GREEN}Starting Command Center services...${NC}"
    echo ""
    
    docker-compose up -d
    
    echo ""
    echo -e "${GREEN}✓ Services started!${NC}"
    echo ""
    echo -e "${BLUE}Service URLs:${NC}"
    echo -e "  • Zitadel Console:    http://localhost:8080"
    echo -e "  • APISIX Dashboard:   http://localhost:9000"
    echo -e "  • SigNoz:             http://localhost:3301"
    echo -e "  • Vault:              http://localhost:8200"
    echo -e "  • Cerbos:             http://localhost:3593"
    echo -e "  • API Gateway:        http://localhost:9080"
    echo ""
    echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
    sleep 10
    
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
