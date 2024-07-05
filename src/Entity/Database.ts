import { PrismaClient } from '@prisma/client';

const prisma: PrismaClient = new PrismaClient();
export function getDbContext() {
  return prisma;
}
