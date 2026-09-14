/** A login session as shown to its owner. */
export interface Session {
  id: string;
  ip: string | null;
  userAgent: string | null;
  /** True for the session making the request. */
  current: boolean;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

/** Repository-level session row with real dates. */
export interface SessionRecord {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}
