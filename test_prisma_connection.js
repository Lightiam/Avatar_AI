const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    // Attempt to connect to the database
    await prisma.$connect();
    console.log('Successfully connected to SQLite using Prisma!');
    
    // Perform a simple query to verify the connection
    const userCount = await prisma.user.count();
    console.log(`Number of users in the database: ${userCount}`);
  } catch (error) {
    console.error('Failed to connect to SQLite:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();