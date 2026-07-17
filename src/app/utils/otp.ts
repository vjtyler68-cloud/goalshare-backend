/// TEST MODE: while the email provider isn't live yet, setting the env var
/// AUTO_VERIFY_SIGNUPS=true makes every verification code the static 123456
/// (and skips nothing else) so TestFlight testers can sign up without
/// receiving email. REMOVE THE ENV VAR BEFORE PUBLIC LAUNCH.
export function isTestOtpMode(): boolean {
    return process.env.AUTO_VERIFY_SIGNUPS === 'true';
}

/// FREE ACCESS: FREE_ACCESS_SIGNUPS=true keeps granting every new signup a
/// free subscription (no paywall) even after real email verification is
/// switched on — for the pre-IAP TestFlight period. Test mode implies it.
/// REMOVE BOTH ENV VARS AT PUBLIC LAUNCH.
export function isFreeAccessMode(): boolean {
    return process.env.FREE_ACCESS_SIGNUPS === 'true' || isTestOtpMode();
}

export function generateOTP(): string {
    if (isTestOtpMode()) return '123456';
    const otp = Math.floor(Math.random() * 1000000);
    return otp.toString().padStart(6, '0');
}
export function otpExpiryTime() {
    const currentTime = Date.now();
    const expiryTime = currentTime + 5 * 60 * 1000;
    return new Date(expiryTime);
}

export function getOtpStatusMessage(otpExpiryTime: Date): string {
  const now = new Date().getTime();
  const expiry = new Date(otpExpiryTime).getTime();
  const remainingMs = expiry - now;

  if (remainingMs > 0) {
    const remainingSec = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(remainingSec / 60);
    const seconds = remainingSec % 60;

    if (minutes > 0) {
      return `An OTP has already been sent. Please try again after ${minutes} minute(s) and ${seconds} second(s).`;
    } else {
      return `An OTP has already been sent. Please try again after ${seconds} second(s).`;
    }
  }

  return "No active OTP found. You can request a new one.";
}