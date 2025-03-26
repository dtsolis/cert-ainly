# Cert-ainly

A certificate storage and management tool with a Web API.

## Overview

Cert-ainly is a web-based tool for managing certificates. It provides a simple interface to upload, view, and monitor certificate expiration dates, helping you avoid unexpected certificate expirations. Built having in mind the different certificates that an iOS developer might need to keep updating (Apple Push Notifications, VoIP Services, Pass for Wallet etc) but it's not strictly for these certificates only.

## Features

- **Web Interface**: Clean, responsive web UI for certificate management
- **Certificate Upload**: Support for various certificate formats including PEM, DER, P12/PFX
- **Web API**: Using the provided API (documentation under `/api`) and monitoring tools like [Uptime Kuma](https://github.com/louislam/uptime-kuma), you can track certificate expiration dates and receive alerts for upcoming expirations

## Installation

### Local Installation

1. Clone the repository:

   ```
   git clone https://github.com/dtsolis/cert-ainly.git
   cd cert-ainly
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the application:

   ```
   npm run start:dev
   ```

4. Access the web interface at `http://localhost:3000`

### Docker Installation

1. Build the Docker image:

   ```bash
   docker build -t cert-ainly .
   ```

2. Run the container:

   ```bash
   docker run -d \
     -p 3000:3000 \
     -v cert-ainly-data:/usr/src/app/data \
     cert-ainly
   ```

3. Access the web interface at `http://localhost:3000`

#### Docker Environment Variables

You can customize the container configuration using environment variables:

```bash
docker run -d \
  -p 3000:3000 \
  -e PORT=3000 \
  -e DATABASE_PATH=/usr/src/app/data/db.sqlite \
  -e NODE_ENV=production \
  -v cert-ainly-data:/usr/src/app/data \
  cert-ainly
```

#### Docker Compose

For easier deployment, you can use Docker Compose:

```yaml
version: '3.8'
services:
  cert-ainly:
    build: .
    ports:
      - '3000:3000'
    volumes:
      - cert-ainly-data:/usr/src/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_PATH=/usr/src/app/data/db.sqlite

volumes:
  cert-ainly-data:
```

Start with:

```bash
docker-compose up -d
```

## First-time Setup

On first run, you'll be prompted to create an admin account. This account will have full access to manage certificates and users.

## Development

To run in development mode with auto-reload:

```
npm run start:dev
```

## Technology Stack

- NestJS: Modern, progressive Node.js framework
- TypeORM: Object-Relational Mapping for database access
- SQLite: File-based database for simplified deployment
- Handlebars: View templating engine
- Bootstrap: Responsive UI framework

## Database Migrations

The application uses TypeORM migrations to manage database schema changes. Here are the available migration commands:

```bash
# Generate a migration from entity changes
npm run migration:generate src/migrations/MyChanges

# Create an empty migration for custom changes
npm run migration:create src/migrations/CustomChanges

# Run pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert
```

### Development vs Production

- In development, the database schema will automatically sync with your entities (`synchronize: true`)
- In production, always use migrations to make database changes
- Migrations run automatically when the application starts in production

### Docker

When running in Docker:

1. Migrations run automatically on container startup
2. Database file is persisted in the Docker volume
3. Check container logs for migration status

## License

MIT
