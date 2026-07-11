"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOTP = generateOTP;
exports.otpExpiryTime = otpExpiryTime;
exports.getOtpStatusMessage = getOtpStatusMessage;
exports.isTestOtpMode = isTestOtpMode;
// TEST MODE: while the email provider isn't live yet, setting the env var
// AUTO_VERIFY_SIGNUPS=true makes every verification code the static 123456
// so TestFlight testers can sign up without receiving email.
// REMOVE THE ENV VAR BEFORE PUBLIC LAUNCH.
function isTestOtpMode() {
    return process.env.AUTO_VERIFY_SIGNUPS === 'true';
}
function generateOTP() {
    if (isTestOtpMode())
        return '123456';
    const otp = Math.floor(Math.random() * 1000000);
    return otp.toString().padStart(6, '0');
}
function otpExpiryTime() {
    const currentTime = Date.now();
    const expiryTime = currentTime + 5 * 60 * 1000;
    return new Date(expiryTime);
}
function getOtpStatusMessage(otpExpiryTime) {
    const now = new Date().getTime();
    const expiry = new Date(otpExpiryTime).getTime();
    const remainingMs = expiry - now;
    if (remainingMs > 0) {
        const remainingSec = Math.floor(remainingMs / 1000);
        const minutes = Math.floor(remainingSec / 60);
        const seconds = remainingSec % 60;
        if (minutes > 0) {
            return `An OTP has already been sent. Please try again after ${minutes} minute(s) and ${seconds} second(s).`;
        }
        else {
            return `An OTP has already been sent. Please try again after ${seconds} second(s).`;
        }
    }
    return "No active OTP found. You can request a new one.";
}
