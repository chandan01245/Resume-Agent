.PHONY: help build up down logs clean restart test dev prod

# Default target
help:
	@echo "Resume Agent - Docker Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment"
	@echo "  make build        - Build Docker images"
	@echo "  make up           - Start all services"
	@echo "  make down         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make logs         - View logs (all services)"
	@echo "  make logs-backend - View backend logs"
	@echo "  make logs-frontend- View frontend logs"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Start production environment"
	@echo "  make prod-build   - Build production images"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Remove containers and volumes"
	@echo "  make prune        - Clean up Docker system"
	@echo "  make backup       - Backup data volumes"
	@echo "  make ps           - Show running containers"
	@echo "  make shell-backend - Open backend shell"
	@echo "  make shell-frontend - Open frontend shell"

# Development commands
dev:
	docker-compose up --build

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

# Production commands
prod:
	docker-compose -f docker-compose.prod.yml up -d

prod-build:
	docker-compose -f docker-compose.prod.yml up -d --build

prod-down:
	docker-compose -f docker-compose.prod.yml down

# Maintenance
clean:
	docker-compose down -v
	docker system prune -f

prune:
	docker system prune -a --volumes -f

backup:
	@echo "Backing up data..."
	@mkdir -p backups
	@docker run --rm -v resume-agent_resume-data:/data -v $$(pwd)/backups:/backup alpine tar czf /backup/resumes-$$(date +%Y%m%d_%H%M%S).tar.gz /data
	@docker run --rm -v resume-agent_chroma-data:/data -v $$(pwd)/backups:/backup alpine tar czf /backup/chromadb-$$(date +%Y%m%d_%H%M%S).tar.gz /data
	@echo "Backup completed in ./backups/"

ps:
	docker-compose ps

# Shell access
shell-backend:
	docker-compose exec backend bash

shell-frontend:
	docker-compose exec frontend sh

# Testing
test:
	docker-compose exec backend pytest

# Database reset
reset-db:
	docker-compose down -v
	docker-compose up -d
