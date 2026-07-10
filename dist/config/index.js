"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '.env') });
exports.default = {
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    super_admin_password: process.env.SUPER_ADMIN_PASSWORD,
    bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
    mail: process.env.MAIL,
    mail_password: process.env.MAIL_PASS,
    mail_host: process.env.MAIL_HOST,
    mail_port: process.env.MAIL_PORT,
    mail_from: process.env.MAIL_FROM,
    base_url_server: process.env.BASE_URL_SERVER,
    base_url_client: process.env.BASE_URL_CLIENT,
    jwt: {
        access_secret: process.env.JWT_ACCESS_SECRET,
        access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
        refresh_secret: process.env.JWT_REFRESH_SECRET,
        refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
    },
    do_space: {
        endpoints: process.env.DO_SPACE_ENDPOINT,
        access_key: process.env.DO_SPACE_ACCESS_KEY,
        secret_key: process.env.DO_SPACE_SECRET_KEY,
        bucket: process.env.DO_SPACE_BUCKET
    },
    stripe: {
        published_key: process.env.STRIPE_PUBLISHED_KEY,
        stripe_secret_key: process.env.STRIPE_SECRET_KEY,
        stripe_webhook: process.env.STRIPE_WEBHOOK
    }
};
