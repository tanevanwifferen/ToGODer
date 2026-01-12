import { User, UserDataSync } from '@prisma/client';
import { getDbContext } from '../Entity/Database';

/**
 * Service for managing encrypted user data sync.
 * Handles fetching, storing, and re-encrypting user sync data with optimistic locking.
 */
export class SyncService {
  /**
   * Fetch encrypted sync data for a user.
   * @param user The user to fetch data for
   * @returns The sync data or null if none exists
   */
  async getSyncData(user: User): Promise<UserDataSync | null> {
    return await getDbContext().userDataSync.findUnique({
      where: { userId: user.id },
    });
  }

  /**
   * Store encrypted sync data with optimistic locking.
   * @param user The user to store data for
   * @param blob The encrypted data blob (Base64)
   * @param version Optional expected version for optimistic locking
   * @returns The updated sync data
   * @throws Error with 'VERSION_CONFLICT' if version doesn't match
   */
  async pushSyncData(
    user: User,
    blob: string,
    version?: number
  ): Promise<UserDataSync> {
    const existing = await getDbContext().userDataSync.findUnique({
      where: { userId: user.id },
    });

    if (existing) {
      // Check version for optimistic locking
      if (version !== undefined && existing.version !== version) {
        const error = new Error('VERSION_CONFLICT');
        (error as any).serverData = existing;
        throw error;
      }

      return await getDbContext().userDataSync.update({
        where: { userId: user.id },
        data: {
          encryptedData: blob,
          version: existing.version + 1,
        },
      });
    } else {
      // Create new sync data
      return await getDbContext().userDataSync.create({
        data: {
          userId: user.id,
          encryptedData: blob,
          version: 1,
        },
      });
    }
  }

  /**
   * Atomic re-encryption for password change.
   * @param user The user to re-encrypt data for
   * @param newBlob The new encrypted data blob
   * @param oldVersion The expected current version
   * @returns The updated sync data
   * @throws Error with 'VERSION_CONFLICT' if version doesn't match
   * @throws Error with 'NO_DATA' if no existing sync data
   */
  async reencrypt(
    user: User,
    newBlob: string,
    oldVersion: number
  ): Promise<UserDataSync> {
    const existing = await getDbContext().userDataSync.findUnique({
      where: { userId: user.id },
    });

    if (!existing) {
      throw new Error('NO_DATA');
    }

    if (existing.version !== oldVersion) {
      const error = new Error('VERSION_CONFLICT');
      (error as any).serverData = existing;
      throw error;
    }

    return await getDbContext().userDataSync.update({
      where: { userId: user.id },
      data: {
        encryptedData: newBlob,
        version: existing.version + 1,
      },
    });
  }
}
