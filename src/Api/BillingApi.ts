import { getDbContext } from '../Entity/Database';
import { Decimal } from '@prisma/client/runtime/binary';
import { randomUUID } from 'node:crypto';

export class BillingApi {
  public async GetBalance(user_email: string): Promise<Decimal> {
    const db = getDbContext();
    await db.user.findUniqueOrThrow({ where: { email: user_email } });

    const payments = await db.payment.findMany({
      where: {
        user_email: user_email,
      },
    });
    const paid = payments.reduce(
      (total, payment) => total.add(payment.amount),
      new Decimal(0)
    );

    const usages = await db.usage.findMany({
      where: { user_email: user_email },
    });
    const used = usages.reduce(
      (total, usage) => total.add(usage.amount),
      new Decimal(0)
    );

    return paid.sub(used);
  }

  public async BillForMonth(
    user_email: string,
    amount: Decimal
  ): Promise<void> {
    const db = getDbContext();

    // throws if user not found
    await this.GetBalance(user_email);

    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    var usage = await db.usage.findMany({ where: { user_email } });
    var usageForMonth = usage.find((x) => x.month == month && x.year == year);
    if (usageForMonth == null) {
      usageForMonth = {
        id: randomUUID(),
        user_email,
        year,
        month,
        amount: new Decimal(0),
      };
    }
    usageForMonth.amount = usageForMonth.amount.add(amount);
    await db.usage.upsert({
      where: { id: usageForMonth.id },
      create: usageForMonth,
      update: usageForMonth,
    });
  }
}
