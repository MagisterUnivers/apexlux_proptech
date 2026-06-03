.PHONY: run up down build logs setup

setup:
	@[ -f backend/.env ] || (cp backend/.env.example backend/.env && echo "[setup] Created backend/.env from .env.example")
	@[ -f web/.env ] || (cp web/.env.example web/.env && echo "[setup] Created web/.env from .env.example")

run: setup
	docker-compose down -v
	docker-compose build --no-cache
	docker-compose up -d

up: setup
	docker-compose up

build: setup
	docker-compose up --build

down:
	docker-compose down

logs:
	docker-compose logs -f
