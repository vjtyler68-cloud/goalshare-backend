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
exports.verifyAppleReceipt = exports.verifyGooglePlayToken = void 0;
const googleapis_1 = require("googleapis");
const serviceAccount_json_1 = __importDefault(require("../../../config/serviceAccount.json"));
// ── Constants ──────────────────────────────────────────────────────────────────
const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME;
// ── Verify Google Play Token ───────────────────────────────────────────────────
const verifyGooglePlayToken = (productId, purchaseToken) => __awaiter(void 0, void 0, void 0, function* () {
    // ✅ expiryTime: Date
    const auth = new googleapis_1.google.auth.GoogleAuth({
        // credentials: JSON.parse(
        //   process.env.GOOGLE_SERVICE_ACCOUNT_JSON!.replace(/\\n/g, '\n'),
        // ),
        credentials: serviceAccount_json_1.default,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    const androidPublisher = googleapis_1.google.androidpublisher({ version: 'v3', auth });
    const response = yield androidPublisher.purchases.subscriptions.get({
        packageName: ANDROID_PACKAGE_NAME, // ✅ from constant
        subscriptionId: productId,
        token: purchaseToken,
    });
    //   console.log({response})
    const purchase = response.data;
    const isValid = purchase.paymentState === 1 &&
        parseInt(purchase.expiryTimeMillis) > Date.now();
    return {
        isValid,
        expiryTime: new Date(parseInt(purchase.expiryTimeMillis)), // ✅ expiryTime
    };
});
exports.verifyGooglePlayToken = verifyGooglePlayToken;
// ── Verify Apple Receipt ───────────────────────────────────────────────────────
const verifyAppleReceipt = (receipt) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // ✅ expiryTime: Date
    const verifyWithUrl = (url) => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                'receipt-data': receipt,
                password: process.env.APP_STORE_SHARED_SECRET,
                'exclude-old-transactions': true,
            }),
        });
        return res.json();
    });
    let data = yield verifyWithUrl('https://buy.itunes.apple.com/verifyReceipt');
    if (data.status === 21007) {
        data = yield verifyWithUrl('https://sandbox.itunes.apple.com/verifyReceipt');
    }
    if (data.status !== 0 || !((_a = data.latest_receipt_info) === null || _a === void 0 ? void 0 : _a.length)) {
        return { isValid: false, expiryTime: new Date(0) }; // ✅ expiryTime
    }
    const latest = data.latest_receipt_info[0];
    const isValid = parseInt(latest.expires_date_ms) > Date.now();
    return {
        isValid,
        expiryTime: new Date(parseInt(latest.expires_date_ms)), // ✅ expiryTime
    };
});
exports.verifyAppleReceipt = verifyAppleReceipt;
