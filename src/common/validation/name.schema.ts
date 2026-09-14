import { z } from 'zod';

export const MAX_NAME_LENGTH = 100;

/**
 * A single part of a person's name. Trimmed first, so a value of only whitespace fails the minimum rather than being
 * stored blank. No character rules: names legitimately carry accents, apostrophes, hyphens and scripts beyond Latin.
 */
export const NameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(MAX_NAME_LENGTH, `Name must be at most ${MAX_NAME_LENGTH} characters`);
