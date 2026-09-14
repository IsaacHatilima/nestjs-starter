/** Plain recovery codes, returned exactly once; only their hashes are stored. */
export interface TwoFactorRecoveryCodes {
  recoveryCodes: readonly string[];
}
