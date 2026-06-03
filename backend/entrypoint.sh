#!/bin/sh
set -e

APP_ENV=${APP_ENV:-local}
echo "APP_ENV: $APP_ENV"

echo "Running Prisma generate..."
npx prisma generate

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Running seed..."
npx ts-node prisma/seed.ts

if [ "$APP_ENV" = "local" ]; then
  echo "Starting in dev mode (nodemon)..."
  exec npm run develop
else
  echo "Building for production..."
  npm run build
  echo "Starting in production mode..."
  exec npm run start
fi
