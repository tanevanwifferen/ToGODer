import { PrismaClient } from "@prisma/client";

/**
 * A user is a private key. It is used to login, to store encrypted messages
 * and to limit the amount of messages someone can send.
 *
 * We store the public key on our server so we can validate a signature on login
 * and the user keeps his private key private.
 *
 * Login works by sending a timestamp which is no older than 1 minute and a
 * signature of this timestamp. We validate it using the public key, which
 * is also sent in the request so we can lookup the user account that belongs
 * to that key. We then set a cookie so the user can then send authenticated
 * requests using a bearer token.
 */
export class UserApi {
  // create user
  // get user
}
