"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtpEmail = void 0;
const sendMail_1 = require("./sendMail");
const generateOtpEmail = (otp) => {
    return `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 30px; background: linear-gradient(135deg, #6c63ff, #3f51b5); border-radius: 8px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px;">
            <h2 style="color: #ffffff; font-size: 28px; text-align: center; margin-bottom: 20px;">
                <span style="color: #ffeb3b;">OTP Verification</span>
            </h2>
            <p style="font-size: 16px; color: #333; line-height: 1.5; text-align: center;">
                Your OTP code is below.
            </p>
            <p style="font-size: 32px; font-weight: bold; color: #ff4081; text-align: center; margin: 20px 0;">
                ${otp}
            </p>
            <div style="text-align: center; margin-bottom: 20px;">
                <p style="font-size: 14px; color: #555; margin-bottom: 10px;">
                    This OTP will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.
                </p>
                <p style="font-size: 14px; color: #555; margin-bottom: 10px;">
                    If you need assistance, feel free to contact us.
                </p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <p style="font-size: 12px; color: #999; text-align: center;">
                    Best Regards,<br/>
                    <span style="font-weight: bold; color: #3f51b5;">Developer Team</span><br/>
                </p>
            </div>
        </div>
      </div>`;
};
exports.generateOtpEmail = generateOtpEmail;
// Delegates to the single hardened mailer in sendMail.js. The old inline
// transport hardcoded dead Brevo creds on SMTP port 2525 (Railway blocks it)
// with NO timeout, so an unverified-user login hung forever on the OTP email.
// sendEmail() uses HTTP email APIs with SMTP fallback, has timeouts, and never
// throws — login/registration can never hang on email again.
const emailSender = (to, html, subject) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, sendMail_1.sendEmail)(to, html, subject);
    return 'queued';
});
exports.default = emailSender;
