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
exports.PaymentService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const prisma_1 = require("../../utils/prisma");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const getAllPayments = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const paymentQuery = new QueryBuilder_1.default(prisma_1.prisma.payment, query);
    const result = yield paymentQuery
        .search([
        'user.fullName',
        'user.email',
        'product.title',
        'stripePaymentId',
        'stripeSessionId',
    ])
        .filter()
        .sort()
        .customFields({
        id: true,
        amount: true,
        userId: true,
        paymentMethodType: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        stripeCustomerId: true,
        stripePaymentId: true,
        stripeSessionId: true,
        user: {
            select: {
                profile: true,
                fullName: true,
                email: true,
            },
        },
    })
        .exclude()
        .paginate()
        .execute();
    return result;
});
const singleTransactionHistory = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.prisma.payment.findUnique({
        where: query,
        select: {
            id: true,
            amount: true,
            userId: true,
            paymentMethodType: true,
            createdAt: true,
            stripeCustomerId: true,
            stripePaymentId: true,
            stripeSessionId: true,
            currency: true,
            status: true,
            user: {
                select: {
                    profile: true,
                    fullName: true,
                    email: true,
                },
            },
        },
    });
    if (!result) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Transaction history not found');
    }
    return result;
});
const singleTransactionHistoryBySessionId = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.prisma.payment.findUnique({
        where: query,
        select: {
            id: true,
            amount: true,
            userId: true,
            paymentMethodType: true,
            createdAt: true,
            stripeCustomerId: true,
            stripePaymentId: true,
            stripeSessionId: true,
            currency: true,
            status: true,
            user: {
                select: {
                    profile: true,
                    fullName: true,
                    email: true,
                },
            },
        },
    });
    if (!result) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Transaction history not found');
    }
    return result;
});
const cancelPayment = (id, userId, role) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.payment.update({
        where: Object.assign({ id }, (role !== 'ADMIN' && { userId })),
        data: {
            status: 'CANCELED',
        },
    });
});
exports.PaymentService = {
    getAllPayments,
    singleTransactionHistory,
    cancelPayment,
    singleTransactionHistoryBySessionId,
};
