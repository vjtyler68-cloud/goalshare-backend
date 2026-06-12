"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verification = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../../config"));
const generateHashedToken = (token) => {
    const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
    return hashedToken;
};
const generateEmailVerificationLink = () => {
    const token = crypto_1.default.randomBytes(32).toString('hex');
    const emailVerificationLink = `${config_1.default.base_url_server}/api/v1/users/verify-email/${token}`;
    const hashedToken = generateHashedToken(token);
    return [emailVerificationLink, hashedToken];
};
const generateEmailVerificationToken = () => {
    const token = crypto_1.default.randomBytes(32).toString('hex');
    const hashedToken = generateHashedToken(token);
    return hashedToken;
};
exports.verification = {
    generateEmailVerificationLink,
    generateHashedToken,
    generateEmailVerificationToken
};
