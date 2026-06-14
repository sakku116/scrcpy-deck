# syntax=docker/dockerfile:1

# ---- Build stage: compile the webpack bundles ----
FROM node:20-bullseye AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run dist

# ---- Runtime stage: slim image with adb on PATH ----
FROM node:20-bullseye-slim AS runtime
# android-tools-adb provides the `adb` binary used by the wireless module.
RUN apt-get update \
    && apt-get install -y --no-install-recommends android-tools-adb \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# The build emits dist/ with its own package.json listing only runtime deps.
COPY --from=build /app/dist ./
RUN npm install --omit=dev && npm cache clean --force
EXPOSE 8000
CMD ["node", "index.js"]
