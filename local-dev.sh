#!/bin/bash

# Local development script for StafferFi
# Builds Docker image and runs container with docker compose

set -e

echo "🏗️  Building Docker image..."
docker build -t stafferfi .

echo "🚀 Starting container with docker compose..."
docker compose up

echo "✅ Done!"
