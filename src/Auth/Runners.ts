import { getDbContext } from '../Entity/Database';

const dayTicks = 24 * 60 * 60 * 1000; // 24 hours
export function AuthRunners() {
  setInterval(async () => {
    var prisma = getDbContext();
    await prisma.user.deleteMany({
      where: {
        verified: false,
        createdAt: {
          lt: new Date(Date.now() - 1 * dayTicks),
        },
      },
    });
  }, dayTicks);
}
