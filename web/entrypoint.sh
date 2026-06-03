#!/bin/sh
set -e

APP_ENV=${APP_ENV:-local}
echo "APP_ENV: $APP_ENV"

if [ "$APP_ENV" = "local" ]; then
  echo "Starting Next.js in dev mode..."
  exec npm run dev
else
  echo "Building Next.js for production..."
  npm run build
  echo "Starting Next.js in production mode..."
  exec npm run start
fi