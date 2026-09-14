/** Who is calling: resolved from a verified access token by the guard. */
export interface AuthPrincipal {
  userId: string;
  sessionId: string;
}
