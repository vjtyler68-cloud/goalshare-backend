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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const http_status_1 = __importDefault(require("http-status"));
const globalErrorHandler_1 = __importDefault(require("./app/middlewares/globalErrorHandler"));
const routes_1 = __importDefault(require("./app/routes"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const StripeUtils_1 = require("./app/utils/StripeUtils");
const auth_1 = __importDefault(require("./app/middlewares/auth"));
const fileUploader_1 = require("./app/utils/fileUploader");
const catchAsync_1 = __importDefault(require("./app/utils/catchAsync"));
const AppError_1 = __importDefault(require("./app/errors/AppError"));
const uploadToDigitalOceanAWS_1 = require("./app/utils/uploadToDigitalOceanAWS");
const app = (0, express_1.default)();
app.post('/api/v1/stripe/webhook', express_1.default.raw({ type: 'application/json' }), StripeUtils_1.StripeWebHook);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('https://')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Requested-With',
        'Origin',
        'Cache-Control',
        'X-CSRF-Token',
        'User-Agent',
        'Content-Length',
    ],
    credentials: true,
}));
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    keyGenerator: (req) => {
        const forwardedFor = req.headers['x-forwarded-for'];
        const ipArray = forwardedFor ? forwardedFor.split(/\s*,\s*/) : [];
        const ipAddress = ipArray.length > 0 ? ipArray[0] : req.connection.remoteAddress;
        return ipAddress;
    },
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
//parser
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '500mb' }));
app.use(express_1.default.urlencoded({ limit: '500mb', extended: true }));
app.get('/', (req, res) => {
    res.send({
        Message: 'The server is running. . .',
    });
});
// Public legal pages (App Store requires a reachable privacy-policy URL).
// Served from dist/public so the URL is stable regardless of process cwd.
const path_1 = require('path');
app.get(['/privacy', '/privacy.html'], (req, res) => {
    res.sendFile(path_1.join(__dirname, 'public', 'privacy.html'));
});
app.get(['/terms', '/terms.html'], (req, res) => {
    res.sendFile(path_1.join(__dirname, 'public', 'terms.html'));
});
app.use('/api/v1', apiLimiter, routes_1.default);
app.use(globalErrorHandler_1.default);
routes_1.default.post('/upload-image', (0, auth_1.default)(), fileUploader_1.upload.single('image'), (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'No image file');
    }
    const file = req.file;
    const location = yield (0, uploadToDigitalOceanAWS_1.uploadToDigitalOcean)(file);
    const imageUrl = location.Location;
    res.status(http_status_1.default.OK).json({
        success: true,
        imageUrl,
    });
})));
app.use((req, res, next) => {
    res.status(http_status_1.default.NOT_FOUND).json({
        success: false,
        message: 'API NOT FOUND!',
        error: {
            path: req.originalUrl,
            message: 'Your requested path is not found!',
        },
    });
});
exports.default = app;
