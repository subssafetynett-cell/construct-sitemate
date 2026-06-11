const { PrismaClient } = require('@prisma/client');

let databaseUrl = process.env.DATABASE_URL;

if (databaseUrl && databaseUrl.includes('.neon.tech')) {
  if (!databaseUrl.includes('connect_timeout')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}connect_timeout=30`;
  }
  if (!databaseUrl.includes('sslmode')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}sslmode=require`;
  }
}

const prisma = databaseUrl
  ? new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    })
  : new PrismaClient();

module.exports = prisma;
