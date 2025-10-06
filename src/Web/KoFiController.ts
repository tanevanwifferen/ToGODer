import { Express } from 'express';
import { kofi } from '@ko-fi/express';
import { DonationData } from '@ko-fi/types';
import { getDbContext } from '../Entity/Database';
import { Decimal } from '@prisma/client/runtime/binary';
import { donationTag } from '../Api/BillingApi';

export function setupKoFi(app: Express) {
  kofi(app, {
    async onDonation(donation: DonationData) {
      const db = getDbContext();
      await db.payment.create({
        data: {
          amount: new Decimal(donation.amount),
          user_email:
            donation.message == donationTag ? donationTag : donation.email,
          timestamp: new Date(),
          message: donation.message ?? null,
        },
      });
    },
    verificationToken: process.env.KOFI_WEBHOOK_TOKEN!,
  });
}
