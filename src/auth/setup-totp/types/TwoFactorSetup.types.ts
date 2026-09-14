/** What the dashboard needs to show an enrolment QR code. The secret is shown once. */
export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}
