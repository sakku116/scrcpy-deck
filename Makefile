.PHONY: help install setup build build-dev clean start app lint format build-exe \
        docker-build docker-up docker-down git-sync

# Default target: show help
help:
	@echo ""
	@echo "ScrcpyDeck — available commands"
	@echo ""
	@echo "  Setup"
	@echo "    make install       Install Node dependencies (npm ci)"
	@echo "    make setup         Download bundled adb binary into vendor/"
	@echo ""
	@echo "  Development"
	@echo "    make build-dev     Build frontend + backend with source maps (fast)"
	@echo "    make build         Build frontend + backend for production (minified)"
	@echo "    make start         Production build then start the server (localhost:8000)"
	@echo "    make app           Production build, start server, and open browser"
	@echo "    make clean         Delete the dist/ output directory"
	@echo ""
	@echo "  Code quality"
	@echo "    make lint          Run ESLint on all TypeScript sources"
	@echo "    make format        Run ESLint --fix (auto-format)"
	@echo ""
	@echo "  Packaging"
	@echo "    make build-exe     Build single Windows .exe into dist-exe/"
	@echo ""
	@echo "  Docker"
	@echo "    make docker-build  Build the Docker image"
	@echo "    make docker-up     Start the container (detached, port 8000)"
	@echo "    make docker-down   Stop and remove the container"
	@echo ""
	@echo "  Upstream"
	@echo "    make git-sync      Fetch ws-scrcpy upstream and merge into current branch"
	@echo ""

# ── Setup ─────────────────────────────────────────────────────────────────────

install:
	npm ci

setup: install
	node scripts/fetch-adb.mjs

# ── Build ─────────────────────────────────────────────────────────────────────

build-dev:
	npx webpack --config webpack/ws-scrcpy.dev.ts --stats-error-details

build:
	npx webpack --config webpack/ws-scrcpy.prod.ts --stats-error-details

clean:
	npx rimraf dist

# ── Run ───────────────────────────────────────────────────────────────────────

start: build
	cd dist && npm start

app: build
	node scripts/launch.mjs

# ── Code quality ──────────────────────────────────────────────────────────────

lint:
	npx eslint src/ --ext .ts

format:
	npx eslint src/ --fix --ext .ts

# ── Packaging ─────────────────────────────────────────────────────────────────

build-exe: build
	node scripts/build-exe.mjs

# ── Docker ────────────────────────────────────────────────────────────────────

docker-build:
	docker build -t scrcpy-deck .

docker-up:
	docker compose up -d

docker-down:
	docker compose down

# ── Upstream sync ─────────────────────────────────────────────────────────────

git-sync:
	git fetch upstream
	git merge upstream/master
