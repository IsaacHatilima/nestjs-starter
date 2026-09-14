import { ErrorCode } from './errors/error-codes';

/** One field-level complaint from schema validation, addressed by dotted path. */
export interface FieldIssue {
  path: string;
  message: string;
}

export interface ErrorBody {
  /** Machine-readable discriminator. Statuses collide (five codes share 401), this does not. */
  code: ErrorCode;
  /** Human-readable, safe to log; never the client's control flow key. */
  message: string;
  /** Only ever set for VALIDATION_ERROR, where every failing field is listed. */
  details?: FieldIssue[];
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T | null;
  error: null;
}

export interface ErrorEnvelope {
  success: false;
  data: null;
  error: ErrorBody;
}

/**
 * Every response carries all three keys, so a client never has to probe for a
 * missing one. `success` discriminates the union, so `if (body.success)` still
 * narrows to the success arm in TypeScript.
 */
export type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;
