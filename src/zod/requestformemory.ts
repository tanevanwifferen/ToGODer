import { z } from 'zod';

export const keysSchema = z.object({
  keys: z.array(z.string()),
});
