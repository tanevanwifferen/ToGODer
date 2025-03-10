-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SharedChat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messages" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    CONSTRAINT "SharedChat_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SharedChat" ("createdAt", "description", "id", "messages", "ownerId", "title", "views") SELECT "createdAt", "description", "id", "messages", "ownerId", "title", "views" FROM "SharedChat";
DROP TABLE "SharedChat";
ALTER TABLE "new_SharedChat" RENAME TO "SharedChat";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
