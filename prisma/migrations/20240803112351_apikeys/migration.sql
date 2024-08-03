-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    CONSTRAINT "ApiKey_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
