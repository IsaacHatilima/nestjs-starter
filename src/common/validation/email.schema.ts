import { z } from 'zod';

const MAX_EMAIL_LENGTH = 254;

/** Trims and lower-cases before validating, so lookups are case-insensitive. */
export const EmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(MAX_EMAIL_LENGTH));
