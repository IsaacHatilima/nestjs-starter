import { z } from 'zod';

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export type Logout = z.infer<typeof LogoutSchema>;
