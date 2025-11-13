import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

// Optimized Prisma client for serverless environments
const prismaOptions: Prisma.PrismaClientOptions = {
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'minimal' as const,
};

// check if PrismaClient is not on `globalThis` object
if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient(prismaOptions);
} else {
    if (!globalThis.prisma) {
        globalThis.prisma = new PrismaClient(prismaOptions);
    }
    prisma = globalThis.prisma;
}

// Handle connection cleanup on process termination
if (process.env.NODE_ENV === 'production') {
    process.on('beforeExit', async () => {
        await prisma.$disconnect();
    });
}

export default prisma;