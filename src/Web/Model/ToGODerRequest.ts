import { Request } from 'express';
import { User } from '@prisma/client';

export interface ToGODerAuth {
  user: User | null;
}
export interface ToGODerRequest extends Request {
  togoder_auth: ToGODerAuth | null;
}
