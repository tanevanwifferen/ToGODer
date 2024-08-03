import { getDbContext } from '../Entity/Database';

const dayTicks = 24 * 30 * 60 * 1000; // 24 hours
function AuthRunners() {
  setInterval(async () => {
    var prisma = getDbContext();
    await prisma.user.deleteMany({
      where: {
        verified: false,
        createdAt: {
          lt: new Date(Date.now() - dayTicks / 48),
        },
      },
    });
  }, dayTicks);
}

export function setupRunners() {
  AuthRunners();
}
