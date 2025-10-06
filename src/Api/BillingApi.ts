import { getDbContext } from '../Entity/Database';
import { Decimal } from '@prisma/client/runtime/binary';
import { randomUUID } from 'node:crypto';

export const donationTag = 'donation';

export class BillingApi {
  public async GetTotalBalance(user_email?: string): Promise<Decimal> {
    let balance1 = new Decimal(0);
    if (user_email) {
      balance1 = await this.GetBalance(user_email);
    }
    const balance2 = await this.GetGlobalBalance();
    return balance1.add(balance2);
  }

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

  public async GetGlobalBalance(): Promise<Decimal> {
    const db = getDbContext();

    const payments = await db.payment.findMany({
      where: {
        message: donationTag,
      },
    });
    const paid = payments.reduce(
      (total, payment) => total.add(payment.amount),
      new Decimal(0)
    );

    const usages = await db.usage.findMany({
      where: { user_email: donationTag },
    });
    const used = usages.reduce(
      (total, usage) => total.add(usage.amount),
      new Decimal(0)
    );

    return paid.sub(used);
  }

  public async BillForMonth(
    amount: Decimal,
    user_email?: string
  ): Promise<void> {
    const db = getDbContext();

    let globalBalance = await this.GetGlobalBalance();
    let userBalance = new Decimal(0);
    // throws if user not found
    if (user_email) {
      userBalance = await this.GetBalance(user_email);
    }

    if (amount.greaterThan(userBalance.add(globalBalance))) {
      throw new Error('Insufficient balance');
    }

    if (amount.greaterThan(userBalance)) {
      user_email = donationTag;
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    var usage = await db.usage.findMany({ where: { user_email } });
    var usageForMonth = usage.find((x) => x.month == month && x.year == year);
    if (usageForMonth == null) {
      usageForMonth = {
        id: randomUUID(),
        user_email: user_email ?? donationTag,
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
