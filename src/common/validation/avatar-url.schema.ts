import { z } from 'zod';

export const MAX_AVATAR_URL_LENGTH = 2048;

/**
 * An absolute URL for an avatar image. The protocol allowlist is the point of this schema: clients render the value
 * straight into an `<img src>` or a CSS `url()`, so a stored `javascript:` or `data:` URL would be a stored cross-site
 * scripting payload. A bare `z.url()` accepts both.
 *
 * The check belongs to `z.url` rather than a `.refine` on top of it: a refine still runs after the URL check fails, so
 * parsing the value itself there would throw `TypeError` out of validation and surface as a 500 instead of a 400.
 */
export const AvatarUrlSchema = z
  .string()
  .trim()
  .pipe(z.url({ protocol: /^https?$/ }).max(MAX_AVATAR_URL_LENGTH));
